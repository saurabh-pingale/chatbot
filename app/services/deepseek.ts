import axios from "axios";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export const sendMessageToDeepSeek = async (userMessage: string): Promise<string> => {
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

    return response.data.answer;
  } catch (error) {
    console.error("Error communicating with DeepSeek:", error);
    return "Sorry, I am unable to process your request at the moment. Please try again later.";
  }
};
