import { fetchBotResponse } from '../api/api.module';
import { addMessage } from '../../services/message.service';
import { createTypingIndicator } from '../../components/chat/TypingIndicator/TypingIndicator';
import { getShopId } from '../../utils/shopify.utils';

export function initChatModule(primaryColor) {
  const inputBox = document.querySelector('.input-box');
  const sendButton = document.querySelector('.send-button');
  
  const handleSend = async () => {
    const message = inputBox.value.trim();
    if (!message) return;
    
    addMessage(message, 'user', [], primaryColor);
    inputBox.value = '';
    
    const typingIndicator = createTypingIndicator();
    document.querySelector('.message-list').appendChild(typingIndicator);

    try {
      const { answer, products } = await fetchBotResponse(message, getShopId());

      addMessage(answer, 'bot', products || [], primaryColor); 
    } catch(error) {
      console.error('Chat error:', error);
      addMessage(
        error.message || 'Sorry, something went wrong.', 
        'bot', 
        [], 
        primaryColor
      );
    } finally {
      typingIndicator.remove();
      inputBox.focus();
    }
  };

  inputBox.addEventListener('input', () => {
    sendButton.disabled = inputBox.value.trim() === '';
  });
  
  inputBox.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
  
  sendButton.addEventListener('click', handleSend);

  setTimeout(() => {
    addMessage('Hi there! How can I help you today?', 'bot', [], primaryColor);
  }, 500);
}