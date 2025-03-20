import { pipeline } from "@xenova/transformers";
import { padVector } from "../../utils/vectorUtils";

let extractor: any;

export const generateEmbeddings = async (text: string): Promise<number[]> => {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
      runtime: "web",
    });
  }
  
  const output = await extractor(text, { pooling: "mean", normalize: true });

  const embeddings = Array.from(output.data);

  return padVector(embeddings, 1024);
};