import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { formatMessage } from '../../utils/utils';
import type { MessageProps, ProductType } from '../../types';
import { messageAnimation } from '../../styles/animations';
import { ProductSlider } from '../ProductSlider/ProductSlider';
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
  const formattedContent = formatMessage(message.content);

  const bubbleStyles: React.CSSProperties = {};
  if (isUser && primaryColor) {
    (bubbleStyles as any)['--theme-primary-color'] = primaryColor;
  }

  return (
    <motion.div
      ref={ref}
      className={`message-wrapper ${isUser ? 'is-user' : ''}`}
      {...messageAnimation}
    >
      <div 
        className={`message-bubble ${isUser ? 'is-user' : ''}`}
        style={bubbleStyles}
        dangerouslySetInnerHTML={{ __html: formattedContent }}
      />
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
  );
}));