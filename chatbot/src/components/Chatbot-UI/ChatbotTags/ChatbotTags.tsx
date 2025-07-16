import { motion } from 'framer-motion';
import type { ChatbotTagsProps } from '../../../types';
import './ChatbotTags.scss';

export const ChatbotTags = ({
  tags,
  isTyping,
  primaryColor,
  onClick
}: ChatbotTagsProps) => {
  if (!tags || tags.length === 0 || isTyping) return null;

  return (
    <motion.div
      className="chatbot-tags-container agent-side"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ '--theme-primary-color': primaryColor } as React.CSSProperties}
    >
      <div className="chatbot-tags horizontal-categories">
        {tags.map((tag) => (
          <button
            key={tag.name}
            className="chatbot-tag-button premium-tag"
            onClick={() => onClick(tag.name)}
            disabled={isTyping}
          >
            {tag.name}
          </button>
        ))}
      </div>
    </motion.div>
  );
};