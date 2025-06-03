import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatbotToggle } from '../ChatbotToggle/ChatbotToggle';
import { ChatHeader } from '../ChatHeader/ChatHeader';
import { MessageList } from '../MessageList/MessageList';
import { ChatInput } from '../ChatInput/ChatInput';
import { EmailGate } from '../EmailGate/EmailGate';
import { ErrorPopup } from '../ErrorPopup/ErrorPopup';
import { DEFAULT_QUICK_REPLIES } from '../../constants/default_quick_replies';
import { Cart } from '../Cart/Cart';
import { useChat } from '../../hooks/useChat';
import { useCart } from '../../hooks/useCart';
import { getSessionData, initializeSession, trackEvent, sendChatMessage } from '../../services/chat';
import { syncCartWithShopify } from '../../services/shopify';
import { hexToRgbArray } from '../../utils/utils';
import type { ChatbotProps, StyleWithCustomProps, ProductType } from '../../types';
import { chatAnimation } from '../../styles/animations';
import './Chatbot.scss';

export const Chatbot = memo<ChatbotProps>(({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSubmittedEmail, setHasSubmittedEmail] = useState(() => {
    const session = getSessionData();
    return !!session?.email;
  });

  const { messages, isTyping, addMessage, handleBotResponse } = useChat();
  const { cartItems, isCartOpen, updateQuantity, toggleCart, addToCart } = useCart();

  const handleBeforeUnload = () => {
    const session = getSessionData();
    if (session) {
      const data = {
        shopId: config.shopId,
        sessionData: session
      };

      navigator.sendBeacon('/apps/chatbot-api/analytics', new Blob(
        [JSON.stringify(data)],
        { type: 'application/json' }
      ));
    }
  };

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [config.shopId]);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      trackEvent('chatbot_opened');
    }
  };

  const handleEmailSubmit = async (email: string) => {
    try {
      await initializeSession(email);
      setHasSubmittedEmail(true);
      trackEvent('email_submitted', { email });
    } catch (err) {
      setError('Failed to start chat. Please try again.');
    }
  };

  const handleEmailSkip = async () => {
    try {
      const anonymousEmail = `Anonymous_${Date.now()}`;
      await initializeSession(anonymousEmail);
      setHasSubmittedEmail(true);
      trackEvent('email_skipped');
    } catch (err) {
      setError('Failed to start chat. Please try again.');
    }
  };

  const handleSendMessage = async (content: string) => {
    addMessage(content, 'user');
    trackEvent('message_sent');

    try {
      const session = getSessionData();
      const response = await sendChatMessage(
        [...messages, { id: Date.now().toString(), content, type: 'user', timestamp: new Date() }],
        session?.email || ''
      );
      await handleBotResponse(response);
      
      if (response.products?.length) {
        trackEvent('products_suggested', { products: response.products });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sorry, something went wrong! Please try again later.';
      setError(errorMessage);
      
      await handleBotResponse({
        answer: `Sorry, an error occurred: ${errorMessage}`,
      }, 1000);
    }
  };

  const handleProductAddToCart = async (product: ProductType) => {
    try {
      await addToCart(product);
      trackEvent('product_added_to_cart_via_slider', { productId: product.id, productName: product.name });
    } catch (err) {
      console.error("Error adding product to cart from Chatbot component:", err);
      setError('Failed to add product to cart. Please try again.');
    }
  };

  const handleCheckout = async () => {
    try {
      const success = await syncCartWithShopify(cartItems);
      if (success) {
        window.location.href = '/cart';
      } else {
        throw new Error('Failed to sync cart');
      }
    } catch (err) {
      setError('An error occurred during checkout. Please try again.');
    }
  };

  const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const primaryColorRgb = hexToRgbArray(config.primaryColor);
  const chatbotContainerStyles: StyleWithCustomProps = {
    '--theme-primary-color': config.primaryColor,
  };
  if (primaryColorRgb) {
    chatbotContainerStyles['--theme-primary-color-rgb'] = primaryColorRgb.join(', ');
  }

  return (
    <>
      <ChatbotToggle
        isOpen={isOpen}
        storeImage={config.storeImage}
        primaryColor={config.primaryColor}
        onClick={handleToggle}
      />
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`chatbot-container ${isOpen ? 'open' : ''}`}
            style={chatbotContainerStyles}
            {...chatAnimation}
          >
            <ChatHeader
              storeImage={config.storeImage}
              onToggleCart={toggleCart}
              cartItemCount={totalCartItems}
              primaryColor={config.primaryColor}
              showCartIcon={hasSubmittedEmail}
            />
            <div className="chatbot-content">
              {!hasSubmittedEmail ? (
                <EmailGate
                  config={config}
                  onSubmit={handleEmailSubmit}
                  onSkip={handleEmailSkip}
                />
              ) : (
                <>
                  <MessageList
                    messages={messages}
                    isTyping={isTyping}
                    primaryColor={config.primaryColor}
                    onProductAddToCart={handleProductAddToCart}
                  />
                  <div className="chatbot-quick-replies" style={chatbotContainerStyles}>
                    {DEFAULT_QUICK_REPLIES.map((reply) => (
                      <button
                        key={reply}
                        className="chatbot-quick-reply-button"
                        onClick={() => handleSendMessage(reply)}
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={isTyping}
                    primaryColor={config.primaryColor}
                  />
                  <Cart
                    isOpen={isCartOpen}
                    items={cartItems}
                    onClose={toggleCart}
                    onUpdateQuantity={updateQuantity}
                    onCheckout={handleCheckout}
                    primaryColor={config.primaryColor}
                  />
                </>
              )}
              {error && (
                <ErrorPopup
                  message={error}
                  onClose={() => setError(null)}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}); 