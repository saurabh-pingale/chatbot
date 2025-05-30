import { memo } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { IMAGE } from '../../constants/colors';
import './ChatHeader.scss';

interface ChatHeaderProps {
  storeImage: string;
  onToggleCart: () => void;
  cartItemCount: number; 
  primaryColor: string;
  showCartIcon?: boolean;
}

// Define a type for style objects that can include CSS custom properties
interface StyleWithCustomProps extends CSSProperties {
  '--theme-primary-color'?: string;
  '--theme-primary-color-rgb'?: string;
}

const CartIconSVG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
);

// Helper function
const hexToRgbArray = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
};

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
            src={storeImage || IMAGE.FALLBACK}
            alt="Store Logo"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src = IMAGE.FALLBACK;
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