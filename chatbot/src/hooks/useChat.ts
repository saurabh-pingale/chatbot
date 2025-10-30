import { useState, useCallback, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../services/db';
import type { Message, ChatResponse, ProductType, TagItem } from '../types';

export const useChat = (conversationKey: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!conversationKey) return;

    const loadMessages = async () => {
      setIsLoading(true);
      const storedMessages = await db.getConversation(conversationKey);
      if (storedMessages && storedMessages.length > 0) {
        setMessages(storedMessages);
      }
      setIsLoading(false);
    };

    loadMessages();
  }, [conversationKey]);

  useEffect(() => {
    if (isLoading || !conversationKey || messages.length === 0) {
      return;
    }
    db.saveConversation(conversationKey, messages);
  }, [messages, conversationKey, isLoading]);

  const handleTyping = (isTyping: boolean) => {
    setIsTyping(isTyping);
  };

  const addMessage = useCallback((
    content: string,
    type: 'user' | 'bot',
    products?: ProductType[],
    tags?: TagItem[]
  ) => {
    const newMessage: Message = {
      id: uuidv4(),
      content,
      type,
      timestamp: new Date(),
      products,
      tags,
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
      tags: response?.tags,
    };
    setMessages(prev => [...prev, botMessage]);
  }, []);

  const clearConversation = useCallback(async () => {
    if (!conversationKey) return;
    setMessages([]);
    await db.clearDBConversation(conversationKey);
  }, [conversationKey]);

  return {
    messages,
    isTyping,
    isLoading,
    handleTyping,
    addMessage,
    handleBotResponse,
    clearConversation,
  };
};