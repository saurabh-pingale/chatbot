import { HfInference } from "@huggingface/inference";

const isGreeting = (message: string): boolean => {
  const greetings = ["hi", "hello", "hey", "how are you", "good morning", "good evening", "good afternoon"];
  const cleanMessage = message.toLowerCase().trim();
  return greetings.some(greeting => 
    cleanMessage === greeting || 
    cleanMessage.startsWith(greeting + " ") || 
    cleanMessage.endsWith(" " + greeting)
  );
};

const getGreeting = (): string => {
  const currentHour = new Date().getHours();
  if (currentHour < 12) return "Good morning";
  else if (currentHour < 18) return "Good afternoon";
  else return "Good evening";
};

// Improved price range extraction with more patterns
const extractPriceRange = (prompt) => {
  // Normalize text for better matching
  const text = prompt.toLowerCase().replace(/\s+/g, ' ');
  
  // Match explicit range format (e.g., "$10-$20", "10-20", "10 to 20")
  const rangeMatch = text.match(/\$?(\d+(?:\.\d+)?)\s*(?:-|to)\s*\$?(\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    return `${rangeMatch[1]}-${rangeMatch[2]}`;
  }
  
  // Match "below/under X" format
  const belowMatch = text.match(/(?:below|under|less than|cheaper than)\s+\$?(\d+(?:\.\d+)?)/i);
  if (belowMatch) {
    return `0-${belowMatch[1]}`;
  }
  
  // Match "above/over X" format
  const aboveMatch = text.match(/(?:above|over|more than|at least|min(?:imum)?)\s+\$?(\d+(?:\.\d+)?)/i);
  if (aboveMatch) {
    return `${aboveMatch[1]}-999999`;
  }
  
  // Match exact price
  const exactMatch = text.match(/(?:exactly|precisely|costs?|price[ds]?(?:\s+at)?)\s+\$?(\d+(?:\.\d+)?)/i);
  if (exactMatch) {
    // Small range around the exact price for floating point comparison
    const price = parseFloat(exactMatch[1]);
    return `${price-0.01}-${price+0.01}`;
  }
  
  return "";
};

// Improved product filtering with better price handling
const filterProductsByPrice = (products, priceRange) => {
  if (!priceRange || !products || products.length === 0) return products;

  const [minStr, maxStr] = priceRange.split("-");
  const min = parseFloat(minStr);
  const max = parseFloat(maxStr);
  
  return products.filter((product) => {
    let priceStr = product.price || product.metadata?.price || "";
    
    // Handle various price formats and extract the numeric value
    priceStr = priceStr.replace(/[^\d.]/g, "");
    const price = parseFloat(priceStr);
    
    if (isNaN(price)) return false;
    
    // Apply the min/max filters if they are valid numbers
    return (!isNaN(min) ? price >= min : true) && (!isNaN(max) ? price <= max : true);
  });
};

// Enhanced product detection with more patterns and better cleaning
const isProductQuery = (userMessage) => {
  if (!userMessage) return false;
  
  const normalizedMsg = userMessage.toLowerCase().trim();
  
  // Direct product listing requests
  if (/(?:show|list|display|what|tell me about)(?: me)?(?: your| the| all)? (?:products?|items?|snowboards?|goods|merchandise)/i.test(normalizedMsg)) {
    return true;
  }
  
  // Price-related queries
  if (/price|cost|how much|deal|discount|sale|cheap|expensive|affordable|budget/i.test(normalizedMsg)) {
    return true;
  }
  
  // Shopping intent
  if (/(?:can i|do you have|looking for|searching for|want to|interested in) (?:buy|get|purchase|order|find)/i.test(normalizedMsg)) {
    return true;
  }
  
  // Product attributes
  if (/color|size|dimension|material|feature|specification/i.test(normalizedMsg)) {
    return true;
  }
  
  // Direct product mentions (this should be checked at the end as it's broader)
  const productKeywords = ["snowboard", "product", "item"];
  return productKeywords.some(keyword => normalizedMsg.includes(keyword));
};

// Improved specific product detection
const isAboutSpecificProduct = (userMessage, products) => {
  if (!products || products.length === 0 || !userMessage) return false;
  
  // Clean the message by removing common query words
  const cleanedMessage = userMessage.toLowerCase()
    .replace(/show\s+me|about|do you have|tell me about|price|cost|how much/gi, '')
    .trim();
  
  if (cleanedMessage.length < 3) return false;
  
  // Extract colors and product types from the query
  const colorWords = ["red", "green", "blue", "yellow", "orange", "black", "white", "purple"];
  const productWords = ["snowboard", "board"];
  
  const queryColors = colorWords.filter(color => cleanedMessage.includes(color));
  const queryProducts = productWords.filter(product => cleanedMessage.includes(product));
  
  // Check for color matches in product titles
  if (queryColors.length > 0) {
    return products.some(product => {
      const title = (product.title || product.metadata?.title || "").toLowerCase();
      return queryColors.some(color => title.includes(color));
    });
  }
  
  // If specific product type mentioned
  if (queryProducts.length > 0) {
    return products.some(product => {
      const title = (product.title || product.metadata?.title || "").toLowerCase();
      return queryProducts.some(product => title.includes(product));
    });
  }
  
  // Check for any significant word match
  return products.some(product => {
    const title = (product.title || product.metadata?.title || "").toLowerCase();
    const titleWords = title.split(/\s+/).filter(word => word.length > 3);
    
    return titleWords.some(word => cleanedMessage.includes(word));
  });
};

// Enhanced color-specific product matching
const matchProductsByColor = (userMessage, products) => {
  const colorWords = ["red", "green", "blue", "yellow", "orange", "black", "white", "purple"];
  const queryColors = [];
  
  // Find all colors mentioned in the query
  colorWords.forEach(color => {
    if (userMessage.toLowerCase().includes(color)) {
      queryColors.push(color);
    }
  });
  
  if (queryColors.length === 0) return products;
  
  // Filter products that match any of the requested colors
  return products.filter(product => {
    const title = (product.title || product.metadata?.title || "").toLowerCase();
    return queryColors.some(color => title.includes(color));
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

  // No products available
  if (!validProducts || validProducts.length === 0) {
    if (isProductQuery(userMessage)) {
      return { 
        response: "I'm sorry, but I couldn't find any products matching your request.",
        products: []
      };
    }
    return { response: "I don't have much information on this." };
  }

  // General product listing query
  const showProductsRegex = /show\s+(?:me\s+)?(?:all\s+)?(?:your\s+)?(?:products|snowboards|items)/i;
  if (showProductsRegex.test(userMessage)) {
    return { 
      response: "Here are our snowboards:", 
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
        
        if (min && max && max < 999999) {
          responseText += ` products priced between $${min} and $${max}:`;
        } else if (min && (!max || max >= 999999)) {
          responseText += ` products priced above $${min}:`;
        } else if (max && max < 999999) {
          responseText += ` products priced below $${max}:`;
        } else {
          responseText += " some products that match your price criteria:";
        }
        
        return { response: responseText, products: filteredProducts };
      } else {
        return { 
          response: "I couldn't find any products matching that price range. Here are some other products you might be interested in:", 
          products: validProducts.slice(0, 5)
        };
      }
    }
  }

   // Handle exact price queries
   if (userMessage.match(/(?:costs?|price[ds]?)\s+(?:exactly|precisely)?\s*\$?\d+(?:\.\d+)?/i)) {
    const priceRange = extractPriceRange(userMessage);
    if (priceRange) {
      const filteredProducts = filterProductsByPrice(validProducts, priceRange);
      if (filteredProducts.length > 0) {
        return {
          response: "Here are products matching your requested price:",
          products: filteredProducts
        };
      }
    }
  }

   // Handle color-specific queries
   const colorMatches = matchProductsByColor(userMessage, validProducts);
   if (colorMatches.length > 0 && colorMatches.length < validProducts.length) {
     return {
       response: "Here are the snowboards in the color you requested:",
       products: colorMatches
     };
   }

  // Handle specific product queries
  if (isAboutSpecificProduct(userMessage, validProducts)) {
    // Filter products based on the query terms
    const matchedProducts = validProducts.filter(product => {
      const title = (product.title || "").toLowerCase();
      const description = (product.description || "").toLowerCase();
      const queryTerms = userMessage.toLowerCase().split(/\s+/).filter(term => term.length > 3);
      
      return queryTerms.some(term => title.includes(term) || description.includes(term));
    });
    
    if (matchedProducts.length > 0) {
      return { 
        response: "Here are the products that match your query:", 
        products: matchedProducts 
      };
    }
  }

  // For general product questions that didn't match specific filters
  if (isProductQuery(userMessage)) {
    return {
      response: "Here are our available snowboards:",
      products: validProducts
    };
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