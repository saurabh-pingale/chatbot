import { memo, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

import { useCart } from '../../../context/CartContext';
import { OffersPopup } from '../../OffersPopup/OffersPopup';
import { CartLoader } from '../../Cart-UI/CartLoader/CartLoader';
import { CONFIGMESSAGE } from '../../../constants/messages';
import { CartIconSVG } from '../../../assets/cart_icon';
import { TrashIconSVG } from '../../../assets/TrashIcon';
import { ChevronDownIconSVG } from '../../../assets/ChevronDownIcon';
import { RingBellIconSVG } from '../../../assets/RingBellIcon';
import type { ChatHeaderProps, StyleWithCustomProps } from '../../../types';
import './ChatHeaderActions.scss';

interface ChatHeaderActionsProps extends Pick<ChatHeaderProps, 'onClearConversation' | 'onMinimize' | 'setError' | 'isEmailGateVisible' | 'messagesCount'> {
  headerStyles: StyleWithCustomProps;
}

export const ChatHeaderActions = memo<ChatHeaderActionsProps>(({
  onClearConversation,
  onMinimize,
  setError,
  isEmailGateVisible,
  messagesCount,
  headerStyles
}) => {
  const [isOffersPopupOpen, setIsOffersPopupOpen] = useState(false);
  
  const { cartItems, toggleCart, isCartSyncing } = useCart();
  const totalCartItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const showCartIcon = !isEmailGateVisible;
  const showOffersIcon = !isEmailGateVisible;
  const showClearConversationIcon = (messagesCount >= CONFIGMESSAGE.MIN_MESSAGES_TO_SHOW_CLEAR_ICON) && !isEmailGateVisible;

  const handleToggleOffers = useCallback(() => {
    setIsOffersPopupOpen(prev => !prev);
  }, []);

  return (
    <>
      <div className="chat-header-right-section">
        {showOffersIcon && (
          <motion.div
            className={`chat-header-icon-wrapper chat-header-offers-icon-wrapper ${isOffersPopupOpen ? 'active' : ''}`}
            onClick={handleToggleOffers}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="View Offers"
          >
            <RingBellIconSVG />
          </motion.div>
        )}
        {showCartIcon && (
          <motion.div
            className="chat-header-icon-wrapper chat-header-cart-icon-wrapper"
            onClick={toggleCart}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="View Cart"
          >
            <CartIconSVG />
            {isCartSyncing ? (
              <CartLoader />
            ) : (
              totalCartItems > 0 && (
                <motion.span
                  className="chat-header-cart-count-badge"
                  style={headerStyles}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  {totalCartItems}
                </motion.span>
              )
            )}
          </motion.div>
        )}
        {showClearConversationIcon && onClearConversation && (
          <motion.div
            className="chat-header-icon-wrapper chat-header-trash-icon-wrapper"
            onClick={onClearConversation}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="Clear conversation"
          >
            <TrashIconSVG />
          </motion.div>
        )}
        <motion.div
          className="chat-header-icon-wrapper chat-header-minimize-icon-wrapper mobile-only"
          onClick={onMinimize}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          title="Minimize"
        >
          <ChevronDownIconSVG />
        </motion.div>
      </div>
      {showOffersIcon && (
        <OffersPopup
          isOpen={isOffersPopupOpen}
          onClose={() => setIsOffersPopupOpen(false)}
          setError={setError}
        />
      )}
    </>
  );
});