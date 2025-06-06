import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatbotToggle } from '../ChatbotToggle/ChatbotToggle';
import { ChatHeader } from '../ChatHeader/ChatHeader';
import { MessageList } from '../MessageList/MessageList';
import { ChatInput } from '../ChatInput/ChatInput';
import { EmailGate } from '../EmailGate/EmailGate';
import { ErrorPopup } from '../ErrorPopup/ErrorPopup';
import { OffersPopup } from '../OffersPopup/OffersPopup';
import { DEFAULT_QUICK_REPLIES } from '../../constants/default_quick_replies';
import { Cart } from '../Cart/Cart';
import { useChat } from '../../hooks/useChat';
import { useCart } from '../../hooks/useCart';
import { trackEvent, sendAgentMessage, getLocationInfo, getIpAddress, getShopOfferTags } from '../../services/chat';
import { syncCartWithShopify } from '../../services/shopify';
import { hexToRgbArray } from '../../utils/utils';
import type { ChatbotProps, StyleWithCustomProps, ProductType, LocationInfo, Message } from '../../types';
import { chatAnimation } from '../../styles/animations';
import './Chatbot.scss';

export const Chatbot = memo<ChatbotProps>(({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [capturedLocationInfo, setCapturedLocationInfo] = useState<LocationInfo | null>(null);  
  const [isOffersPopupOpen, setIsOffersPopupOpen] = useState(false);
  const [offerTagsList, setOfferTagsList] = useState<string[]>([]); 
  const [isEmailGateVisible, setIsEmailGateVisible] = useState(() => {
    if (!config.showEmailGate) {
      return false;
    }
    return !localStorage.getItem('user_jwt_token');
  });

  const { messages, isTyping, addMessage, handleBotResponse } = useChat();
  const { cartItems, isCartOpen, updateQuantity, toggleCart, addToCart } = useCart();

  const storefrontAccessToken = import.meta.env.VITE_STOREFRONT_ACCESS_TOKEN || "";

  useEffect(() => {
    const tokenFromStorage = localStorage.getItem('user_jwt_token');
    setJwtToken(tokenFromStorage);

    if (config.showEmailGate) {
      setIsEmailGateVisible(!tokenFromStorage);
    } else {
      setIsEmailGateVisible(false);
    }
  }, [config.showEmailGate]);

  const captureLocation = async () => {
    try {
      const ip = await getIpAddress();
      const ipLocation = await getLocationInfo(ip);

      const location: LocationInfo = {
        ip: ip,
        country: ipLocation.country || null,
        city: ipLocation.city || null,
        region: ipLocation.region || null,
      };

      setCapturedLocationInfo(location);
    } catch (locError) {
      console.error('Error capturing location:', locError);
      setCapturedLocationInfo({ ip: 'unknown', country: null, city: null, region: null });
    }
  };

  useEffect(() => {
    if (jwtToken) {
      captureLocation();
    }
  }, [jwtToken]);

  const handleToggle = () => {
    setIsOpen(prev => !prev);
    if (!isOpen) {
      trackEvent('chatbot_opened');
    }
  };

  const handleEmailGateSubmit = async (email: string) => {
    const tokenFromStorage = localStorage.getItem('user_jwt_token');
    if (tokenFromStorage) {
      setJwtToken(tokenFromStorage);
      setIsEmailGateVisible(false); 
      trackEvent('email_gate_submitted', { email });
    } else {
      setError("Failed to retrieve session token after email submission. Please try again.");
    }
  };

  const handleEmailGateSkip = async () => {
    setIsEmailGateVisible(false);
    setJwtToken(null); 
    trackEvent('email_gate_skipped');
  };

  const handleSendMessage = async (content: string) => {
    if (config.showEmailGate && isEmailGateVisible) {
      setError('Please provide your email to start chatting.');
      return;
    }

    if (!jwtToken && !config.allowGuestMode) { 
      setError('Authentication is required to send messages.');
      if (config.showEmailGate) {
          setIsEmailGateVisible(true);
      }
      return;
    }

    addMessage(content, 'user');
    trackEvent('message_sent');

    const currentMessages: Message[] = [...messages, { id: Date.now().toString(), content, type: 'user', timestamp: new Date() }];

    try {
      let payloadBase: any = {
        messages: currentMessages,
        location_info: (capturedLocationInfo) ? capturedLocationInfo : undefined
      };

      if (jwtToken) {
        payloadBase.token = jwtToken;
      }
      
      const response = await sendAgentMessage(config.shopId, payloadBase as import('../../types').AgentConversationRequestPayload);
      await handleBotResponse(response);
      
      if (response.products?.length) {
        trackEvent('products_suggested', { products: response.products });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sorry, something went wrong! Please try again later.';
      setError(errorMessage);
      await handleBotResponse({
        answer: `Sorry, an error occurred: ${errorMessage}`,
        products: [],
        categories: [],
        success: false,
        error: errorMessage
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

  const showChatInterface = !isEmailGateVisible;

   const handleOpenOffers = useCallback(async () => {
    setIsOffersPopupOpen(true);

    try {
      const tags = await getShopOfferTags(config.shopId, storefrontAccessToken);
      setOfferTagsList(tags);
    } catch (err) {
      console.error('Failed to fetch offer tags on click:', err);
      setError('Could not load offers at this time. Please try again later.');
      setOfferTagsList([]);
    }
  }, [config.shopId]);

  const handleCloseOffers = useCallback(() => {
    setIsOffersPopupOpen(false);
  }, []);

  const handleOfferClick = useCallback((tag: string) => {
    const offerUrl = `https://${config.shopId}/collections/all?constraint=${encodeURIComponent(tag)}`;
    console.log(`Redirecting to offer: ${offerUrl}`)
    window.open(offerUrl, '_blank');
    setIsOffersPopupOpen(false);
  }, [config.shopId]);

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
              showCartIcon={showChatInterface}
              onToggleOffers={handleOpenOffers}
              showOffersIcon={showChatInterface}
            />
            <div className="chatbot-content">
              {!showChatInterface ? (
                <EmailGate
                  config={config}
                  onSubmit={handleEmailGateSubmit}
                  onSkip={handleEmailGateSkip}
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
                    disabled={isTyping || (!jwtToken && !config.allowGuestMode && !config.showEmailGate ) || (isEmailGateVisible && config.showEmailGate) }
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
                  <OffersPopup 
                    isOpen={isOffersPopupOpen}
                    onClose={handleCloseOffers} 
                    offerTags={offerTagsList}
                    primaryColor={config.primaryColor}
                    onOfferClick={handleOfferClick}
                    shopDomain={config.shopId} 
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