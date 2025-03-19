import { fetchShopifyProducts } from "../services/shopify/fetchProducts";
import { generateProductsEmbeddings } from "../services/embedding/embeddingService";
import { storeEmbeddings } from "../services/pinecone/pineconeService";

export const processProducts = async (shopifyStore: string, shopifyAccessToken: string): Promise<void> => {
  try {
    // Fetch products from Shopify
    const products = await fetchShopifyProducts(shopifyStore, shopifyAccessToken);
    console.log("Products fetched from Shopify:", products);

    // Generate embeddings for each product
    const embeddings = await generateProductsEmbeddings(products);

    // Store embeddings in Pinecone
    await storeEmbeddings(embeddings);
    console.log("Embeddings stored in Pinecone successfully.");
  } catch (error) {
    console.error("Error processing products:", error);
    throw new Error("Failed to process products");
  }
};