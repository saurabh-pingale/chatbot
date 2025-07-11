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
import type { ChatbotProps, StyleWithCustomProps, LocationInfo, Message, TagItem } from '../../types';
import { chatAnimation } from '../../styles/animations';
import './Chatbot.scss';

export const Chatbot = memo<ChatbotProps>(({ config }) => {
  const STATIC_BOT_GREETING = "I'm an AI assistant. How can I help you 😊?";
  const TAG_DICTIONARY: Record<string, string> = {
    SayHi: "Say hello to the assistant",
    ReturnPolicy: "Show return policy of store",
    Recommendations: "Get me products related suggestions",
    Browsing: "Get me available product collections in store"
  };
  const DEFAULT_TAGS: TagItem[] = Object.entries(TAG_DICTIONARY).map(([name, description]) => ({
    name,
    description
  }));

  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(null);
  const [capturedLocationInfo, setCapturedLocationInfo] = useState<LocationInfo | null>(null);  
  const [isOffersPopupOpen, setIsOffersPopupOpen] = useState(false);
  const [offerTagsList, setOfferTagsList] = useState<string[]>([]); 
  const [isEmailGateVisible, setIsEmailGateVisible] = useState(false);
  const [chatLimitReached, setChatLimitReached] = useState(false);
  const [hasShownStaticMessage, setHasShownStaticMessage] = useState(false);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [showInitialTags, setShowInitialTags] = useState(false);

  const isMobile = window.innerWidth <= 768;

  const { cartItems, toggleCart } = useCart();
  const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const { messages, isTyping, addMessage, handleBotResponse, setMessages, categories, setCategories } = useChat();
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
    if (isOpen && !isEmailGateVisible && !hasShownStaticMessage) {
      const timeoutId = setTimeout(() => {
        addMessage(STATIC_BOT_GREETING, 'bot');
        setHasShownStaticMessage(true);
        setTags(DEFAULT_TAGS);
        setShowInitialTags(true);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [isOpen, isEmailGateVisible, hasShownStaticMessage, addMessage]);



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

    if (typeof content !== 'string') {
      console.error('Invalid content type sent to handleSendMessage:', content);
      return;
    }

    // const messageToSend = TAG_DICTIONARY[content] || content;
    const matchedTag = tags.find(tag => tag.name === content);
    const messageToSend = matchedTag?.description || content;

    addMessage(content, 'user');

    const currentMessages: Message[] = [
      ...messages, 
      { 
        id: Date.now().toString(), 
        content: messageToSend, 
        type: 'user',
        timestamp: new Date() 
      }
    ];

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

      setTimeout(() => {
        if (response.tags && Array.isArray(response.tags) && response.tags.length > 0) {
          const mappedTags: TagItem[] = response.tags.map((tag: any) => {
            if (typeof tag === 'string') {
              return {
                name: tag,
                description: TAG_DICTIONARY[tag] || tag,
              };
            } else if (typeof tag === 'object' && tag.name && tag.description) {
              return {
                name: tag.name,
                description: tag.description,
              };
            } else {
              console.warn('Unknown tag format:', tag);
              return { name: '', description: '' };
            }
          });

          setTags(mappedTags);
          setShowInitialTags(true);
        } else {
          setShowInitialTags(false);
        }
      }, 200);
      
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
    setTags(DEFAULT_TAGS);              
    setShowInitialTags(true); 
    setCategories([]);
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
                  tags={showInitialTags ? tags : []}
                  categories={categories}
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