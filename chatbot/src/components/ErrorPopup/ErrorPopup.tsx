import { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ErrorPopupProps } from '../../types';
import { errorAnimation } from '../../styles/animations';
import './ErrorPopup.scss';

export const ErrorPopup = memo<ErrorPopupProps>(({ 
  message,
  onClose 
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 2000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div 
          className="error-popup-container"
          {...errorAnimation}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
});