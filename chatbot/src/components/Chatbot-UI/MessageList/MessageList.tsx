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
  onProductAddToCart,
  tags,
  handleSendMessage,
  categories
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

          {!isTyping && tags && tags.length > 0 && (
            <motion.div
              className="chatbot-tags-container agent-side"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ '--theme-primary-color': primaryColor } as React.CSSProperties}
            >
              <div className="chatbot-tags vertical-tags">
                {tags.map((tag) => (
                  <button
                    key={tag.name}
                    className="chatbot-tag-button premium-tag"
                    onClick={() => handleSendMessage(tag.name)}
                    disabled={isTyping}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          
          {!isTyping && categories && categories.length > 0 && (
            <motion.div
              className="chatbot-tags-container agent-side"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ '--theme-primary-color': primaryColor } as React.CSSProperties}
            >
              <div className="chatbot-tags horizontal-categories">
                {categories.map((category) => (
                  <button
                    key={category}
                    className="chatbot-tag-button premium-tag"
                    onClick={() => handleSendMessage(category)}
                    disabled={isTyping}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
      </motion.div>
    </div>
  );
}); 