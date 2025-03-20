import { pipeline } from '@huggingface/transformers';
import { padVector } from "../../utils/vectorUtils";

export const generateEmbeddings = async (text: string): Promise<number[]> => {
  const extractor = await pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2');

  const embeddings = await extractor(text, { pooling: 'mean' });

  const embeddingVector = embeddings[0];

  return padVector(embeddingVector, 1024);
};