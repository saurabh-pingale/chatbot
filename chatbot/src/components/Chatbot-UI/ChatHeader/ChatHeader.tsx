import { memo } from 'react';
import { motion } from 'framer-motion';
import { hexToRgbArray } from '../../../utils/utils';
import { CartIconSVG } from '../../../assets/cart_icon';
import { RingBellIconSVG } from '../../../assets/RingBellIcon';
import { OffersPopup } from '../../OffersPopup/OffersPopup';
import { TrashIconSVG } from '../../../assets/TrashIcon';
import { ChevronDownIconSVG } from '../../../assets/ChevronDownIcon';
import type { ChatHeaderProps, StyleWithCustomProps } from '../../../types';
import './ChatHeader.scss';

export const ChatHeader = memo<ChatHeaderProps>(({ 
  storeImage,
  onToggleCart,
  cartItemCount,
  primaryColor,
  showCartIcon,
  onToggleOffers,
  showOffersIcon,
  isOffersPopupOpen,
  onCloseOffers,
  offerTags,
  onOfferClick,
  onClearConversation,
  showClearConversationIcon,
  onMinimize  
}) => {

  const primaryColorRgb = hexToRgbArray(primaryColor);
  const headerStyles: StyleWithCustomProps = {
    '--theme-primary-color': primaryColor,
  };
  if (primaryColorRgb) {
    headerStyles['--theme-primary-color-values'] = primaryColorRgb.join(' ');
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
        {showOffersIcon && onToggleOffers && (
          <motion.div 
            className={`chat-header-icon-wrapper chat-header-offers-icon-wrapper ${isOffersPopupOpen ? 'active' : ''}`}
            onClick={onToggleOffers}
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
        {showClearConversationIcon  && onClearConversation && (
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
      <OffersPopup
        isOpen={isOffersPopupOpen}
        onClose={onCloseOffers}
        offerTags={offerTags}
        primaryColor={primaryColor}
        onOfferClick={onOfferClick}
      />
    </div>
  );
}); 