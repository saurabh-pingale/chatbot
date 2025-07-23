import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message, ChatResponse, ProductType } from '../types';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);

  const handleTyping = (isTyping: boolean) => {
    setIsTyping(isTyping)
  }

  const addMessage = useCallback((content: string, type: 'user' | 'bot', products?: ProductType[]) => {
    const newMessage: Message = {
      id: uuidv4(),
      content,
      type,
      timestamp: new Date(),
      products,
    };
    
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const handleBotResponse = useCallback((response: ChatResponse) => {
    const botMessage: Message = {
      id: uuidv4(),
      content: response?.answer,
      type: 'bot',
      timestamp: new Date(),
      products: response?.products,
    };
    setMessages(prev => [...prev, botMessage]);
  }, []);

  return {
    messages,
    isTyping,
    handleTyping,
    addMessage,
    handleBotResponse,
    setMessages
  };
};