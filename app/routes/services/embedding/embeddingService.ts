import { generateEmbeddings } from "./huggingfaceEmbedding";
import { ShopifyProduct, ProductEmbedding } from "../../types";

export const generateProductEmbedding = async (product: ShopifyProduct): Promise<ProductEmbedding> => {
  const text = `${product.title} ${product.description} ${product.price}`;
  const embedding = await generateEmbeddings(text);
  
  return {
    id: product.id,
    values: embedding,
    metadata: { 
      text,
      url: product.url,
      image: product.image,
    },
  };
};

export const generateProductsEmbeddings = async (products: ShopifyProduct[]): Promise<ProductEmbedding[]> => {
  return Promise.all(products.map(product => generateProductEmbedding(product)));
};


export { generateEmbeddings };