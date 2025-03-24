import { fetchShopifyProducts } from "../services/shopify/fetchProducts";
import { generateProductsEmbeddings } from "../services/embedding/embeddingService";
import { storeEmbeddings } from "../services/pinecone/pineconeService";

export const processProducts = async (shopifyStore: string, shopifyAccessToken: string): Promise<void> => {
  try {
    const products = await fetchShopifyProducts(shopifyStore, shopifyAccessToken);

    const embeddings = await generateProductsEmbeddings(products);

    await storeEmbeddings(embeddings);
  } catch (error) {
    console.error("Error processing products:", error);
    throw new Error("Failed to process products");
  }
};