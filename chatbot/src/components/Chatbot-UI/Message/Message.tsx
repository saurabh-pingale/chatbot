import { memo, forwardRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { messageAnimation } from '../../../styles/animations';
import { ProductSlider } from '../../ProductSlider/ProductSlider';
import { TypingIndicator } from '../../TypingIndicator/TypingIndicator';
import { formatMessage } from '../../../utils/utils';
import type { MessageProps, ProductType } from '../../../types';
import './Message.scss';

export interface ExtendedMessageProps extends MessageProps {
  onProductAddToCart?: (product: ProductType) => Promise<void>;
}

export const Message = memo(forwardRef<HTMLDivElement, ExtendedMessageProps>(({
  message,
  primaryColor,
  onProductAddToCart
}, ref) => {
  const isUser = message.type === 'user';
  const formattedContent = formatMessage(message.content, message.type);
  const TIMEOUT_DELAY = 1000
  const hasMultipleSegments = formattedContent.length;
  
  const bubbleStyles: React.CSSProperties & Record<string, string> = {};
  if (isUser && primaryColor) {
    bubbleStyles['--theme-primary-color'] = primaryColor;
  }

  // State to control how many message parts are shown
  const [visibleCount, setVisibleCount] = useState(1);
  const [showLoader, setShowLoader] = useState(hasMultipleSegments > 1);
  const [showProductSlider, setShowProductSlider] = useState(false);

  useEffect(() => {
    if (hasMultipleSegments <= 1) {
      setVisibleCount(1);
      setShowLoader(false);
      setShowProductSlider(hasMultipleSegments <= 1);
      return;
    }

    let isMounted = true;
    let current = 1;

    setVisibleCount(1);
    setShowLoader(hasMultipleSegments > 1);

    function showNext() {
      if (!isMounted) return;
      if (current < hasMultipleSegments) {
        setShowLoader(true);
        setTimeout(() => {
          if (!isMounted) return;
          setVisibleCount(current + 1);
          current += 1;
          if (current < hasMultipleSegments) {
            setShowLoader(true);
            setTimeout(showNext, 200);
          } else {
            setShowLoader(false);
            setShowProductSlider(true);
          }
        }, TIMEOUT_DELAY);
      } else {
        setShowLoader(false);
      }
    }

    setTimeout(showNext, TIMEOUT_DELAY);

    return () => {
      isMounted = false;
    };
    // Only run when message changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.content, message.type]);

  // Interleave loader between each message part, loader only visible if next part is not yet shown
  const interleavedContent: React.ReactNode[] = [];
  for (let i = 0; i < hasMultipleSegments; i++) {
    // Only show up to visibleCount
    if (i < visibleCount) {
      interleavedContent.push(
        <article key={`msg-${i}`} className='message-list'>
          <div
            className={`message-bubble ${isUser ? 'is-user' : ''}`}
            style={bubbleStyles}
            dangerouslySetInnerHTML={{ __html: formattedContent[i] }}
          />
        </article>
      );
    }
    // Show loader if this is not the last message and the next message is not yet visible
    if (
      i < hasMultipleSegments - 1 &&
      visibleCount === i + 1 &&
      showLoader
    ) {
      interleavedContent.push(
        <div style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
          <TypingIndicator key={`loader-${i}`} primaryColor={primaryColor} />
        </div>
      );
      break; // Only one loader at a time
    }
  }

  return hasMultipleSegments ? (
    <motion.div
      ref={ref}
      className={`message-wrapper ${isUser ? 'is-user' : ''}`}
      {...messageAnimation}
    >
      {interleavedContent}

      {message.type === 'bot' && message.products && message.products.length > 0 && showProductSlider && (
        <motion.div
          className="product-slider-message-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <ProductSlider
            products={message.products}
            primaryColor={primaryColor}
            onAddToCart={onProductAddToCart}
          />
        </motion.div>
      )}
    </motion.div>
  ) : null;
}));