import { HfInference } from "@huggingface/inference";

const isGreeting = (message: string): boolean => {
  const greetings = ["hi", "hello", "hey", "how are you", "good morning", "good evening", "good afternoon"];
  return greetings.some((greeting) => message.toLowerCase().includes(greeting));
};

const getGreeting = (): string => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) return "Good morning";
  else if (currentHour < 18) return "Good afternoon";
  else return "Good evening";
};

const filterProductsByPrice = (products: any[], priceRange: string): any[] => {
  const [min, max] = priceRange.split("-").map(Number);
  return products.filter((product) => {
    const price = parseFloat(product.metadata.price.replace("$", ""));
    return (!min || price >= min) && (!max || price <= max);
  });
};

export const generateLLMResponse = async (prompt: string, products: any[] = []): Promise<{
  response: string; products?: any[] }> => {
  const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

  // Handle greetings dynamically
  if (isGreeting(prompt)) {
    const greeting = getGreeting();
    return { response: `${greeting}! 🌟 How can I assist you today? If you have any questions about our products, feel free to ask! I'm here to help you with all things! 😊` };
  }

  // Handle price range queries
  if (prompt.toLowerCase().includes("price range") || prompt.toLowerCase().includes("below") || prompt.toLowerCase().includes("above")) {
    const priceRange = prompt.match(/\d+-\d+/)?.[0] || "";
    const filteredProducts = filterProductsByPrice(products, priceRange);
    return { response: `Here are some products within the price range ${priceRange}:`, products: filteredProducts };
  }

  // Handle product-specific queries
  const productKeywords = products.map((product) => product.title.toLowerCase());
  const hasProductKeyword = productKeywords.some((keyword) => prompt.toLowerCase().includes(keyword));

  if (hasProductKeyword) {
    const matchedProducts = products.filter((product) =>
      prompt.toLowerCase().includes(product.title.toLowerCase())
    );
    return { response: "Here are some products you might like:", products: matchedProducts };
  }

  // Handle "Show me products" query
  if (prompt.toLowerCase().includes("show me products") || prompt.toLowerCase().includes("show products")) {
    return { response: "Here are some products you might like:", products };
  }

  // Default response for unrelated queries
  if (prompt.trim().length === 0 || prompt.trim() === ".") {
    return { response: "I don't have much information on this." };
  }

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
  
  // Check if the response indicates products should be shown
  if (cleanedResponse.toLowerCase().includes("show products") || prompt.toLowerCase().includes("show me")) {
    return { response: cleanedResponse, products: [] }; 
  }

  return { response: cleanedResponse };
};

export const createDeepseekPrompt = (userMessage: string, contextTexts?: string): string => {
  return `
    You are a helpful assistant that ONLY responds based on the provided context.
    If the information isn't in the context, say "I don't have much information on this."
    ${contextTexts ? `Context: ${contextTexts}` : ""}
    Question: ${userMessage}
    Answer (based ONLY on the provided context, without any thinking tags, and also don't use text like based on this approach):
  `;
};