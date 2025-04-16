import { useState } from "react";
import { sendMessageToDeepSeek } from "app/services/deepseek";
import MessageList from "./MessageList";
import InputComponent from "./InputComponent";
import StaticSlider from "./StaticSlider";
import TypingLoader from "./TypingLoader";
import type { ChatbotWindowProps, Message, Product } from "app/common/types";
import styles from './styles/Chatbot.module.css';

export const ChatbotWindow = ({ color }: ChatbotWindowProps) => {
  const [messages, setMessages] = useState<Array<Message>>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const addMessage = (
    text: string, 
    sender: 'user' | 'bot', 
    products?: Product[],
    categories?: string[]
  ) => {
    setMessages((prev) => [...prev, { text, sender, products, categories }]);
  };

  const handleSendMessage = async (userMessage: string) => {
    if (!userMessage.trim()) return;

    addMessage(userMessage, 'user');
    setIsLoading(true);
    
    try {
      //TODO - Why we are using sendMessageToDeepSeek, we are using deepseek in backend right by creating wrapping to fastapi
      const response = await sendMessageToDeepSeek(userMessage);

      const validProducts = response.products?.filter(product => 
        product &&
        product.title && 
        (product.price !== 'Price not available') && 
        (product.image !== 'Image not available') && 
        product.url
      );

      addMessage(
        response.answer, 
        "bot", 
        validProducts && validProducts.length > 0 ? validProducts : undefined,
        response.categories
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
    <div className={styles.chatbotPopup} style={{ borderColor: color || "#008080" }}>
      <div className={styles.chatbotHeader} style={{ backgroundColor: color || "#008080"}}>
        <span>Store Assistant123</span>
      </div>
      <div className={styles.chatbotMessages}>
        <MessageList messages={messages} color={color} onSendMessage={handleSendMessage}/>
        {isLoading && <TypingLoader color={color} />}
      </div>
      <StaticSlider color={color} onSelectOption={handleSelectOption} />
      <InputComponent onSendMessage={handleSendMessage} color={color} />
    </div>
  );
};