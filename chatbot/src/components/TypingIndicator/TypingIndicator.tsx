import { motion } from 'framer-motion';
import type { StyleWithCustomProps } from '../../types';
import { typingAnimation } from '../../styles/animations';
import { dotVariants } from '../../styles/variants';
import './TypingIndicator.scss';
import { useConfig } from '../../context/ConfigContext';

export const TypingIndicator = () => {
  const config = useConfig();

  const typingIndicatorStyles: StyleWithCustomProps = {
    '--theme-primary-color': config.primaryColor,
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