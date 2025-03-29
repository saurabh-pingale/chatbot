import React, { useEffect, useRef } from 'react';
import ProductSlider from './ProductSlider';
import { MessageListProps } from 'app/common/types';
import styles from './styles/Chatbot.module.css';
import CategoryButtons from './CategoryButtons';

const MessageList: React.FC<MessageListProps> = ({ messages, color, onSendMessage }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCategorySelect = (category: string) => {
    onSendMessage(category);
  };

  return (
    <div className={styles.chatbotMessages}>
      {messages.map((msg, index) => (
        <div key={index} className={styles.messageWrapper} >
          <div className={`${styles.message} ${msg.sender === 'user' ? styles.user : styles.bot}`}>
            {msg.text}
          </div>

          {msg.sender === 'bot' && msg.categories && msg.categories.length > 0 && (
            <CategoryButtons 
              categories={msg.categories} 
              color={color || "#008080"}
              onSelectCategory={handleCategorySelect}
            />
          )}

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
