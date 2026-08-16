import {
  memo,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useRef,
} from 'react';
import { useChat } from '../../../hooks/useChat';
import { getConversationKey } from '../../../services/user';
import { getOrCreateGuestId } from '../../../utils/guest';
import {
  loadFaqAssistantData,
  resolveFaqMessage,
  buildInitialGreetingTags,
  type FaqAssistantData,
} from '../../../services/faqAssistant';
import { useConfig } from '../../../context/ConfigContext';
import { MessageList } from '../MessageList/MessageList';
import type { ChatBodyHandle, ChatBodyProps, TagItem } from '../../../types';
import './ChatBody.scss';

const ChatBody = forwardRef<ChatBodyHandle, ChatBodyProps>(
  ({ jwtToken, setError, onMessagesCountChange }, ref) => {
    const config = useConfig();
    const [conversationKey, setConversationKey] = useState<string | null>(null);
    const assistantDataRef = useRef<FaqAssistantData | null>(null);

    useEffect(() => {
      setConversationKey(getConversationKey(config.shopId));
    }, [jwtToken, config.shopId]);

    // Pre-load FAQs + categories as early as possible
    useEffect(() => {
      loadFaqAssistantData(config.shopId).then((data) => {
        assistantDataRef.current = data;
        console.log(
          '[Chatbot] Loaded FAQs:',
          data.faqs.length,
          '| Categories:',
          data.categories?.length ?? 0,
        );
      });
    }, [config.shopId]);

    const {
      messages,
      isTyping,
      isLoading,
      handleTyping,
      addMessage,
      handleBotResponse,
      clearConversation,
      startFreshConversation,
    } = useChat(conversationKey);

    useEffect(() => {
      onMessagesCountChange(messages.length);
    }, [messages.length, onMessagesCountChange]);

    // ── Bootstrap: seed the greeting message with Hi/Hello tags ──────────────
    // Runs once when conversationKey is resolved and the DB load is done.
    const bootstrappedRef = useRef(false);

    useEffect(() => {
      if (isLoading || bootstrappedRef.current) return;
      // Only seed when there are no prior messages (fresh chat)
      if (messages.length === 0) {
        bootstrappedRef.current = true;
        startFreshConversation(
          config.greetingMessage,
          buildInitialGreetingTags(),
        );
      } else {
        // Old messages reloaded from IndexedDB — mark as bootstrapped so we
        // don't overwrite them.
        bootstrappedRef.current = true;
      }
    }, [isLoading, messages.length, startFreshConversation, config.greetingMessage]);

    const resetChat = useCallback(async () => {
      bootstrappedRef.current = false;
      await clearConversation();
    }, [clearConversation]);

    useImperativeHandle(ref, () => ({
      clearConversation: resetChat,
    }));

    // ── Message handler ───────────────────────────────────────────────────────
    // tagMeta is populated when the message originates from a tag click.
    const handleSendMessage = useCallback(
      async (content: string, tagMeta?: TagItem) => {
        // Add the user bubble immediately
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
            // Pass the tag action/categoryId so the resolver can branch correctly
            tagMeta
              ? {
                  action: tagMeta.action,
                  categoryId: tagMeta.categoryId,
                  name: tagMeta.name,
                }
              : undefined,
          );

          handleBotResponse(response);
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'An error occurred.';
          console.error('[Chatbot] Message error:', errorMessage);
          setError(errorMessage);
          handleBotResponse({
            answer: config.fallbackMessage,
            products: [],
            success: false,
            tags: buildInitialGreetingTags(),
          });
        } finally {
          handleTyping(false);
        }
      },
      [
        addMessage,
        handleTyping,
        handleBotResponse,
        setError,
        conversationKey,
        config.shopId,
        config.fallbackMessage,
      ],
    );

    // Tags shown after the last bot message
    const lastMessage = messages[messages.length - 1];
    const tagsToShow: TagItem[] =
      lastMessage?.type === 'bot' ? (lastMessage.tags ?? []) : [];

    return (
      <div className="chat-body-container">
        <MessageList
          messages={messages}
          isTyping={isTyping}
          onProductAddToCart={async () => {}}
          tags={tagsToShow}
          handleSendMessage={handleSendMessage}
        />

        {/* <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} /> */}
      </div>
    );
  },
);

export default memo(ChatBody);
