import { generateProductsEmbeddings } from "../services/embedding/embeddingService";
import { storeEmbeddings } from "../services/pinecone/pineconeService";
import { ShopifyProduct } from "../types";

export const validateAndProcessJson = async (jsonData: any, shopId: string): Promise<string> => {
  try {
    if (!Array.isArray(jsonData)) {
      throw new Error("Invalid JSON format. Expected an array of products.");
    }

    const products = jsonData as ShopifyProduct[];
    const embeddings = await generateProductsEmbeddings(products);

    await storeEmbeddings(embeddings, shopId);
    return "LLM is trained with the data that you've provided. Thank you!";
  } catch (error) {
    console.error("Error processing JSON data:", error);
    throw new Error("Failed to process JSON data");
  }
};