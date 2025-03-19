import { HfInference } from "@huggingface/inference";

export const generateLLMResponse = async (prompt: string): Promise<string> => {
  const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

  const response = await hf.textGeneration({
    model: "deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
    inputs: prompt,
    parameters: {
      max_new_tokens: 200,
      temperature: 0.3,
      return_full_text: false,
    },
  });

  // Clean up the response to remove any thinking tags or other artifacts
  let cleanedResponse = response.generated_text
    .replace(/<\/?think>|<\/?reasoning>/gi, '') // Remove any thinking/reasoning tags
    .replace(/^\s*\n/gm, '') // Remove empty lines
    .trim();

  // If the response still seems to contain thinking or is too verbose, simplify it
  if (cleanedResponse.includes('</think>') || cleanedResponse.length > 300) {
    const lastParagraph = cleanedResponse.split('\n\n').pop() || cleanedResponse;
    cleanedResponse = lastParagraph.trim();
  }

  cleanedResponse = cleanedResponse.split("\n")[0].trim();
  
  return cleanedResponse;
};

export const createDeepseekPrompt = (userMessage: string, contextTexts?: string): string => {
  return `
    You are a helpful assistant that ONLY responds based on the provided context.
    If the information isn't in the context, say "I don't have much information on this."
    ${contextTexts ? `Context: ${contextTexts}` : ""}
    Question: ${userMessage}
    Answer (based ONLY on the provided context, without any thinking tags):
  `;
};