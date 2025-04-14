import { formatMessageText } from '../../../utils/formatMessage.utils.js';

export function createMessage(text, sender) {
    const message = document.createElement('div');
    message.className = `message ${sender}-message`;
    message.innerHTML = formatMessageText(text);
    
    return message;
  }