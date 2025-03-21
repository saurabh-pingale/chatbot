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
  
  const addMessage = (text: string, sender: 'user' | 'bot', products?: Array<{ title: string; price: string; image: string; url: string}>) => {
    setMessages((prev) => [...prev, { text, sender, products }]);
  };

  const handleSendMessage = async (userMessage: string) => {
    addMessage(userMessage, 'user');
    setIsLoading(true);
    
    try {
      const { answer, products = [] } = await sendMessageToDeepSeek(userMessage);
      addMessage(answer, "bot");

      const validProducts = products.filter(p => 
        p && p.title && p.price && p.image && p.url
      );

      addMessage(answer, "bot", validProducts.length > 0 ? validProducts : undefined);
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
        <MessageList messages={messages} color={color}/>
        {isLoading && <TypingLoader color={color} />}
      </div>
      <InputComponent onSendMessage={handleSendMessage} color={color} />
    </div>
  );
};