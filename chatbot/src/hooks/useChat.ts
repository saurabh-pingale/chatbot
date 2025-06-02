import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Message } from '../types';

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const addMessage = useCallback((content: string, type: 'user' | 'bot') => {
    const newMessage: Message = {
      id: uuidv4(),
      content,
      type,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const simulateBotTyping = useCallback(async (response: string) => {
    setIsTyping(true);

    addMessage(response, 'bot');
    setIsTyping(false);
  }, [addMessage]);

  return {
    messages,
    isTyping,
    addMessage,
    setIsTyping,
    simulateBotTyping,
  };
}; 