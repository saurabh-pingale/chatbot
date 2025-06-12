import { memo, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [container, setContainer] = useState<Element | null>(null);

  useEffect(() => {
    setContainer(document.querySelector('.chatbot-container'));
  }, []);

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

  const popupJsx = (
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
            initial={{ y: -20, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -20, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()} 
            style={headerStyles}
          >
            <div className="offers-popup-header" style={headerStyles}>
              <h3 className="offers-popup-title">Latest Offers</h3>
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

  if (!container) {
    return null;
  }

  return createPortal(popupJsx, container);
}); 