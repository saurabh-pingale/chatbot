import { memo } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { IMAGE } from '../../constants/colors';
import './ChatbotToggle.scss';

interface ChatbotToggleProps {
  isOpen: boolean;
  storeImage: string;
  primaryColor: string;
  onClick: () => void;
}

// Define a type for style objects that can include CSS custom properties
interface StyleWithCustomProps extends CSSProperties {
  '--theme-primary-color'?: string;
  '--theme-primary-color-rgb'?: string; 
}

const toggleAnimation = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0, opacity: 0 },
  transition: {
    type: 'spring',
    stiffness: 260,
    damping: 20
  }
};

const iconAnimation = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit: { scale: 0, opacity: 0 },
  transition: {
    type: 'spring',
    stiffness: 300,
    damping: 25
  }
};

export const ChatbotToggle = memo<ChatbotToggleProps>(({ 
  isOpen,
  storeImage,
  primaryColor,
  onClick 
}) => {

  const toggleStyles: StyleWithCustomProps = {
    '--theme-primary-color': primaryColor,
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
          src={storeImage || IMAGE.FALLBACK}
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