import { memo, forwardRef } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { Message as MessageType } from '../../types';
import './Message.scss';

interface MessageProps {
  message: MessageType;
  primaryColor?: string;
}

interface StyleWithCustomProps extends CSSProperties {
  '--theme-primary-color'?: string;
}

const formatMessage = (text: string): string => {
  const lines = text.replace(/â€¢/g, "•").split("\n");
  let formattedHtml = "";
  let inList = false;
  let currentParagraph = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === "" && i > 0 && i < lines.length - 1) {
      const prevLine = lines[i - 1].trim();
      const nextLine = lines[i + 1].trim();
      if (prevLine.startsWith("•") && nextLine.startsWith("•")) {
        continue;
      }
    }

    if (line.startsWith("•")) {
      if (currentParagraph && !inList) {
        formattedHtml += `<p>${currentParagraph}</p>`;
        currentParagraph = "";
      }
      if (!inList) {
        formattedHtml += '<ul class="message-list-items">';
        inList = true;
      }
      formattedHtml += `<li>${line.substring(1).trim()}</li>`;
    } else {
      if (inList) {
        formattedHtml += "</ul>";
        inList = false;
      }
      if (line) {
        currentParagraph = currentParagraph 
          ? currentParagraph + " " + line 
          : line;
      } else if (currentParagraph) {
        formattedHtml += `<p>${currentParagraph}</p>`;
        currentParagraph = "";
      }
    }
  }

  if (inList) {
    formattedHtml += "</ul>";
  }
  if (currentParagraph) {
    formattedHtml += `<p>${currentParagraph}</p>`;
  }
  return formattedHtml;
};

const messageAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -10 },
  transition: { duration: 0.2 }
};

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