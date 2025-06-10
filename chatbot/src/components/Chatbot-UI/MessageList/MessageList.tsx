import { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Message } from '../Message/Message';
import type { MessageListProps } from '../../../types';
import { messageListVariants } from '../../../styles/variants';
import { TypingIndicator } from '../../TypingIndicator/TypingIndicator';
import './MessageList.scss';

export const MessageList = memo<MessageListProps>(({ 
  messages,
  isTyping,
  primaryColor,
  onProductAddToCart
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (containerRef.current) {
      const { scrollHeight, clientHeight } = containerRef.current;
      containerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isTyping]);

  return (
    <div ref={containerRef} className="message-list-container">
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
            onProductAddToCart={onProductAddToCart}
            ref={index === messages.length - 1 ? lastMessageRef : null}
          />
        ))}
          {isTyping && (
            <TypingIndicator primaryColor={primaryColor} />
          )}
      </motion.div>
    </div>
  );
}); 