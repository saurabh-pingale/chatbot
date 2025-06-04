import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hexToRgbArray } from '../../utils/utils';
import type { CartProps, StyleWithCustomProps, CartItem } from '../../types';
import { CloseIcon } from '../../assets/close_icon';
import { cartAnimation } from '../../styles/animations';
import './Cart.scss';

export const Cart = memo<CartProps>(({
  isOpen,
  items,
  onClose,
  onUpdateQuantity,
  onCheckout,
  primaryColor
}) => {
  const total = items.reduce((sum, item: CartItem) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    return sum + price * item.quantity;
  }, 0);

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
              <CloseIcon />
            </motion.button>
          </div>
          <div className="cart-content">
            {items.length === 0 ? (
              <p className="cart-empty-message">Your cart is empty</p>
            ) : (
              items.map((item: CartItem) => (
                <div className="cart-item-container" key={String(item.id)}>
                  <img src={item.image_url} alt={item.name} className="cart-item-image" />
                  <div className="cart-item-details">
                    <h4 className="cart-item-name">{item.name}</h4>
                    <p className="cart-item-price">
                      ${(typeof item.price === 'string' ? parseFloat(item.price) : item.price).toFixed(2)}
                    </p>
                  </div>
                  <div className="cart-quantity-controls">
                    <motion.button
                      className="cart-quantity-button"
                      style={dynamicStyles} 
                      onClick={() => onUpdateQuantity(String(item.id), item.quantity - 1)}
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
                      onClick={() => onUpdateQuantity(String(item.id), item.quantity + 1)}
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