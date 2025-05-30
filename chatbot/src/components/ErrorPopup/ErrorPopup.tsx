import { memo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ErrorPopup.scss';

interface ErrorPopupProps {
  message: string;
  onClose: () => void;
}

const errorAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: 20 },
  transition: { duration: 0.2 }
};

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