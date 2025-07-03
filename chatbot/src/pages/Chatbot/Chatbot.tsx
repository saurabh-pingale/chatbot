import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChatBody from '../../components/Chatbot-UI/ChatBody/ChatBody';
import { ChatHeader } from '../../components/Chatbot-UI/ChatHeader/ChatHeader';
import { ChatbotToggle } from '../../components/Chatbot-UI/ChatbotToggle/ChatbotToggle';
import { EmailGate } from '../EmailGate/EmailGate';
import { ErrorPopup } from '../../components/ErrorPopup/ErrorPopup';
import { useChat } from '../../hooks/useChat';
import { useCart } from '../../context/CartContext';
import { getAuthToken, setAuthToken } from '../../utils/auth';
import { getStoredUtmParameters } from '../../utils/utm';
import {
  initiateUserSession,
  sendAgentMessage,
  getLocationInfo,
  getIpAddress,
  getShopOfferTags
} from '../../services/chat';
import { hexToRgbArray } from '../../utils/utils';
import type { ChatbotProps, StyleWithCustomProps, LocationInfo, Message } from '../../types';
import { chatAnimation } from '../../styles/animations';
import './Chatbot.scss';
import { NotificationPopup } from '../../components/NotificationPopup/NotificationPopup';

export const Chatbot = memo<ChatbotProps>(({ config, quickReplies }) => {
  const STATIC_BOT_GREETING = "I'm an AI assistant. How can I help you 😊?";
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [capturedLocationInfo, setCapturedLocationInfo] = useState<LocationInfo | null>(null);  
  const [isOffersPopupOpen, setIsOffersPopupOpen] = useState(false);
  const [offerTagsList, setOfferTagsList] = useState<string[]>([]); 
  const [isEmailGateVisible, setIsEmailGateVisible] = useState(false);
  const [chatLimitReached, setChatLimitReached] = useState(false);
  const [hasShownStaticMessage, setHasShownStaticMessage] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationTimeout, setNotificationTimeout] = useState<NodeJS.Timeout | null>(null);

  const isMobile = window.innerWidth <= 768;

  const { cartItems, toggleCart } = useCart();
  const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const { messages, isTyping, addMessage, handleBotResponse, setMessages } = useChat();
  const storefrontAccessToken = import.meta.env.VITE_STOREFRONT_ACCESS_TOKEN || "";

  useEffect(() => {
    const tokenFromStorage = getAuthToken();
    setJwtToken(tokenFromStorage);

    const hasViewedEmailGate = sessionStorage.getItem('sessionViewedEmailGate');

    if (config?.showEmailGate && !tokenFromStorage && !hasViewedEmailGate) {
      setIsEmailGateVisible(true);
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

  useEffect(() => {
    if (
      isOpen &&
      !isEmailGateVisible && 
      !hasShownStaticMessage
    ) {
      const timeoutId = setTimeout(() => {
        addMessage(STATIC_BOT_GREETING, 'bot');
        setHasShownStaticMessage(true);
      }, 1000);
    
      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, isEmailGateVisible, hasShownStaticMessage, addMessage]);

  useEffect(() => {
  if (!isOpen) {
    const notificationShown = sessionStorage.getItem('notificationShown');
    
    if (!notificationShown) {
      const timeout = setTimeout(() => {
        setShowNotification(true);
        sessionStorage.setItem('notificationShown', 'true');
      }, 2000); 
      
      setNotificationTimeout(timeout);
    }
  } else {
    setShowNotification(false);
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }
  }

  return () => {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
    }
  };
}, [isOpen]);

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
      } else {
        setError("Failed to initiate session. Please try again.");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unknown error occurred during session initiation.";
      setError(errorMessage);
    }
  };

  const handleEmailGateSkip = async () => {
    setIsEmailGateVisible(false);
    setJwtToken(null); 
    sessionStorage.setItem('sessionViewedEmailGate', 'true');
  };

  const handleSendMessage = async (content: string) => {
    const isChatAllowed = jwtToken || !config.showEmailGate;

    if (!isChatAllowed && isEmailGateVisible) {
      setError('Please provide your email to start chatting.');
      return;
    }
    
    if (!isChatAllowed && !config.allowGuestMode) { 
      setError('Authentication is required to send messages.');
      setIsEmailGateVisible(true);
      return;
    }

    addMessage(content, 'user');

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

  const handleClearConversation = useCallback(() => {
    setMessages([]);
    setHasShownStaticMessage(false);
    setChatLimitReached(false);
  }, [isOpen, isEmailGateVisible, addMessage]);

  const conversationMessagesCount = messages.length;
  const showClearConversationIcon = (conversationMessagesCount >= 4) && !isEmailGateVisible;

  return (
    <>
      {(!isOpen || !isMobile) && (
        <ChatbotToggle
          isOpen={isOpen}
          storeImage={config.storeImage}
          primaryColor={config.primaryColor}
          onClick={handleToggle}
        />
      )}
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
              isOffersPopupOpen={isOffersPopupOpen}
              onCloseOffers={handleCloseOffers}
              offerTags={offerTagsList}
              onOfferClick={handleOfferClick}
              onClearConversation={handleClearConversation}
              showClearConversationIcon={showClearConversationIcon}
              onMinimize={handleToggle}
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
                  jwtToken={jwtToken}
                  isEmailGateVisible={isEmailGateVisible}
                  handleError={handleError}
                  isChatLimitReached={chatLimitReached}
                  quickReplies={quickReplies}
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
      <NotificationPopup 
        isVisible={showNotification} 
        onClose={() => setShowNotification(false)}
      />
    </>
  );
}); 