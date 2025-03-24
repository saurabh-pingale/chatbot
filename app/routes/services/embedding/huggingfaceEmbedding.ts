import { pipeline } from "@xenova/transformers";
import { padVector } from "../../utils/vectorUtils";

let extractor: any;

export const generateEmbeddings = async (text: string): Promise<number[]> => {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  
  const output = await extractor(text, { pooling: "mean", normalize: true });

  const embeddings = Array.from(output.data as number[]);

  const norm = Math.sqrt(embeddings.reduce((sum, val) => sum + val * val, 0));
  const normalizeEmbeddings = embeddings.map(val => val / norm);

  return padVector(normalizeEmbeddings, 1024);
};