import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import ChatBody from '../../components/Chatbot-UI/ChatBody/ChatBody';
import { ChatHeader } from '../../components/Chatbot-UI/ChatHeader/ChatHeader';
import { ChatbotToggle } from '../../components/Chatbot-UI/ChatbotToggle/ChatbotToggle';
import { EmailGate } from '../EmailGate/EmailGate';
import { ErrorPopup } from '../../components/ErrorPopup/ErrorPopup';
import { useCart } from '../../context/CartContext';
import { useConfig } from '../../context/ConfigContext';    
import { getAuthToken } from '../../utils/auth';
import { hexToRgbArray } from '../../utils/utils';
import type { StyleWithCustomProps, LocationInfo, ChatBodyHandle } from '../../types';
import { chatAnimation } from '../../styles/animations';
import './Chatbot.scss';

export const Chatbot = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jwtToken, setJwtToken] = useState<string | null>(() => getAuthToken());
  const [capturedLocationInfo, setCapturedLocationInfo] = useState<LocationInfo | null>(null);
  const [showEmailGate, setShowEmailGate] = useState(false);
  const [messagesCount, setMessagesCount] = useState(0);
  
  const config = useConfig(); 
  const chatBodyRef = useRef<ChatBodyHandle>(null);
  const isMobile = window.innerWidth <= 768;

  const { cartItems, toggleCart, isCartSyncing } = useCart();
  const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const token = getAuthToken();
    const hasViewedEmailGate = sessionStorage.getItem('sessionViewedEmailGate');
    if (config?.showEmailGate && !token && !hasViewedEmailGate) {
      setShowEmailGate(true);
    }
  }, [config?.showEmailGate]);

  const handleToggle = () => setIsOpen(prev => !prev);

  const handleAuthSuccess = (token: string, locationInfo: LocationInfo | null) => {
    setJwtToken(token);
    setCapturedLocationInfo(locationInfo);
    setShowEmailGate(false);
  };

  const handleAuthSkip = () => {
    setJwtToken(null);
    setShowEmailGate(false);
  };

  const handleError = (error: string | null) => setError(error);

  const handleClearConversation = useCallback(() => {
    chatBodyRef.current?.clearConversation();
  }, []);
  
  const primaryColorRgb = hexToRgbArray(config.primaryColor);
  const chatbotContainerStyles: StyleWithCustomProps = {
    '--theme-primary-color': config.primaryColor,
    ...(primaryColorRgb && { '--theme-primary-color-rgb': primaryColorRgb.join(', ') }),
  };

  return (
    <>
      {(!isOpen || !isMobile) && (
        <ChatbotToggle
          isOpen={isOpen}
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
              onToggleCart={toggleCart}
              cartItemCount={totalCartItems}
              onClearConversation={handleClearConversation}
              onMinimize={handleToggle}
              isCartSyncing={isCartSyncing}
              setError={setError}
              isEmailGateVisible={showEmailGate}
              messagesCount={messagesCount}
            />
            <div className="chatbot-content">
              {showEmailGate ? (
                <EmailGate
                  onSuccess={handleAuthSuccess}
                  onSkip={handleAuthSkip}
                />
              ) : (
                <ChatBody
                  ref={chatBodyRef}
                  jwtToken={jwtToken}
                  capturedLocationInfo={capturedLocationInfo}
                  setError={handleError}
                  isEmailGateVisible={showEmailGate}
                  onMessagesCountChange={setMessagesCount}
                />
              )}
              {error && (
                <ErrorPopup message={error} onClose={() => setError(null)} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});