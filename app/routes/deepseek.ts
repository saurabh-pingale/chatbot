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

    // Detect query type and set appropriate parameters
    // Improved regex patterns for better detection
    const isShowAllProductsQuery = /\b(?:show|list|display)\b.*?\b(?:products|snowboards|items)\b/i.test(userMessage);
    const isPriceRangeQuery = /price\s+range|cost|below|under|above|over|between|cheaper|expensive|affordable/i.test(userMessage);
    const hasProductMention = /product|item|goods|merchandise|buy|purchase/i.test(userMessage);
    
    // Unified flag for any product-related query with more comprehensive detection
    const isProductQuery = isShowAllProductsQuery || isPriceRangeQuery || 
                          hasProductMention || 
                          /show me|what (do you|are) (have|selling)|can i (buy|get)/i.test(userMessage);

    console.log(`Query type detection: isProductQuery=${isProductQuery}, isPriceRange=${isPriceRangeQuery}, isShowAll=${isShowAllProductsQuery}`);

    // Step 1: Convert query to embeddings
    const embeddings = await generateEmbeddings(userMessage);
    console.log("Generated Embeddings:", embeddings);
    
    // Step 2: Query Pinecone with appropriate parameters
    // Use larger topK for product queries to ensure good coverage
    const topK = isProductQuery ? 20 : 5;
    const results = await queryEmbeddings(embeddings, topK);
    console.log("Pinecone Result:", results);

    // Better error handling if Pinecone returns no results
    if (!results || results.length === 0) {
      console.log("Warning: No results returned from Pinecone");
      if (isProductQuery) {
        return json({ 
          answer: "I'm sorry, I couldn't find any products matching your query. Please try a different search term.", 
          products: [] 
        });
      } else {
        return json({ 
          answer: "I don't have much information on this topic.", 
          products: [] 
        });
      }
    }

    // Step 3: Format products from Pinecone results with improved error handling
    const products = results
      .filter(r => r && r.metadata)
      .map(r => ({
        id: r.id || "",
        title: r.metadata?.title || "",
        description: r.metadata?.description || "",
        url: r.metadata?.url || "",
        price: r.metadata?.price || "",
        image: r.metadata?.image || ""
      }))
      .filter(p => p.title && p.url); // Ensure we have at least title and URL

    console.log(`Found ${products.length} products for query: ${userMessage}`);

    // Handle "show all products" query directly
    if (isShowAllProductsQuery) {
      return json({ 
        answer: "Here are our products:", 
        products: products
      });
    }

    // Build context from results for LLM
    const contextTexts = results
      .filter(r => r && r.metadata)
      .map(r => {
        // Extract title, description, and price properly from metadata
        const title = r.metadata?.text?.split('  ')[0] || "Untitled Product";
        const price = r.metadata?.text?.split('  ')[1] || "Price not available.";
        const description = r.metadata?.description || "No description available.";
        return `${title}: ${description}. Price: ${price}.`;
      })
      .join("\n");

console.log("Enhanced Context:", contextTexts);
    
    const fullPrompt = createDeepseekPrompt(userMessage, contextTexts);
    console.log("Prompt:", fullPrompt);
    
    // Generate response using LLM with the products and context
    const { response, products: filteredProducts } = await generateLLMResponse(fullPrompt, products);
    
    // Return products if this is a product query - use filtered products if available
    const finalProducts = isProductQuery 
      ? (filteredProducts && filteredProducts.length > 0 ? filteredProducts : products)
      : [];
      
    return json({ 
      answer: response, 
      products: finalProducts
    });
    
  } catch (error) {
    console.error("Error processing request:", error);
    return json({ error: "Failed to process your request" }, { status: 500 });
  }
};