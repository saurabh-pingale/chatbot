import { useState } from "react";
import { sendMessageToDeepSeek } from "app/services/deepseek";
import MessageList from "./MessageList";
import InputComponent from "./InputComponent";
import StaticSlider from "./StaticSlider";
import TypingLoader from "./TypingLoader";
import { ChatbotWindowProps } from "app/common/types";
import { Message } from "app/common/types";
import { Product } from "app/common/types";
import styles from './styles/Chatbot.module.css';

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

  const handleSelectOption = (option: string) => {
    handleSendMessage(option);
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
      <StaticSlider color={color} onSelectOption={handleSelectOption} />
      <InputComponent onSendMessage={handleSendMessage} color={color} />
    </div>
  );
};