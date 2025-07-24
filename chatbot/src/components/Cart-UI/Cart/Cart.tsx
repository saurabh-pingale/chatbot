import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useConfig } from '../../../context/ConfigContext';
import { hexToRgbArray } from '../../../utils/utils';
import type { CartProps, StyleWithCustomProps, CartItem } from '../../../types';
import { CloseIcon } from '../../../utils/icon';
import { cartAnimation } from '../../../styles/animations';
import CartBody from '../CartBody/CartBody';
import './Cart.scss';

export const Cart = memo<CartProps>(({
  isOpen,
  items,
  onClose,
  onUpdateQuantity,
  onCheckout
}) => {
  const config = useConfig();
  const total = items.reduce((sum, item: CartItem) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    return sum + price * item.quantity;
  }, 0);

  const primaryColorRgb = hexToRgbArray(config.primaryColor);
  const dynamicStyles: StyleWithCustomProps = {
    '--theme-primary-color': config.primaryColor,
  };

  if (primaryColorRgb) {
    dynamicStyles['--theme-primary-color-values'] = primaryColorRgb.join(' ');
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
            <CloseIcon onClose={onClose} />
          </div>
          <div className="cart-content">
            {items?.length === 0 ? (
              <p className="cart-empty-message">Your cart is empty</p>
            ) : (
              items?.map((item: CartItem) => (
                <CartBody 
                  id={String(item.id)}
                  name={item.name}
                  price={Number(item.price)}
                  quantity={item.quantity}
                  availableQty={item.availableQty}
                  onUpdateQuantity={onUpdateQuantity}
                  image_url={item.image_url || ''}
                  dynamicStyles={dynamicStyles}
                />
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
              disabled={items?.length === 0}
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