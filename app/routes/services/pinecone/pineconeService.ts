import { Pinecone } from "@pinecone-database/pinecone";
import { Vector, ProductEmbedding, VectorMetadata } from "../../types";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY ?? "" });
const INDEX_NAME = 'chatbot';

export const storeEmbeddings = async (embeddings: ProductEmbedding[]): Promise<void> => {
  const index = pinecone.Index(INDEX_NAME);

  await index.upsert(embeddings);
};

export const queryEmbeddings = async (vector: number[], topK: number = 10): Promise<Vector[]> => {
  const index = pinecone.Index(INDEX_NAME);

  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  const normalizedVector = vector.map(val => val / norm);

  const results = await index.query({ 
    vector: normalizedVector, 
    topK, 
    includeMetadata: true, 
  });

  return results.matches.map((match) => ({
    id: match.id,
    values: match.values || [],
    metadata: match.metadata as unknown as VectorMetadata,
  }));
};