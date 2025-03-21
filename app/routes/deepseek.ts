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

    // Step 1: Convert query to embeddings
    const embeddings = await generateEmbeddings(userMessage);

    // Step 2: Query Pinecone for similar vectors
    const results = await queryEmbeddings(embeddings);

    // Step 3: Format products from Pinecone results
    const products: any[] = results.map(r => ({
      id: r.id,
      title: r.metadata?.title || "",
      description: r.metadata?.description || "",
      url: r.metadata?.url || "",
      price: r.metadata?.price || "",
      image: r.metadata?.image || ""
    }));

    // Step 4: Check if we have relevant results
    const hasRelevantResults = results.length > 0;

    // If no relevant results, return the default message
    if (!hasRelevantResults) {
      return json(
        {
          answer: "I don't have much information on this.",
          products: [],
          metadata: {
            similar_documents_count: 0,
            processed_data: null,
          },
        }
      );
    } 

    // Step 5: Generate context and prompt for LLM
    let contextTexts = results.map(r => r.metadata?.text || "").join("\n");
    const fullPrompt = createDeepseekPrompt(userMessage, contextTexts);
    
    // Step 5: Generate response using DeepSeek
    const { response, products: filteredProducts } = await generateLLMResponse(fullPrompt, products);

    return json({ answer: response, products: filteredProducts || products  });
  } catch (error) {
    console.error("Error processing DeepSeek request:", error);
    return json({ error: "Failed to fetch response from DeepSeek" }, { status: 500 });
  }
};