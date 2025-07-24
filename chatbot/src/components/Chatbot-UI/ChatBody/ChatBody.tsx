import { memo, useState, useEffect, forwardRef, useImperativeHandle, useCallback, useRef } from 'react';
import { useChat } from '../../../hooks/useChat';
import { useCart } from '../../../context/CartContext';
import { sendAgentMessage } from '../../../services/chat';
import { getConversationKey } from '../../../services/user';
import { TAG_DICTIONARY, STATIC_BOT_GREETING, DEFAULT_TAGS } from '../../../constants/botMessages.constants';
import { MessageList } from '../MessageList/MessageList';
import { ChatInput } from '../ChatInput/ChatInput';
import { Cart } from '../../Cart-UI/Cart/Cart';
import { useConfig } from '../../../context/ConfigContext';
import type { ChatBodyHandle, ChatBodyProps, Message, ProductType, TagItem } from '../../../types';

const ChatBody = forwardRef<ChatBodyHandle, ChatBodyProps>(
  ({ jwtToken, capturedLocationInfo, setError, isEmailGateVisible, onMessagesCountChange }, ref) => {  
    const config = useConfig();
    const [conversationKey, setConversationKey] = useState<string | null>(null);
    const [chatLimitReached, setChatLimitReached] = useState(false);
    const [tags, setTags] = useState<TagItem[]>([]);
    const [showInitialTags, setShowInitialTags] = useState(false);
    const isInitialMount = useRef(true);
    
    useEffect(() => {
     setConversationKey(getConversationKey(config.shopId));
    }, [jwtToken]);

    const { messages, isTyping, isLoading, handleTyping, addMessage, handleBotResponse, clearConversation } = useChat(conversationKey);
    const { cartItems, isCartOpen, updateQuantity, toggleCart, addToCart, checkout } = useCart();

    useEffect(() => {
      onMessagesCountChange(messages.length);
    }, [messages.length, onMessagesCountChange]);

    useEffect(() => {
      if (isInitialMount.current && !isLoading && !isEmailGateVisible && messages.length === 0) {
        addMessage(STATIC_BOT_GREETING, 'bot');
        setTags(DEFAULT_TAGS);
        setShowInitialTags(true);
        isInitialMount.current = false;
      }
    }, [isLoading, isEmailGateVisible, messages.length, addMessage]);

    const resetChat = useCallback(async () => {
        await clearConversation();
        isInitialMount.current = true;
        setChatLimitReached(false);
    }, [clearConversation, addMessage]);

    useImperativeHandle(ref, () => ({
      clearConversation: resetChat,
    }));

    const formatBotTags = (tagsFromResponse: any[]) => {
      if (!tagsFromResponse || !Array.isArray(tagsFromResponse)) {
        setShowInitialTags(false);
        return;
      }
      const mappedTags: TagItem[] = tagsFromResponse.map((tag: any) => ({
        name: typeof tag === 'string' ? tag : tag.name,
        description: typeof tag === 'string' ? TAG_DICTIONARY[tag] || tag : tag.description,
      }));
      setTags(mappedTags);
      setShowInitialTags(mappedTags.length > 0);
    };

    const handleSendMessage = async (content: string) => {
      addMessage(content, 'user');
      const currentMessages: Message[] = [...messages, { id: Date.now().toString(), content, type: 'user', timestamp: new Date() }];

      handleTyping(true);
      try {
        const payloadBase: any = {
          messages: currentMessages,
          location_info: capturedLocationInfo ?? undefined,
        };
        if (jwtToken) {
          payloadBase.token = jwtToken;
        }
        const response = await sendAgentMessage(config.shopId, payloadBase);

        if (response.limit_reached) setChatLimitReached(true);
        setTimeout(() => formatBotTags(response.tags ?? []), 200);
        handleBotResponse(response);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred.';
        setError(errorMessage);
        handleBotResponse({ answer: `Sorry, an error occurred: ${errorMessage}`, products: [], success: false, error: errorMessage });
      } finally {
        handleTyping(false);
      }
    };
    
    const handleProductAddToCart = async (product: ProductType) => {
      try {
        await addToCart(product);
      } catch (err) {
        console.error("Error adding product to cart from ChatBody:", err);
        setError('Failed to add product to cart. Please try again.');
      }
    };

    return (
      <>
        <MessageList
          messages={messages}
          isTyping={isTyping}
          onProductAddToCart={handleProductAddToCart}
          tags={showInitialTags ? tags : []}
          handleSendMessage={handleSendMessage}
        />

        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isTyping || chatLimitReached}
        />

        <Cart
          isOpen={isCartOpen}
          items={cartItems}
          onClose={toggleCart}
          onUpdateQuantity={updateQuantity}
          onCheckout={checkout}
        />
      </>
    );
  }
);

export default memo(ChatBody);