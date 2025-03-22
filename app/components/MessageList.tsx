import React, { useEffect, useRef } from 'react';
import ProductSlider from './ProductSlider';
import { MessageListProps } from 'app/common/types';
import styles from './styles/Chatbot.module.css';

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
            <ProductSlider products={msg.products} color={color ?? null} />
          )}
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;
