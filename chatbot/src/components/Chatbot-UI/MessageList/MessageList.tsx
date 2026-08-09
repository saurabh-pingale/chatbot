import { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

import { Message } from '../Message/Message';
import { TypingIndicator } from '../../TypingIndicator/TypingIndicator';
import type { MessageListProps } from '../../../types';
import { messageListVariants } from '../../../styles/variants';
import './MessageList.scss';

export const MessageList = memo<MessageListProps>(({ 
  messages,
  isTyping,
  onProductAddToCart,
  tags,
  handleSendMessage
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

  // Forward both the display name and the full TagItem so ChatBody can
  // pass action/categoryId to the resolver.
  const handleTagClick = (tagName: string) => {
    const tagItem = tags.find((t) => t.name === tagName);
    handleSendMessage(tagName, tagItem);
  };

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
            onProductAddToCart={onProductAddToCart}
            onMessageHeightChange={scrollToBottom}
            ref={index === messages.length - 1 ? lastMessageRef : null}
            showTagsAfterMessage={index === messages.length - 1 && tags.length > 0}
            tags={tags}
            onTagClick={handleTagClick}
          />
        ))}

        {isTyping && <TypingIndicator />}
      </motion.div>
    </div>
  );
}); 