import { sendMessageToDeepSeek } from "app/services/deepseek";
import { useState } from "react";
import MessageList from "./MessageList";
import InputComponent from "./InputComponent";
import styles from './Chatbot.module.css'
import TypingLoader from "./TypingLoader";

interface ChatbotWindowProps {
  onClose: () => void;
  color: string | null;
}

interface Product {
  title: string;
  price: string;
  image: string;
  url: string;
}

interface Message {
  text: string;
  sender: 'user' | 'bot';
  products?: Product[];
}

export const ChatbotWindow = ({ onClose, color }: ChatbotWindowProps) => {
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const addMessage = (text: string, sender: 'user' | 'bot', products?: Product[]) => {
    setMessages((prev) => [...prev, { text, sender, products }]);
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    addMessage(userMessage, 'user');
    setIsLoading(true);
    
    try {
      const response = await sendMessageToDeepSeek(userMessage);

      const validProducts = response.products?.filter(p => 
        p && p.title && p.price && p.image && p.url
      );

      addMessage(
        response.answer, 
        "bot", 
        validProducts && validProducts.length > 0 ? validProducts : undefined
      );
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