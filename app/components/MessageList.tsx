import React, { useEffect, useRef } from 'react';
import styles from './Chatbot.module.css';
import ProductSlider from './ProductSlider';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  products?: Array<{ title: string; price: string; image: string; url: string }>;
}

interface MessageListProps {
  messages: Message[];
  color?: string | null;
}

const MessageList: React.FC<MessageListProps> = ({ messages, color }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={styles.chatbotMessages}>
      {messages.map((msg, index) => (
        <div key={index} className={styles.messageWrapper} >
          <div className={`${styles.message} ${msg.sender === 'user' ? styles.user : styles.bot}`}>
            {msg.text}
          </div>
          {msg.sender === 'bot' && msg.products && msg.products.length > 0 && (
            <ProductSlider products={msg.products} color={color} />
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
