import { json } from "@remix-run/node";
import type { ActionFunction, LoaderFunction } from "@remix-run/node";
import { generateEmbeddings } from "./services/embedding/embeddingService";
import { queryEmbeddings } from "./services/pinecone/pineconeService";
import { processProducts } from "./processors/productProcessor";
import { validateAndProcessJson } from "./processors/jsonProcessor";
import { createDeepseekPrompt, generateLLMResponse } from "./services/llm/deepseekService";
import { DeepseekRequestBody } from "./types";
import crypto from "crypto";

// Function to verify the Shopify proxy signature
function verifyAppProxySignature(query: URLSearchParams, apiSecret: string): boolean {
  const { signature, ...params } = Object.fromEntries(query.entries());
  
  if (!signature) return false;
  
  // Sort parameters alphabetically
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {} as Record<string, string>);
  
  // Create the signature message
  const signatureMessage = Object.keys(sortedParams)
    .map(key => `${key}=${sortedParams[key]}`)
    .join('');
  
  // Calculate the HMAC
  const hmac = crypto
    .createHmac('sha256', apiSecret)
    .update(signatureMessage)
    .digest('hex');
  
  return hmac === signature;
}

export const loader: LoaderFunction = async ({ request }) => {
  // For GET requests through the App Proxy
  const url = new URL(request.url);
  const query = url.searchParams;
  
  // You would replace this with your actual app's API secret
  const API_SECRET = process.env.SHOPIFY_API_SECRET || '';
  
  // Verify the signature if it's an App Proxy request
  if (query.has('signature')) {
    if (!verifyAppProxySignature(query, API_SECRET)) {
      return json({ error: "Invalid signature" }, { status: 401 });
    }
  }
  
  // Handle actual GET requests here
  return json({ message: "API is running" });
};

export const action: ActionFunction = async ({ request }) => {
  // For POST requests through the App Proxy
  const url = new URL(request.url);
  const query = url.searchParams;

  // You would replace this with your actual app's API secret
  const API_SECRET = process.env.SHOPIFY_API_SECRET || '';
  
  // Verify the signature if it's an App Proxy request
  if (query.has('signature')) {
    if (!verifyAppProxySignature(query, API_SECRET)) {
      return json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  try {
    const body = await request.json() as DeepseekRequestBody;
    const { messages, isTrainingPage, shopifyStore, shopifyAccessToken } = body;

    // Process products if it's a training page request with shop credentials
    if (isTrainingPage && shopifyStore && shopifyAccessToken) {
      await processProducts(shopifyStore, shopifyAccessToken);
      return json({ answer: "Products fetched and embeddings stored successfully!" });
    }

    // Validate incoming messages
    if (!messages || !Array.isArray(messages)) {
      return json({ error: "Invalid or missing messages" }, { status: 400 });
    }

    const userMessage = messages[messages.length - 1]?.content;
    if (!userMessage) {
      return json({ error: "User message is missing" }, { status: 400 });
    }

    // Process JSON data if it's from the training page
    if (isTrainingPage) {
      try {
        const jsonData = JSON.parse(userMessage);
        const response = await validateAndProcessJson(jsonData);
        return json({ answer: response });
      } catch (jsonError) {
        return json({ answer: "Please provide a valid JSON input to train the LLM." });
      }
    }

    // Check for different types of product queries
    const isShowAllProductsQuery = /show\s+(?:me\s+)?(?:all\s+)?products/i.test(userMessage);
    const isPriceRangeQuery = /price\s+range|below|under|above|over|between/i.test(userMessage);
    const isSpecificProductQuery = userMessage.toLowerCase().includes("product") && 
                                  !isShowAllProductsQuery && 
                                  !isPriceRangeQuery;

     // Combined flag for any product-related query
    const productQuery = isShowAllProductsQuery || isPriceRangeQuery || isSpecificProductQuery || 
    userMessage.toLowerCase().includes("show me");

    // Step 1: Convert query to embeddings
    const embeddings = await generateEmbeddings(userMessage);

    if (isShowAllProductsQuery) {
    // Step 2: Query Pinecone for similar vectors
    const results = await queryEmbeddings(embeddings, 20);

    const products = results.map(r => ({
      id: r.id || "",
      title: r.metadata?.title || "",
      description: r.metadata?.description || "",
      url: r.metadata?.url || "",
      price: r.metadata?.price || "",
      image: r.metadata?.image || ""
    })).filter(p => p.title && p.url);

    // If still no products found, use a fallback method to query Pinecone
    if (products.length === 0) {
      console.log("No products found with semantic search, using fallback method");
      // You can implement a fallback method here if needed
      // For now, we'll continue with the flow
    }

    return json({ 
      answer: "Here are some products you might like:", 
      products: products
    });
  }

  // For all other queries, use the existing approach with some enhancements
    // Step 2: Query Pinecone for similar vectors
    const results = await queryEmbeddings(embeddings, isPriceRangeQuery ? 20 : 5);

    // Step 3: Format products from Pinecone results
    const products = results.map(r => ({
      id: r.id || "",
      title: r.metadata?.title || "",
      description: r.metadata?.description || "",
      url: r.metadata?.url || "",
      price: r.metadata?.price || "",
      image: r.metadata?.image || ""
    })).filter(p => p.title && p.url);

    console.log(`Found ${products.length} products for query: ${userMessage}`);

    // Step 4: Check if we have relevant results
    const hasRelevantResults = results.length > 0 && productQuery;

    // If no relevant results, return the default message
    if (!hasRelevantResults && !productQuery) {
      // Step 5: Generate context and prompt for LLM for non-product queries
      let contextTexts = results.map(r => r.metadata?.text || "").join("\n");
      const fullPrompt = createDeepseekPrompt(userMessage, contextTexts);

      // Step 6: Generate response using DeepSeek for non-product queries
      const { response } = await generateLLMResponse(fullPrompt, []);
      
      return json({ 
        answer: response, 
        products: [] 
      });
    } 

    // For product queries, even if no products found, we should use the product flow
    let contextTexts = results.map(r => r.metadata?.text || "").join("\n");
    const fullPrompt = createDeepseekPrompt(userMessage, contextTexts);
    
     // Generate response for product queries
    const { response, products: filteredProducts } = await generateLLMResponse(fullPrompt, products);

    return json({ 
      answer: response, 
      products: filteredProducts && filteredProducts.length > 0 ? filteredProducts : products
    });
  } catch (error) {
    console.error("Error processing DeepSeek request:", error);
    return json({ error: "Failed to fetch response from DeepSeek" }, { status: 500 });
  }
};