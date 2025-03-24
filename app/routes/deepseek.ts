import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { generateEmbeddings } from "./services/embedding/embeddingService";
import { queryEmbeddings } from "./services/pinecone/pineconeService";
import { processProducts } from "./processors/productProcessor";
import { validateAndProcessJson } from "./processors/jsonProcessor";
import { createDeepseekPrompt, generateLLMResponse } from "./services/llm/deepseekService";
import { verifyAppProxySignature } from "./utils/shopifyProxyUtils";
import { DeepseekRequestBody } from "./types";

export const action: ActionFunction = async ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams;

  const API_SECRET = process.env.SHOPIFY_API_SECRET || '';
  
  if (query.has('signature')) {
    if (!verifyAppProxySignature(query, API_SECRET)) {
      return json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  try {
    const body = await request.json() as DeepseekRequestBody;
    const { messages, isTrainingPage, shopifyStore, shopifyAccessToken } = body;

    if (isTrainingPage && shopifyStore && shopifyAccessToken) {
      await processProducts(shopifyStore, shopifyAccessToken);
      return json({ answer: "Products fetched and embeddings stored successfully!" });
    }

    if (!messages || !Array.isArray(messages)) {
      return json({ error: "Invalid or missing messages" }, { status: 400 });
    }

    const userMessage = messages[messages.length - 1]?.content;
    if (!userMessage) {
      return json({ error: "User message is missing" }, { status: 400 });
    }

    const shopId = shopifyStore 
      ? shopifyStore.replace(/^https?:\/\//, '').replace(/\.myshopify\.com.*$/, '')
      : 'default';

    if (isTrainingPage) {
      try {
        const jsonData = JSON.parse(userMessage);
        const response = await validateAndProcessJson(jsonData, shopId);
        return json({ answer: response });
      } catch (jsonError) {
        return json({ answer: "Please provide a valid JSON input to train the LLM." });
      }
    }

    const userMessageEmbeddings = await generateEmbeddings(userMessage);
    
    const queryResults = await queryEmbeddings(userMessageEmbeddings);

    const products = queryResults
      .filter(r => r && r.metadata)
      .map(r => ({
        id: r.id || "",
        product: r.metadata?.text?.split(',')[0] || "",
        url: r.metadata?.url || "",
        image: r.metadata?.image || ""
      }))
      .filter(p => p.product && p.url);

    const contextTexts = queryResults
      .filter(r => r && r.metadata)
      .map(r => {
        const product = r.metadata?.text?.split('  ')[0];
        return `Product: ${product}}.`;
      })
      .join("\n");
    
    const fullPrompt = createDeepseekPrompt(userMessage, contextTexts);
    
    const { response, products: filteredProducts } = await generateLLMResponse(fullPrompt, products);
    
    return json({ 
      answer: response, 
      products: filteredProducts || []
    });
    
  } catch (error) {
    console.error("Error processing request:", error);
    return json({ error: "Failed to process your request" }, { status: 500 });
  }
};