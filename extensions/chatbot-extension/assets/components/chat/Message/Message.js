import { COLORS } from '../../../constants/colors.constants.js';
import { formatMessageText } from '../../../utils/formatMessage.utils.js';

export function createMessage(text, sender, primaryColor) {
    const message = document.createElement('div');
    message.className = `message ${sender}-message`;
    message.innerHTML = formatMessageText(text);
    
    if(sender === 'user') {
      const lighterColor = COLORS.LIGHTER_SHADES[primaryColor] || 'rgba(255, 118, 44, 0.2)';
      message.style.backgroundColor = lighterColor;
    }
    return message;
  }