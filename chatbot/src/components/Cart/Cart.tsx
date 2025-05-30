import { memo } from 'react';
import type { CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CartItem } from '../../types';
import './Cart.scss';

// Define a type for style objects that can include CSS custom properties
interface StyleWithCustomProps extends CSSProperties {
  '--theme-primary-color'?: string;
  '--theme-primary-color-rgb'?: string;
}

interface CartProps {
  isOpen: boolean;
  items: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => Promise<void>;
  onCheckout: () => Promise<void>;
  primaryColor: string;
}

const cartAnimation = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: '100%', opacity: 0 },
  transition: {
    type: 'spring',
    stiffness: 300,
    damping: 30
  }
};

const hexToRgbArray = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
};

export const Cart = memo<CartProps>(({
  isOpen,
  items,
  onClose,
  onUpdateQuantity,
  onCheckout,
  primaryColor
}) => {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const primaryColorRgb = hexToRgbArray(primaryColor);
  const dynamicStyles: StyleWithCustomProps = {
    '--theme-primary-color': primaryColor,
  };

  if (primaryColorRgb) {
    dynamicStyles['--theme-primary-color-rgb'] = primaryColorRgb.join(', ');
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="cart-container"
          style={dynamicStyles}
          {...cartAnimation}
        >
          <div className="cart-header">
            <h3 className="cart-title">Shopping Cart</h3>
            <motion.button
              className="cart-close-button"
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <svg viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
            </motion.button>
          </div>
          <div className="cart-content">
            {items.length === 0 ? (
              <p className="cart-empty-message">Your cart is empty</p>
            ) : (
              items.map((item) => (
                <div className="cart-item-container" key={item.id}>
                  <img src={item.image} alt={item.title} className="cart-item-image" />
                  <div className="cart-item-details">
                    <h4 className="cart-item-name">{item.title}</h4>
                    <p className="cart-item-price">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="cart-quantity-controls">
                    <motion.button
                      className="cart-quantity-button"
                      style={dynamicStyles} 
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      -
                    </motion.button>
                    <span className="cart-quantity">{item.quantity}</span>
                    <motion.button
                      className="cart-quantity-button"
                      style={dynamicStyles} 
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      +
                    </motion.button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="cart-footer">
            <div className="cart-total">
              <span className="cart-total-label">Total</span>
              <span className="cart-total-amount">${total.toFixed(2)}</span>
            </div>
            <motion.button
              className="cart-checkout-button"
              style={dynamicStyles} 
              onClick={onCheckout}
              disabled={items.length === 0}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Checkout
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}); 