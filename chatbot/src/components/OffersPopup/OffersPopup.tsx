import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XIcon } from '../../assets/XIcon';
import { hexToRgbArray } from '../../utils/utils';
import type { OffersPopupProps, StyleWithCustomProps } from '../../types';
import './OffersPopup.scss';

export const OffersPopup = memo<OffersPopupProps>(({ 
  isOpen, 
  onClose, 
  offerTags, 
  primaryColor, 
  onOfferClick
}) => {
  const primaryColorRgb = hexToRgbArray(primaryColor);
  const headerStyles: StyleWithCustomProps = {
    '--theme-primary-color': primaryColor,
  };
  if (primaryColorRgb) {
    headerStyles['--theme-primary-color-rgb'] = primaryColorRgb.join(', ');
  }

  const handleTagClick = (tag: string) => {
    onOfferClick(tag);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="offers-popup-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="offers-popup-container"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()} 
            style={headerStyles}
          >
            <div className="offers-popup-header" style={headerStyles}>
              <h3 className="offers-popup-title">Latest Offers</h3>
              <button className="offers-popup-close-btn" onClick={onClose} aria-label="Close offers popup">
                <XIcon />
              </button>
            </div>
            <div className="offers-popup-content">
              {offerTags.length === 0 ? (
                <p className="offers-popup-no-offers">No special offers available at the moment.</p>
              ) : (
                <ul className="offers-popup-list">
                  {offerTags.map((tag) => (
                    <li key={tag} className="offers-popup-list-item">
                      <button onClick={() => handleTagClick(tag)} className="offers-popup-tag-button">
                        {tag}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}); 