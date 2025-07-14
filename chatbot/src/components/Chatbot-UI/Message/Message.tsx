import { memo, forwardRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatMessage } from '../../../utils/utils';
import type { MessageProps, ProductType } from '../../../types';
import { messageAnimation } from '../../../styles/animations';
import { ProductSlider } from '../../ProductSlider/ProductSlider';
import './Message.scss';

export interface ExtendedMessageProps extends MessageProps {
  onProductAddToCart?: (product: ProductType) => Promise<void>;
}

// TODO: Use typing loader if possible by replacing it
const LoaderBetween = ({ primaryColor }: { primaryColor?: string }) => (
  <div className="message-loader-between" style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
    <span
      className="loader-dot"
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: primaryColor || '#ccc',
        animation: 'loader-bounce 0.7s infinite alternate'
      }}
    />
    <style>
      {`
        @keyframes loader-bounce {
          0% { transform: translateY(0); opacity: 0.7; }
          100% { transform: translateY(-8px); opacity: 1; }
        }
      `}
    </style>
  </div>
);

export const Message = memo(forwardRef<HTMLDivElement, ExtendedMessageProps>(({
  message,
  primaryColor,
  onProductAddToCart
}, ref) => {
  const isUser = message.type === 'user';
  const formattedContent = formatMessage(message.content, message.type);
  const TIMEOUT_DELAY = 1000
  // Use Record<string, string> to allow custom CSS property
  const bubbleStyles: React.CSSProperties & Record<string, string> = {};
  if (isUser && primaryColor) {
    bubbleStyles['--theme-primary-color'] = primaryColor;
  }

  // State to control how many message parts are shown
  const [visibleCount, setVisibleCount] = useState(1);
  const [showLoader, setShowLoader] = useState(formattedContent.length > 1);

  useEffect(() => {
    if (formattedContent.length <= 1) {
      setVisibleCount(1);
      setShowLoader(false);
      return;
    }

    let isMounted = true;
    let current = 1;

    setVisibleCount(1);
    setShowLoader(formattedContent.length > 1);

    function showNext() {
      if (!isMounted) return;
      if (current < formattedContent.length) {
        setShowLoader(true);
        setTimeout(() => {
          if (!isMounted) return;
          setVisibleCount(current + 1);
          current += 1;
          if (current < formattedContent.length) {
            setShowLoader(true);
            setTimeout(showNext, 200);
          } else {
            setShowLoader(false);
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
  for (let i = 0; i < formattedContent.length; i++) {
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
      i < formattedContent.length - 1 &&
      visibleCount === i + 1 &&
      showLoader
    ) {
      interleavedContent.push(
        <LoaderBetween key={`loader-${i}`} primaryColor={primaryColor} />
      );
      break; // Only one loader at a time
    }
  }

  return formattedContent.length ? (
    <motion.div
      ref={ref}
      className={`message-wrapper ${isUser ? 'is-user' : ''}`}
      {...messageAnimation}
    >
      {interleavedContent}

      {message.type === 'bot' && message.products && message.products.length > 0 && (
        <div className="product-slider-message-container">
          <ProductSlider
            products={message.products}
            primaryColor={primaryColor}
            onAddToCart={onProductAddToCart}
          />
        </div>
      )}
    </motion.div>
  ) : null;
}));