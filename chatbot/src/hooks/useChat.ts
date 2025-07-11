import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message, ChatResponse, ProductType } from '../types';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const addMessage = useCallback((content: string, type: 'user' | 'bot', products?: ProductType[]) => {
    const newMessage: Message = {
      id: uuidv4(),
      content,
      type,
      timestamp: new Date(),
      products,
    };
    
    setMessages(prev => [...prev, newMessage]);

    if (type === 'user') {
      setIsTyping(true);
    }
  }, []);

  const handleBotResponse = useCallback((response: ChatResponse, delay = 1000) => {
    const processResponse = () => {
      const botMessage: Message = {
        id: uuidv4(),
        content: response.answer,
        type: 'bot',
        timestamp: new Date(),
        products: response.products,
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);

      if (response.categories && Array.isArray(response.categories)) {
        setCategories(response.categories);
      } else {
        setCategories([]);
      }
    };

    if (delay > 0) {
      setTimeout(processResponse, delay);
    } else {
      processResponse();
    }
  }, []);

  return {
    messages,
    isTyping,
    addMessage,
    handleBotResponse,
    setMessages,
    categories,
    setCategories
  };
}; 