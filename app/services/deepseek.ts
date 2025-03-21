import axios from "axios";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Product {
  title: string;
  price: string;
  image: string;
  url: string;
}

interface DeepSeekResponse {
  answer: string;
  products?: Product[];
}

export const sendMessageToDeepSeek = async (userMessage: string): Promise<DeepSeekResponse> => {
  if (!userMessage.trim()) {
    throw new Error("Message cannot be empty");
  }

  try {
    const response = await axios.post("/deepseek", {
      messages: [{ role: "user", content: userMessage }],
    });

    if (!response.data || !response.data.answer) {
      throw new Error("No valid response from DeepSeek");
    }

    return {
      answer: response.data.answer,
      products: Array.isArray(response.data.products) ? response.data.products : []
    };
  } catch (error) {
    console.error("Error communicating with DeepSeek:", error);
    return {
      answer: "Sorry, I am unable to process your request at the moment. Please try again later.",
      products: []
    };
  }
};
