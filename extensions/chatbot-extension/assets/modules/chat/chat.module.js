import { fetchBotResponse, resetConversationHistory } from '../api/api.module';
import { addMessage } from '../../services/message.service';
import { createTypingIndicator } from '../../components/chat/TypingIndicator/TypingIndicator';
import { getShopId } from '../../utils/shopify.utils';
import { COLORS } from '../../constants/colors.constants';

export function initChatModule(primaryColor) {
  resetConversationHistory();
  const inputBox = document.querySelector('.input-box');
  const sendButton = document.querySelector('.send-button');
  
  const handleSend = async () => {
    const message = inputBox.value.trim();
    if (!message) return;
    
    addMessage(message, 'user', [], primaryColor);
    inputBox.value = '';
    
    const typingIndicator = createTypingIndicator(primaryColor);
    document.querySelector('.message-list').appendChild(typingIndicator);

    try {
      const { answer, products, history } = await fetchBotResponse(message, getShopId());

      addMessage(answer, 'bot', products || [], COLORS.BOT_TEXT); 
    } catch(error) {
      console.error('Chat error:', error);
      addMessage(
        error.message || 'Sorry, something went wrong.', 
        'bot', 
        [], 
        COLORS.BOT_TEXT
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
}