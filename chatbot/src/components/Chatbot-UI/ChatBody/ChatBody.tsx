import { memo, useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react';
import { useChat } from '../../../hooks/useChat';
import { getConversationKey } from '../../../services/user';
import { getOrCreateGuestId } from '../../../utils/guest';
import {
  loadFaqAssistantData,
  resolveFaqMessage,
  buildTopFaqTags,
  type FaqAssistantData,
} from '../../../services/faqAssistant';
import { useConfig } from '../../../context/ConfigContext';
import { MessageList } from '../MessageList/MessageList';
import { ChatInput } from '../ChatInput/ChatInput';
import { ChatWelcome } from '../ChatWelcome/ChatWelcome';
import type { ChatBodyHandle, ChatBodyProps, TagItem } from '../../../types';
import './ChatBody.scss';

const ChatBody = forwardRef<ChatBodyHandle, ChatBodyProps>(
  ({ jwtToken, setError, isEmailGateVisible, onMessagesCountChange }, ref) => {  
    const config = useConfig();
    const [conversationKey, setConversationKey] = useState<string | null>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const assistantDataRef = useRef<FaqAssistantData | null>(null);
    
    useEffect(() => {
     setConversationKey(getConversationKey(config.shopId));
    }, [jwtToken, config.shopId]);

    useEffect(() => {
      loadFaqAssistantData(config.shopId).then((data) => {
        assistantDataRef.current = data;
        console.log('[Chatbot] Loaded FAQs:', data.faqs.length);
      });
    }, [config.shopId]);

    const { messages, isTyping, isLoading, handleTyping, addMessage, handleBotResponse, clearConversation } = useChat(conversationKey);

    useEffect(() => {
      onMessagesCountChange(messages.length);
    }, [messages.length, onMessagesCountChange]);

    const handleStartConversation = useCallback(async () => {
      if (!assistantDataRef.current) {
        assistantDataRef.current = await loadFaqAssistantData(config.shopId);
      }

      const greetingTags: TagItem[] = buildTopFaqTags(assistantDataRef.current.faqs);
      addMessage(config.greetingMessage, 'bot', undefined, greetingTags);
      setHasStarted(true);
    }, [addMessage, config.greetingMessage, config.shopId]);

    const resetChat = useCallback(async () => {
        await clearConversation();
        setHasStarted(false);
    }, [clearConversation]);

    useImperativeHandle(ref, () => ({
      clearConversation: resetChat,
    }));

    const handleSendMessage = async (content: string) => {
      addMessage(content, 'user');
      handleTyping(true);

      try {
        if (!assistantDataRef.current) {
          assistantDataRef.current = await loadFaqAssistantData(config.shopId);
        }

        const sessionId = conversationKey || getOrCreateGuestId();
        const response = await resolveFaqMessage(
          config.shopId,
          sessionId,
          content,
          assistantDataRef.current,
        );

        handleBotResponse(response);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred.';
        console.error('[Chatbot] Message error:', errorMessage);
        setError(errorMessage);
        handleBotResponse({
          answer: config.fallbackMessage,
          products: [],
          success: false,
          tags: assistantDataRef.current
            ? buildTopFaqTags(assistantDataRef.current.faqs)
            : [],
        });
      } finally {
        handleTyping(false);
      }
    };

    const lastMessage = messages[messages.length - 1];
    const tagsToShow = lastMessage?.type === 'bot' ? lastMessage.tags || [] : [];
    const showWelcome = !hasStarted && !isLoading && !isEmailGateVisible;

    return (
      <div className="chat-body-container">
        {showWelcome ? (
          <ChatWelcome onStart={handleStartConversation} />
        ) : (
          <>
            <MessageList
              messages={messages}
              isTyping={isTyping}
              onProductAddToCart={async () => {}}
              tags={tagsToShow}
              handleSendMessage={handleSendMessage}
            />

            <ChatInput
              onSendMessage={handleSendMessage}
              disabled={isTyping}
            />
          </>
        )}
      </div>
    );
  }
);

export default memo(ChatBody);
