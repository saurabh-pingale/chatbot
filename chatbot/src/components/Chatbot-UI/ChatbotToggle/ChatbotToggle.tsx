import { memo } from 'react';
import { motion } from 'framer-motion';
import { IMAGE } from '../../../constants/image';
import type { ChatbotToggleProps, StyleWithCustomProps } from '../../../types';
import { iconAnimation, toggleAnimation } from '../../../styles/animations';
import './ChatbotToggle.scss';
import { useConfig } from '../../../context/ConfigContext';

export const ChatbotToggle = memo<ChatbotToggleProps>(({ 
  isOpen,
  onClick 
}) => {
  const config = useConfig();

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
        <img
          src={config.storeImage || IMAGE.FALLBACK}
          alt="Store Logo"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            img.src = IMAGE.FALLBACK;
          }}
        />
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