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
  if (!priceRange || !products || products.length === 0) return products;

  const [min, max] = priceRange.split("-").map(Number);
  return products.filter((product) => {
    if (!product.price && (!product.metadata || !product.metadata.price)) return false;
    
    const priceStr = product.price || product.metadata?.price || "";
    // Handle various price formats (e.g. "$10.99", "10.99", etc.)
    const price = parseFloat(priceStr.replace(/[^\d.]/g, ""));
    
    return price && (!isNaN(min) ? price >= min : true) && (!isNaN(max) ? price <= max : true);
  });
};

// Check if query is about a specific product
const isAboutSpecificProduct = (userMessage: string, products: any[]): boolean => {
  if (!products || products.length === 0) return false;
  
  // Remove common product query words to focus on product specifics
  const cleanedMessage = userMessage.toLowerCase()
    .replace(/show\s+me|product|products|about|do you have|tell me about|price|cost/gi, '')
    .trim();
  
  if (cleanedMessage.length < 3) return false; // Too short to be meaningful
  
  // Check if any product title words match significant parts of the query
  return products.some(product => {
    const title = (product.title || product.metadata?.title || "").toLowerCase();
    const titleWords = title.split(/\s+/).filter(word => word.length > 3); // Focus on significant words
    
    return titleWords.some(word => cleanedMessage.includes(word));
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
    return { 
      response: `${greeting}! 🌟 How can I assist you today? If you have any questions about our products, feel free to ask! I'm here to help you with all things! 😊`,
      products: [] 
    };
  }

  // Clean up products and ensure they have all required fields
  const validProducts = products
    .filter(product => product && (product.title || product.metadata?.title))
    .map(product => ({
      id: product.id || "",
      title: product.title || product.metadata?.title || "",
      description: product.description || product.metadata?.description || "",
      url: product.url || product.metadata?.url || "",
      price: product.price || product.metadata?.price || "",
      image: product.image || product.metadata?.image || ""
    }));

  // General product listing query
  const showProductsRegex = /show\s+(?:me\s+)?(?:all\s+)?(?:your\s+)?products/i;
  if (showProductsRegex.test(userMessage)) {
    return { 
      response: "Here are some products you might like:", 
      products: validProducts
    };
  }

  // Handle price range queries
  const priceRangeKeywords = /price\s+range|cost|below|under|above|over|between|cheaper|expensive|affordable/i;
  if (priceRangeKeywords.test(userMessage)) {
    const priceRange = extractPriceRange(userMessage);
    
    if (priceRange) {
      const filteredProducts = filterProductsByPrice(validProducts, priceRange);
      
      if (filteredProducts.length > 0) {
        const [min, max] = priceRange.split("-");
        let responseText = "Here are";
        
        if (min && max) {
          responseText += ` products priced between $${min} and $${max}:`;
        } else if (min) {
          responseText += ` products priced above $${min}:`;
        } else if (max) {
          responseText += ` products priced below $${max}:`;
        } else {
          responseText += " some products that match your price criteria:";
        }
        
        return { response: responseText, products: filteredProducts };
      } else {
        return { 
          response: "I couldn't find any products matching that price range. Here are some other products you might be interested in:", 
          products: validProducts.slice(0, 5)  // Fallback to showing some products
        };
      }
    }
  }

  // Handle specific product queries
  const isSpecificProduct = isAboutSpecificProduct(userMessage, validProducts);
  if (isSpecificProduct) {
    // Filter products based on the query terms
    
    const matchedProducts = validProducts.filter(product => {
      const title = (product.title || "").toLowerCase();
      const description = (product.description || "").toLowerCase();
      const queryTerms = userMessage.toLowerCase().split(/\s+/).filter(term => term.length > 3);
      
      return queryTerms.some(term => title.includes(term) || description.includes(term));
    });
    
    if (matchedProducts.length > 0) {
      return { 
        response: `Here are the products that match your query:`, 
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

    cleanedResponse = cleanedResponse[0];

    return { response: cleanedResponse, products: [] };
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