import { memo, useEffect, useRef } from 'react';
import type { CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Message as MessageType } from '../../types';
import { Message } from '../Message/Message';
import './MessageList.scss';

interface MessageListProps {
  messages: MessageType[];
  isTyping: boolean;
  primaryColor: string;
}

interface StyleWithCustomProps extends CSSProperties {
  '--theme-primary-color'?: string;
}

const typingAnimation = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 10 },
  transition: { duration: 0.2 }
};

const dotVariants = {
  animate: {
    y: [0, -8, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatType: 'loop' as const,
    }
  }
};

const messageListVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export const MessageList = memo<MessageListProps>(({ 
  messages,
  isTyping,
  primaryColor 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  console.log('[MessageList] Received isTyping prop:', isTyping);

  useEffect(() => {
    const scrollToBottom = () => {
      if (containerRef.current) {
        const { scrollHeight, clientHeight } = containerRef.current;
        containerRef.current.scrollTo({
          top: scrollHeight - clientHeight,
          behavior: 'smooth'
        });
      }
    };

    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isTyping]);

  const typingIndicatorStyles: StyleWithCustomProps = {
    '--theme-primary-color': primaryColor,
  };

  return (
    <div ref={containerRef} className="message-list-container">
      <AnimatePresence initial={false}>
        <motion.div
          className="message-list-messages-wrapper"
          variants={messageListVariants}
          initial="initial"
          animate="animate"
        >
          {messages.map((message, index) => (
            <Message
              key={message.id}
              message={message}
              primaryColor={primaryColor}
              ref={index === messages.length - 1 ? lastMessageRef : null}
            />
          ))}
          {isTyping && (
            <motion.div
              className="message-list-typing-indicator"
              key="typing"
              style={typingIndicatorStyles}
              variants={typingAnimation}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <motion.div className="message-list-typing-dot" variants={dotVariants} animate="animate" style={{transitionDelay: '0s'}} />
              <motion.div className="message-list-typing-dot" variants={dotVariants} animate="animate" style={{transitionDelay: '0.2s'}} />
              <motion.div className="message-list-typing-dot" variants={dotVariants} animate="animate" style={{transitionDelay: '0.4s'}} />
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}); 