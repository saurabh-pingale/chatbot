import { memo } from 'react';
import { motion } from 'framer-motion';

import { useConfig } from '../../../context/ConfigContext';
import { CHATBOT_LOGO_DATA_URI } from '../../../assets/ChatbotLogo';
import { ChatbotLogo } from '../../../assets/ChatbotLogo';
import { IMAGE } from '../../../constants/image';
import type { ChatbotToggleProps, StyleWithCustomProps } from '../../../types';
import { iconAnimation, toggleAnimation } from '../../../styles/animations';
import './ChatbotToggle.scss';

export const ChatbotToggle = memo<ChatbotToggleProps>(({ 
  isOpen,
  onClick 
}) => {
  const config = useConfig();
  const logoSrc = config.logoUrl || config.storeImage || CHATBOT_LOGO_DATA_URI;
  const useInlineLogo = logoSrc.startsWith('data:image/svg');

  const toggleStyles: StyleWithCustomProps = {
    '--theme-primary-color': config.primaryColor,
  };

  return (
    <motion.button
      className="chatbot-toggle-container"
      style={toggleStyles} 
      onClick={onClick}
      {...toggleAnimation}
    >
      <motion.div
        className="chatbot-toggle-logo"
        initial="initial"
        animate={isOpen ? "exit" : "animate"}
        exit="exit"
        variants={iconAnimation}
      >
        {useInlineLogo ? (
          <ChatbotLogo size={32} variant="icon" />
        ) : (
          <img
            src={logoSrc}
            alt={config.headerTitle}
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src = CHATBOT_LOGO_DATA_URI;
            }}
          />
        )}
      </motion.div>
      <motion.div
        className="chatbot-toggle-close-icon"
        initial="initial"
        animate={isOpen ? "animate" : "exit"}
        exit="exit"
        variants={iconAnimation}
        dangerouslySetInnerHTML={{ __html: IMAGE.CLOSE_ICON }}
      />
    </motion.button>
  );
});

ChatbotToggle.displayName = 'ChatbotToggle';
