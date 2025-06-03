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
      <motion.span className="typing-indicator-dot" variants={dotVariants} custom={0} animate="animate" />
      <motion.span className="typing-indicator-dot" variants={dotVariants} custom={1} animate="animate" />
      <motion.span className="typing-indicator-dot" variants={dotVariants} custom={2} animate="animate" />
    </motion.div>
  );
};