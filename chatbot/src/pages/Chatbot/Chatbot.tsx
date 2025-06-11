import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatBody from '../../components/Chatbot-UI/ChatBody/ChatBody';
import { ChatHeader } from '../../components/Chatbot-UI/ChatHeader/ChatHeader';
import { ChatbotToggle } from '../../components/Chatbot-UI/ChatbotToggle/ChatbotToggle';
import { EmailGate } from '../EmailGate/EmailGate';
import { ErrorPopup } from '../../components/ErrorPopup/ErrorPopup';
import { useChat } from '../../hooks/useChat';
import { useCart } from '../../hooks/useCart';
import { getAuthToken, setAuthToken } from '../../utils/auth';
import { getStoredUtmParameters } from '../../utils/utm';
import { initiateUserSession, sendAgentMessage, getLocationInfo, getIpAddress, getShopOfferTags, trackEvent } from '../../services/chat';
import { hexToRgbArray } from '../../utils/utils';
import type { ChatbotProps, StyleWithCustomProps, LocationInfo, Message } from '../../types';
import { chatAnimation } from '../../styles/animations';
import './Chatbot.scss';

export const Chatbot = memo<ChatbotProps>(({ config }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [capturedLocationInfo, setCapturedLocationInfo] = useState<LocationInfo | null>(null);  
  const [isOffersPopupOpen, setIsOffersPopupOpen] = useState(false);
  const [offerTagsList, setOfferTagsList] = useState<string[]>([]); 
  const [isEmailGateVisible, setIsEmailGateVisible] = useState(false);
  const [chatLimitReached, setChatLimitReached] = useState(false);

  const { cartItems, isCartOpen, updateQuantity, toggleCart } = useCart();
  const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const { messages, isTyping, addMessage, handleBotResponse } = useChat();
  const storefrontAccessToken = import.meta.env.VITE_STOREFRONT_ACCESS_TOKEN || "";

  useEffect(() => {
    const tokenFromStorage = getAuthToken();
    setJwtToken(tokenFromStorage);

    if (config?.showEmailGate) {
      setIsEmailGateVisible(!tokenFromStorage);
    } else {
      setIsEmailGateVisible(false);
    }
  }, [config?.showEmailGate]);

  const captureLocation = async () => {
    try {
      const ip = await getIpAddress();
      const ipLocation = await getLocationInfo(ip);

      const location: LocationInfo = {
        ip: ip,
        country: ipLocation?.country || null,
        city: ipLocation?.city || null,
        region: ipLocation?.region || null,
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
  };

  const handleEmailGateSubmit = async (email: string) => {
    try {
      setError(null);
      const utmParams = getStoredUtmParameters();
      const response = await initiateUserSession({
        email,
        shopId: config.shopId,
        utm_params: utmParams,
      });

      if (response.token) {
        setAuthToken(response.token);
        setJwtToken(response.token);
        setIsEmailGateVisible(false);
        trackEvent('email_gate_submitted', { email });
      } else {
        setError("Failed to initiate session. Please try again.");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during session initiation.';
      setError(errorMessage);
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
      
      if (response.limit_reached) {
        setChatLimitReached(true);
      }
      
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

  const handleError = (error: string) => {
    setError(error);
  }

  const primaryColorRgb = hexToRgbArray(config.primaryColor);
  const chatbotContainerStyles: StyleWithCustomProps = {
    '--theme-primary-color': config.primaryColor,
  };

  if (primaryColorRgb) {
    chatbotContainerStyles['--theme-primary-color-rgb'] = primaryColorRgb.join(', ');
  }

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
    window.open(offerUrl, '_blank');
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
              showCartIcon={!isEmailGateVisible}
              onToggleOffers={handleOpenOffers}
              showOffersIcon={!isEmailGateVisible}
            />
            <div className="chatbot-content">
              {isEmailGateVisible ? (
                <EmailGate
                  config={config}
                  onSubmit={handleEmailGateSubmit}
                  onSkip={handleEmailGateSkip}
                />
              ) : (
                <ChatBody
                  messages={messages}
                  isTyping={isTyping}
                  config={config}
                  handleSendMessage={handleSendMessage}
                  isCartOpen={isCartOpen}
                  cartItems={cartItems}
                  toggleCart={toggleCart}
                  updateQuantity={updateQuantity}
                  isOffersPopupOpen={isOffersPopupOpen}
                  offerTagsList={offerTagsList}
                  handleCloseOffers={handleCloseOffers}
                  handleOfferClick={handleOfferClick}
                  jwtToken={jwtToken}
                  isEmailGateVisible={isEmailGateVisible}
                  handleError={handleError}
                  isChatLimitReached={chatLimitReached}
                />
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