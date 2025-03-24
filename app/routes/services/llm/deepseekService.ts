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

export const generateLLMResponse = async (prompt: string, products: any[] = []): Promise<{
  response: string; products?: any[] }> => {
  const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

  const userMessageMatch = prompt.match(/Question:\s*(.*?)(?:\n|$)/);
  const userMessage = userMessageMatch ? userMessageMatch[1] : prompt;

  if (isGreeting(userMessage)) {
    return { 
      response: `How can I assist you today? If you have any questions about our products, feel free to ask! I'm here to help you with all things!`,
      products: [] 
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

    let cleanedResponse = response.generated_text
      .replace(/<\/?think>|<\/?reasoning>/gi, '') 
      .replace(/^\s*\n/gm, '') 
      .trim();

    if (cleanedResponse.includes('</think>') || cleanedResponse.length > 300) {
      const lastParagraph = cleanedResponse.split('\n\n').pop() || cleanedResponse;
      cleanedResponse = lastParagraph.trim();
    }

    const lowerUserMessage = userMessage.toLowerCase();
    
    const isProductQuery = lowerUserMessage.includes('product') || 
                          lowerUserMessage.includes('show me') || 
                          lowerUserMessage.includes('list') || 
                          lowerUserMessage.includes('items') || 
                          products.some(p => lowerUserMessage.includes(p.product.toLowerCase().split('no description')[0].trim()));
    
    if (isProductQuery) {
      const transformedProducts = products
        .filter(product => {
          if (lowerUserMessage.includes('show') || lowerUserMessage.includes('list')) {
            return true; 
          } else {
            const productName = product.product.toLowerCase().split('no description')[0].trim();
            return lowerUserMessage.includes(productName);
          }
        })
        .map(product => {
          const productParts = product.product.split('No description available');
          const title = productParts[0].trim();
          const price = productParts[1] ? `$${productParts[1].trim()}` : 'Price not available';
          
          return {
            id: product.id,
            title: title,
            price: price,
            url: product.url,
            image: product.image
          };
      });

      return { response: cleanedResponse, products: transformedProducts };
    } else {
      return { response: cleanedResponse, products: [] }
    }
  } catch(error) {
    console.error("Error generating response:", error);
    return { response: "I don't have much information on this." };
  }
};

export const createDeepseekPrompt = (userMessage: string, contextTexts?: string): string => {
  return `
     You are a specialized product assistant that helps users find products from a catlog.

     Instructions:
     1. If the user asks for products (e.g., "Show me snowboards" or "List products"), provide a list of products from the catalog.
     2. If the user asks about a specific product (e.g., "Tell me about the Green Snowboard" or "Snowboard"), provide details about that product.
     3. If the user asks about features or specifications of a product, provide only factual information from the catalog.
     4. If no products match the user's query, respond with: "I couldn't find any products matching your request..."
     5. Do not make assumptions about products not in the catalog.
     6. Keep responses concise and focused on the products.
     7. Do not use phrases like "based on the Product Catlog" or "according to the information provided."
     8. Do not include thinking tags or explanations of your reasoning process.

    Product Catlog: ${contextTexts}

    User: ${userMessage}
  `;
};