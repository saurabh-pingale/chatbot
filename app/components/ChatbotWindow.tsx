import { sendMessageToDeepSeek } from "app/services/deepseek";
import { useState } from "react";
import MessageList from "./MessageList";
import InputComponent from "./InputComponent";
import styles from './Chatbot.module.css'
import TypingLoader from "./TypingLoader";
import ProductSlider from "./ProductSlider";

interface ChatbotWindowProps {
  onClose: () => void;
  color: string | null;
}

export const ChatbotWindow = ({ onClose, color }: ChatbotWindowProps) => {
  const [messages, setMessages] = useState<Array<{ text: string; sender: 'user' | 'bot' }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Array<{ title: string; price: string; image: string; url: string }>>([]);
  
  const addMessage = (text: string, sender: 'user' | 'bot') => {
    setMessages((prev) => [...prev, { text, sender }]);
  };

  const handleSendMessage = async (userMessage: string) => {
    addMessage(userMessage, 'user');
    setIsLoading(true);
    
    try {
      const botResponse = await sendMessageToDeepSeek(userMessage);
      addMessage(botResponse, "bot");

       // Check if the response indicates products should be shown
       if (botResponse.toLowerCase().includes("show products") || userMessage.toLowerCase().includes("show me")) {
        const response = await fetch("/deepseek", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [{ role: "user", content: userMessage }] }),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch products");
        }

        const data = await response.json();
        if (data.products) {
          setProducts(data.products);
        }
      }
    } catch (error) {
      addMessage("Error: Unable to fetch response. Please try again.", "bot");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.chatbotPopup} style={{ borderColor: color || "#555" }}>
      <div className={styles.chatbotHeader} style={{ backgroundColor: color || "#008080"}}>
        <span>Bot Name</span>
      </div>
      <div className={styles.chatbotMessages}>
        <MessageList messages={messages}/>
        {isLoading && <TypingLoader color={color} />}
        {products.length > 0 && <ProductSlider color={color} />}
      </div>
      <InputComponent onSendMessage={handleSendMessage} color={color} />
    </div>
  );
};