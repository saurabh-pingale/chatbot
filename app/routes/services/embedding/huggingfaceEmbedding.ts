import fetch from "node-fetch";
import { padVector } from "../../utils/vectorUtils";

export const generateEmbeddings = async (text: string): Promise<number[]> => {
  const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
  
  const response = await fetch(
    "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: text }),
    }
  );

  if (!response.ok) {
    throw new Error(`Hugging Face API error: ${response.statusText}`);
  }

  const data = await response.json();
  return padVector(data, 1024);
};