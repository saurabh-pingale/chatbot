import { memo, forwardRef, useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';

import { messageAnimation } from '../../../styles/animations';
import { ProductSlider } from '../../ProductSlider/ProductSlider';
import { ChatbotTags } from '../ChatbotTags/ChatbotTags';
import { TypingIndicator } from '../../TypingIndicator/TypingIndicator';
import { useConfig } from '../../../context/ConfigContext';
import { formatMessage } from '../../../utils/utils';
import type { MessageProps, ProductType, TagItem } from '../../../types';
import './Message.scss';

export interface ExtendedMessageProps extends MessageProps {
  onProductAddToCart?: (product: ProductType) => Promise<void>;
  onMessageHeightChange?: () => void;
  showTagsAfterMessage?: boolean;
  tags?: TagItem[];
  onTagClick?: (tag: string) => void;
}

export const Message = memo(forwardRef<HTMLDivElement, ExtendedMessageProps>(({
  message,
  onProductAddToCart,
  onMessageHeightChange,
  showTagsAfterMessage,
  tags,
  onTagClick
}, ref) => {
  const config = useConfig();
  const isUser = message.type === 'user';
  const formattedContent = formatMessage(message.content, message.type);
  const isArrayContent = Array.isArray(formattedContent);
  const TIMEOUT_DELAY = 1000;
  const hasMultipleSegments = isArrayContent ? formattedContent.length : 0;
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const bubbleStyles: React.CSSProperties & Record<string, string> = {};
  if (isUser && config.primaryColor) {
    bubbleStyles['--theme-primary-color'] = config.primaryColor;
  }

  const [visibleCount, setVisibleCount] = useState(1);
  const [showLoader, setShowLoader] = useState(hasMultipleSegments > 1);
  const [showProductSlider, setShowProductSlider] = useState(false);

  useEffect(() => {
    if (typeof onMessageHeightChange === 'function') {
      onMessageHeightChange();
    }
  }, [visibleCount]);

  useEffect(() => {
    if (hasMultipleSegments <= 1) {
      setVisibleCount(1);
      setShowLoader(false);
      setShowProductSlider(hasMultipleSegments <= 1);
      return;
    }

    let isMounted = true;
    let current = 1;
    timeoutIdsRef.current = [];

    setVisibleCount(1);
    setShowLoader(true);

    function showNext() {
      if (!isMounted) return;

      if (current < hasMultipleSegments) {
        const nextTimeout = setTimeout(() => {
          if (!isMounted) return;

          setVisibleCount(current + 1);
          current += 1;

          if (current < hasMultipleSegments) {
            const innerTimeout = setTimeout(showNext, 200);
            timeoutIdsRef.current.push(innerTimeout);
          } else {
            setShowLoader(false);
            setShowProductSlider(true);
          }
        }, TIMEOUT_DELAY);

        timeoutIdsRef.current.push(nextTimeout);
      }
    }

    const initialTimeout = setTimeout(showNext, TIMEOUT_DELAY);
    timeoutIdsRef.current.push(initialTimeout);

    return () => {
      isMounted = false;
      timeoutIdsRef.current.forEach(clearTimeout);
    };
  }, [message.content, message.type]);

  const interleavedContent: React.ReactNode[] = [];
  for (let i = 0; i < hasMultipleSegments; i++) {
    if (i < visibleCount) {
      interleavedContent.push(
        <motion.article
          key={`msg-${i}`}
          className={`message-list ${isUser ? 'is-user' : ''}`}
          variants={messageAnimation}
          initial="hidden"
          animate="visible"
          exit="exit"
          ref={i === visibleCount - 1 ? ref : null}
        >
          <div
            className={`message-bubble ${!isUser && i === hasMultipleSegments - 1 ? 'last-bot-message' : ''}`}
            style={bubbleStyles}
            dangerouslySetInnerHTML={{ __html: formattedContent[i] }}
          />
        </motion.article>
      );
    }

    if (
      i < hasMultipleSegments - 1 &&
      visibleCount === i + 1 &&
      showLoader
    ) {
      interleavedContent.push(
        <div 
          key={`loader-${i}`}
          className={`message-list ${isUser ? 'is-user' : ''}`}
          style={{ margin: '4px 0', padding: '0 16px' }}
        >
          <TypingIndicator />
        </div>
      );
      break;
    }
  }

  return hasMultipleSegments ? (
    <>
      {interleavedContent}

      {message.type === 'bot' && Array.isArray(message.products) && message.products?.length > 0 && showProductSlider && (
        <motion.article
          className="message-list"
          initial="hidden"
          animate="visible"
          variants={messageAnimation}
          ref={ref}
        >
          <div className="product-slider-message-container">
            <ProductSlider
              products={message.products}
              onAddToCart={onProductAddToCart}
            />
          </div>
        </motion.article>
      )}

      {message.type === 'bot' && showTagsAfterMessage && !showLoader && visibleCount === hasMultipleSegments && (
        <motion.div
          className="chatbot-tags-after-message"
          initial="hidden"
          animate="visible"
          variants={messageAnimation}
        >
          <ChatbotTags
            tags={tags || []}
            isTyping={false}
            onClick={onTagClick ?? (() => {})}
          />
        </motion.div>
      )}
    </>
  ) : null
}));