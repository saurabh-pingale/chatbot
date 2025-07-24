import { memo, useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { useConfig } from '../../context/ConfigContext';
import { getShopOfferTags } from '../../services/chat';
import { storefrontAccessToken } from '../../constants/cart';
import { hexToRgbArray, getContrastingTextColor } from '../../utils/utils';
import type { OffersPopupProps, StyleWithCustomProps } from '../../types';
import './OffersPopup.scss';

export const OffersPopup = memo<OffersPopupProps>(({
  isOpen,
  onClose,
  setError
}) => {
  const [container, setContainer] = useState<Element | null>(null);
  const [offerTags, setOfferTags] = useState<string[]>([]);

  const config = useConfig();
  
  useEffect(() => {
    setContainer(document.querySelector('.chatbot-container'));
  }, []);

  useEffect(() => {
    const fetchOffers = async () => {
      if (isOpen) {
        try {
          const tags = await getShopOfferTags(config.shopId, storefrontAccessToken);
          setOfferTags(tags);
        } catch (err) {
          console.error('Failed to fetch offer tags:', err);
          setError('Could not load offers at this time. Please try again later.');
          setOfferTags([]);
        }
      }
    };
    fetchOffers();
  }, [isOpen, config.shopId, storefrontAccessToken, setError]);

  const handleOfferClick = useCallback((tag: string) => {
    const offerUrl = `https://${config.shopId}/collections/all?constraint=${encodeURIComponent(tag)}`;
    window.open(offerUrl, '_blank');
    onClose();
  }, [config.shopId, onClose]);

  const primaryColorRgb = hexToRgbArray(config.primaryColor);
  const headerTextColor = getContrastingTextColor(config.primaryColor);
  const headerStyles: StyleWithCustomProps = {
    '--theme-primary-color': config.primaryColor,
  };
  if (primaryColorRgb) {
    headerStyles['--theme-primary-color-rgb'] = primaryColorRgb.join(', ');
  }

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
              <h3 className="offers-popup-title" style={{ color: headerTextColor }}>Latest Offers</h3>
            </div>
            <div className="offers-popup-content">
              {offerTags.length === 0 ? (
                <p className="offers-popup-no-offers">No special offers available at the moment.</p>
              ) : (
                <ul className="offers-popup-list">
                  {offerTags.map((tag) => (
                    <li key={tag} className="offers-popup-list-item">
                      <button onClick={() => handleOfferClick(tag)} className="offers-popup-tag-button">
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