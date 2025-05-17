import { fetchBotResponse } from '../api/api.module';
import { resetConversationHistory } from '../api/api.module';
import { addMessage } from '../../services/message.service';
import { createTypingIndicator } from '../../components/chat/TypingIndicator/TypingIndicator';
import { getShopId } from '../../utils/shopify.utils';
import { COLORS } from '../../constants/colors.constants';
import { trackEvent } from '../user/tracking.module';
 
let messagesLoaded = false;
export function loadChatHistoryFromSession(primaryColor) {
  if (messagesLoaded) {
    return;
  }

  try {
    const savedMessages = sessionStorage.getItem('chatMessages');
    if (savedMessages) {
      window.isLoadingHistory = true;

      const messages = JSON.parse(savedMessages);
      messages.forEach(message => {
        addMessage(
          message.text, 
          message.sender, 
          message.products || [], 
          message.sender === 'user' ? primaryColor : COLORS.GRAY_500
        );
      });
      window.isLoadingHistory = false;
      messagesLoaded = true;
    }
  } catch (error) {
    window.isLoadingHistory = false;
    console.error('Error loading chat history from session storage:', error);
  }
}

export function initChatModule(primaryColor) {
  const savedHistory = sessionStorage.getItem('conversationHistory');
  if (savedHistory) {
    try {
      const parsedHistory = JSON.parse(savedHistory);
      resetConversationHistory(parsedHistory);
    } catch (error) {
      console.error('Error parsing conversation history:', error);
      resetConversationHistory();
    }
  } else {
    resetConversationHistory(); 
  }

  const inputBox = document.querySelector('.input-box');
  const sendButton = document.querySelector('.send-button');

  loadChatHistoryFromSession(primaryColor);
  
  const handleSend = async (messageFromQuery) => {
    const message = (messageFromQuery && typeof messageFromQuery === 'string') ? messageFromQuery : inputBox.value.trim();
    if (!message) return;

    if (message.length > 200) {
      addMessage(
        'The message you submitted was too long, please reload the conversation and submit something shorter.',
        'bot',
        [],
        COLORS.GRAY_500
      );
      return;
    }

    if(!messageFromQuery) {
      inputBox.value = '';
      inputBox.style.height = 'auto'; 
      inputBox.focus();
      inputBox.setSelectionRange(0, 0);
    }
    
    trackEvent('interactions', {});

    addMessage(message, 'user', [], primaryColor);

    inputBox.value = '';
    inputBox.style.height = 'auto';
    
    const typingIndicator = createTypingIndicator(primaryColor);
    document.querySelector('.message-list').appendChild(typingIndicator);

    try {
      const sessionData = JSON.parse(sessionStorage.getItem('chatbotSessionData') || {});
      const user_id = sessionData?.email || '';

      const { answer, products } = await fetchBotResponse(message, getShopId(), user_id);

      addMessage(answer, 'bot', products || [], COLORS.GRAY_500); 
    } catch(error) {
      console.error('Chat error:', error);
      addMessage(
        'Sorry, something went wrong! Can you please try again later.', 
        'bot', 
        [], 
        COLORS.GRAY_500
      );
    } finally {
      typingIndicator.remove();
      inputBox.focus();
      inputBox.setSelectionRange(0, 0);
    }
  };

  window.sendChatMessage = handleSend;
  
  inputBox.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
  
  sendButton.addEventListener('click', () => {
    const message = inputBox.value.trim();
    if (message) {
      handleSend(message);
    } 
  });
}