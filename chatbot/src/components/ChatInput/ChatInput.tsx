import { memo, useState, useRef, useEffect } from 'react';
import type { CSSProperties } from 'react';
import './ChatInput.scss';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  primaryColor: string;
}

// Define a type for style objects that can include CSS custom properties
interface StyleWithCustomProps extends CSSProperties {
  '--theme-primary-color'?: string;
  '--theme-primary-color-rgb'?: string;
}

// Helper function to convert hex color to RGB array
const hexToRgbArray = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
};

export const ChatInput = memo<ChatInputProps>(({ 
  onSendMessage,
  disabled = false,
  primaryColor 
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const primaryColorRgb = hexToRgbArray(primaryColor);
  const dynamicStyles: StyleWithCustomProps = {
    '--theme-primary-color': primaryColor,
  };
  if (primaryColorRgb) {
    dynamicStyles['--theme-primary-color-rgb'] = primaryColorRgb.join(', ');
  }

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 150);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = textarea.scrollHeight > 150 ? 'auto' : 'hidden';
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [message]);

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    if (trimmedMessage.length > 200) {
      onSendMessage('The message you submitted was too long, please reload the conversation and submit something shorter.');
      return;
    }

    onSendMessage(trimmedMessage);
    setMessage('');
    
    if (textareaRef.current) {
      textareaRef.current.style.height = '48px';
      textareaRef.current.style.overflowY = 'hidden';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="chat-input-container" style={dynamicStyles}>
      <textarea
        ref={textareaRef}
        className="chat-input-textarea"
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
        }}
        onKeyPress={handleKeyPress}
        placeholder="Type your message..."
        disabled={disabled}
        maxLength={200}
        rows={1}
        style={dynamicStyles}
      />
      <button
        className="chat-input-send-button"
        onClick={handleSubmit}
        disabled={!message.trim() || disabled}
        style={dynamicStyles}
      >
        Send
      </button>
    </div>
  );
});