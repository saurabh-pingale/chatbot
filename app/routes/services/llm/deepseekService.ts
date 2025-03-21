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

const extractPriceRange = (prompt: string): string => {
  // Check for explicit range format (e.g., "$10-$20" or "10-20")
  const rangeMatch = prompt.match(/\$?(\d+)\s*-\s*\$?(\d+)/);
  if (rangeMatch) {
    return `${rangeMatch[1]}-${rangeMatch[2]}`;
  }
  
  // Check for "below X" or "under X" format
  const belowMatch = prompt.match(/(?:below|under)\s+\$?(\d+)/i);
  if (belowMatch) {
    return `0-${belowMatch[1]}`;
  }
  
  // Check for "above X" or "over X" format
  const aboveMatch = prompt.match(/(?:above|over)\s+\$?(\d+)/i);
  if (aboveMatch) {
    return `${aboveMatch[1]}-10000`; // Using a large upper bound
  }
  
  return "";
};

const filterProductsByPrice = (products: any[], priceRange: string): any[] => {
  if (!priceRange || !products || products.length === 0) return [];

  const [min, max] = priceRange.split("-").map(Number);
  return products.filter((product) => {
    if (!product.metadata || !product.metadata.price) return false;
    const price = parseFloat(product.metadata.price.replace(/[^\d.]/g, ""));
    return (!min || price >= min) && (!max || price <= max);
  });
};

export const generateLLMResponse = async (prompt: string, products: any[] = []): Promise<{
  response: string; products?: any[] }> => {
  const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

  // Extract the raw user query from the prompt
  const userMessageMatch = prompt.match(/Question:\s*(.*?)(?:\n|$)/);
  const userMessage = userMessageMatch ? userMessageMatch[1] : prompt;

  // Empty or meaningless prompt check
  const cleanPrompt = userMessage.trim();
  if (cleanPrompt.length === 0 || cleanPrompt === "." || /^[^a-zA-Z0-9]+$/.test(cleanPrompt)) {
    return { response: "I don't have much information on this." };
  }

  // Handle greetings dynamically
  if (isGreeting(userMessage)) {
    const greeting = getGreeting();
    return { response: `${greeting}! 🌟 How can I assist you today? If you have any questions about our products, feel free to ask! I'm here to help you with all things! 😊` };
  }

  // Handle "Show me products" query
  if (/show\s+(?:me\s+)?products/i.test(userMessage)) {
    return { 
      response: "Here are some products you might like:", 
      products: products.length > 0 ? products : [] 
    };
  }

  // Handle price range queries
  const priceRangeKeywords = /price\s+range|below|under|above|over|between/i;
  if (priceRangeKeywords.test(userMessage)) {
    const priceRange = extractPriceRange(userMessage);
    if (priceRange) {
      const filteredProducts = filterProductsByPrice(products, priceRange);
      return { 
        response: `Here are some products within the price range ${priceRange}:`, 
        products: filteredProducts.length > 0 ? filteredProducts : []
      };
    }
  }

  // Handle product-specific queries
  if (products && products.length > 0) {
    const matchedProducts = products.filter((product) =>
      product.title && prompt.toLowerCase().includes(product.title.toLowerCase())
    );
    
    if (matchedProducts.length > 0) {
      return { 
        response: `Here are some products: ${matchedProducts[0].title}`, 
        products: matchedProducts 
      };
    }
  }

  try{
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

    return { response: cleanedResponse };
  } catch(error) {
    console.error("Error generating response:", error);
    return { response: "I don't have much information on this." };
  }
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