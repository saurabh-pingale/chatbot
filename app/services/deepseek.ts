import axios from "axios";
import { DeepSeekResponse } from "app/common/types";

export const sendMessageToDeepSeek = async (userMessage: string): Promise<DeepSeekResponse> => {
  if (!userMessage.trim()) {
    throw new Error("Message cannot be empty");
  }

  try {
    const response = await axios.post("http:localhost:8000/deepseek", {
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
