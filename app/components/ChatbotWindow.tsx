  import { sendMessageToDeepSeek } from "app/services/deepseek";
  import { useState } from "react";
  import MessageList from "./MessageList";
  import InputComponent from "./InputComponent";
  import styles from './Chatbot.module.css'

  interface ChatbotWindowProps {
    onClose: () => void;
    color: string | null;
  }

  export const ChatbotWindow = ({ onClose, color }: ChatbotWindowProps) => {
      const [messages, setMessages] = useState<Array<{ text: string; sender: 'user' | 'bot' }>>([]);

      const addMessage = (text: string, sender: 'user' | 'bot') => {
        setMessages((prev) => [...prev, { text, sender }]);
      };
    
      const handleSendMessage = async (userMessage: string) => {
        addMessage(userMessage, 'user');
        
        try {
          const botResponse = await sendMessageToDeepSeek(userMessage);
          addMessage(botResponse, "bot");
        } catch (error) {
          addMessage("Error: Unable to fetch response. Please try again.", "bot");
        }
      };
    
      return (
        <div className={styles.chatbotPopup} style={{ borderColor: color || "#555" }}>
          <div className={styles.chatbotHeader} style={{ backgroundColor: color || "#008080"}}>
            <span>Bot Name</span>
          </div>
          <MessageList messages={messages}/>
          <InputComponent onSendMessage={handleSendMessage} color={color} />
        </div>
      );
    };