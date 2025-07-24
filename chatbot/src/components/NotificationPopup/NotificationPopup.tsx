import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { NotificationPopupProps } from '../../types';
import './NotificationPopup.scss';

export const NotificationPopup = memo<NotificationPopupProps>(({ 
  isVisible, 
  onClose, 
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="notification-popup"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          <div className="notification-content">
            <button className="close-button" onClick={onClose} aria-label="Close notification">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M13 1L1 13M1 1L13 13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
            <div className="message">
              <div className="message-line first-line">Chat Now For Best</div>
              <div className="message-line">Deals & Shopping</div>
              <div className="message-line last-line">Assistance!</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});