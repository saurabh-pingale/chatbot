import { motion } from 'framer-motion';
import type { StyleWithCustomProps, TypingIndicatorProps } from '../../types';
import { typingAnimation } from '../../styles/animations';
import { dotVariants } from '../../styles/variants';
import './TypingIndicator.scss';

export const TypingIndicator = ({ primaryColor }: TypingIndicatorProps) => {
  const typingIndicatorStyles: StyleWithCustomProps = {
    '--theme-primary-color': primaryColor,
  };

  return (
    <motion.div
      className="typing-indicator"
      key="typing"
      style={typingIndicatorStyles}
      variants={typingAnimation}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <motion.div className="typing-indicator-dot" variants={dotVariants} animate="animate" style={{ transitionDelay: '0s' }} />
      <motion.div className="typing-indicator-dot" variants={dotVariants} animate="animate" style={{ transitionDelay: '0.2s' }} />
      <motion.div className="typing-indicator-dot" variants={dotVariants} animate="animate" style={{ transitionDelay: '0.4s' }} />
    </motion.div>
  );
};