import { memo, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useChat } from '../../../hooks/useChat';
import { useCart } from '../../../context/CartContext';
import { sendAgentMessage } from '../../../services/chat';
import { TAG_DICTIONARY, STATIC_BOT_GREETING } from '../../../constants/botMessages.constants';
import { MessageList } from '../MessageList/MessageList';
import { ChatInput } from '../ChatInput/ChatInput';
import { Cart } from '../../Cart-UI/Cart/Cart';
import { useConfig } from '../../../context/ConfigContext';
import type { ChatBodyHandle, ChatBodyProps, Message, ProductType, TagItem } from '../../../types';

const ChatBody = forwardRef<ChatBodyHandle, ChatBodyProps>(
  ({ jwtToken, capturedLocationInfo, setError, isEmailGateVisible, onMessagesCountChange }, ref) => {
    const { messages, isTyping, handleTyping, addMessage, handleBotResponse, setMessages } = useChat();
    const { cartItems, isCartOpen, updateQuantity, toggleCart, addToCart, checkout } = useCart();

    const config = useConfig();

    const [chatLimitReached, setChatLimitReached] = useState(false);
    const [tags, setTags] = useState<TagItem[]>([]);
    const [hasShownStaticMessage, setHasShownStaticMessage] = useState(false);
    const [showInitialTags, setShowInitialTags] = useState(false);

    useEffect(() => {
      onMessagesCountChange(messages.length);
    }, [messages.length, onMessagesCountChange]);

    const DEFAULT_TAGS: TagItem[] = Object.entries(TAG_DICTIONARY).map(([name, description]) => ({
      name,
      description,
    }));

    useEffect(() => {
      if (!isEmailGateVisible && !hasShownStaticMessage) {
        addMessage(STATIC_BOT_GREETING, 'bot');
        setHasShownStaticMessage(true);
        setTags(DEFAULT_TAGS);
        setShowInitialTags(true);
      }
    }, [isEmailGateVisible, hasShownStaticMessage, addMessage, DEFAULT_TAGS]);
    
    useImperativeHandle(ref, () => ({
      clearConversation: () => {
        setMessages([]);
        setHasShownStaticMessage(false);
        setChatLimitReached(false);
        setTags(DEFAULT_TAGS);
        setShowInitialTags(true);
      },
    }));

    const processBotTags = (tagsFromResponse: any[]) => {
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
        setTimeout(() => processBotTags(response.tags ?? []), 200);
        await handleBotResponse(response);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred.';
        setError(errorMessage);
        await handleBotResponse({ answer: `Sorry, an error occurred: ${errorMessage}`, products: [], success: false, error: errorMessage });
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