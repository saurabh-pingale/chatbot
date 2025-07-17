import { memo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';

import { useConfig } from '../../../context/ConfigContext';
import { hexToRgbArray } from '../../../utils/utils';
import { CartIconSVG } from '../../../assets/cart_icon';
import { RingBellIconSVG } from '../../../assets/RingBellIcon';
import { OffersPopup } from '../../OffersPopup/OffersPopup';
import { TrashIconSVG } from '../../../assets/TrashIcon';
import { ChevronDownIconSVG } from '../../../assets/ChevronDownIcon';
import { CartLoader } from '../../Cart-UI/CartLoader/CartLoader';
import type { ChatHeaderProps, StyleWithCustomProps } from '../../../types';
import './ChatHeader.scss';

export const ChatHeader = memo<ChatHeaderProps>(({
  onToggleCart,
  cartItemCount,
  onClearConversation,
  onMinimize,
  isCartSyncing,
  setError,
  isEmailGateVisible,
  messagesCount
}) => {

  const [isOffersPopupOpen, setIsOffersPopupOpen] = useState(false);

  const config = useConfig();

  const showCartIcon = !isEmailGateVisible;
  const showOffersIcon = !isEmailGateVisible;
  const showClearConversationIcon = (messagesCount >= 4) && !isEmailGateVisible;

  const handleToggleOffers = useCallback(() => {
    setIsOffersPopupOpen(prev => !prev);
  }, []);

  const primaryColorRgb = hexToRgbArray(config.primaryColor);
  const headerStyles: StyleWithCustomProps = {
    '--theme-primary-color': config.primaryColor,
  };
  if (primaryColorRgb) {
    headerStyles['--theme-primary-color-values'] = primaryColorRgb.join(' ');
  }

  return (
    <div className="chat-header-container" style={headerStyles}>
      <div className="chat-header-left-section">
        <div className="chat-header-logo">
          <img
            src={config.storeImage}
            alt="Store Logo"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.src = config.storeImage;
            }}
          />
        </div>
        <h2 className="chat-header-title">Store Assistant</h2>
      </div>

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
            onClick={onToggleCart}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            title="View Cart"
          >
            <CartIconSVG />
            {isCartSyncing ? (
              <CartLoader />
            ) : (
              cartItemCount > 0 && (
                <motion.span
                  className="chat-header-cart-count-badge"
                  style={headerStyles}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                >
                  {cartItemCount}
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
    </div>
  );
});