import { useState, useCallback } from 'react';
import type { Message } from '../types';
import { v4 as uuidv4 } from 'uuid';

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
    console.log('[useChat] Setting isTyping to true');
    setIsTyping(true);

    addMessage(response, 'bot');
    console.log('[useChat] Setting isTyping to false (after adding message)');
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