import { memo, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { formatMessage } from '../../utils/utils';
import type { MessageProps, StyleWithCustomProps } from '../../types';
import { messageAnimation } from '../../styles/animations';
import './Message.scss';

export const Message = memo(forwardRef<HTMLDivElement, MessageProps>(({ 
  message,
  primaryColor
}, ref) => {
  const isUser = message.type === 'user';
  const formattedContent = formatMessage(message.content);

  const bubbleStyles: StyleWithCustomProps = {};
  if (isUser && primaryColor) {
    bubbleStyles['--theme-primary-color'] = primaryColor;
  }

  return (
    <motion.div
      ref={ref}
      className={`message-wrapper ${isUser ? 'is-user' : ''}`}
      {...messageAnimation}
    >
      <div 
        className={`message-bubble ${isUser ? 'is-user' : ''}`}
        style={bubbleStyles}
        dangerouslySetInnerHTML={{ __html: formattedContent }}
      />
    </motion.div>
  );
}));