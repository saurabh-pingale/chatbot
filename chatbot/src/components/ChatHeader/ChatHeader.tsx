import { memo } from 'react';
import { motion } from 'framer-motion';
import { hexToRgbArray } from '../../utils/utils';
import { CartIconSVG } from '../../assets/cart_icon';
import type { ChatHeaderProps, StyleWithCustomProps } from '../../types';
import './ChatHeader.scss';

export const ChatHeader = memo<ChatHeaderProps>(({ 
  storeImage,
  onToggleCart,
  cartItemCount,
  primaryColor,
  showCartIcon 
}) => {

  const primaryColorRgb = hexToRgbArray(primaryColor);
  const headerStyles: StyleWithCustomProps = {
    '--theme-primary-color': primaryColor,
  };
  if (primaryColorRgb) {
    headerStyles['--theme-primary-color-rgb'] = primaryColorRgb.join(', ');
  }

  return (
    <div className="chat-header-container" style={headerStyles}>
      <div className="chat-header-left-section">
        <div className="chat-header-logo">
          <img
            src={storeImage}
            alt="Store Logo"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src = storeImage;
            }}
          />
        </div>
        <h2 className="chat-header-title">Store Assistant</h2>
      </div>
      <div className="chat-header-right-section">
        {showCartIcon && (
          <motion.div 
            className="chat-header-cart-icon-wrapper"
            onClick={onToggleCart}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <CartIconSVG />
            {cartItemCount > 0 && (
              <motion.span 
                className="chat-header-cart-count-badge"
                style={headerStyles}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                {cartItemCount}
              </motion.span>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}); 