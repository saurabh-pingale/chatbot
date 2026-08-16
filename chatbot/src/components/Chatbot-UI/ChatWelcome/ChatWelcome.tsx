import { memo } from 'react';
import { motion } from 'framer-motion';

import { ChatbotLogo } from '../../../assets/ChatbotLogo';
import { useConfig } from '../../../context/ConfigContext';
import type { StyleWithCustomProps } from '../../../types';
import './ChatWelcome.scss';

interface ChatWelcomeProps {
  onStart: () => void;
}

export const ChatWelcome = memo(({ onStart }: ChatWelcomeProps) => {
  const config = useConfig();

  const styles: StyleWithCustomProps = {
    '--theme-primary-color': config.primaryColor,
  };

  return (
    <motion.div
      className="chat-welcome-container"
      style={styles}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
    >
      <div className="chat-welcome-logo">
        <ChatbotLogo size={48} variant="badge" />
      </div>
      <button
        type="button"
        className="chat-welcome-button"
        onClick={onStart}
      >
        {config.helloButtonLabel}
      </button>
    </motion.div>
  );
});

ChatWelcome.displayName = 'ChatWelcome';
