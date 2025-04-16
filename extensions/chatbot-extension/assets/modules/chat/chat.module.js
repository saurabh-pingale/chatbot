import { fetchBotResponse, resetConversationHistory } from '../api/api.module';
import { addMessage } from '../../services/message.service';
import { createTypingIndicator } from '../../components/chat/TypingIndicator/TypingIndicator';
import { getShopId } from '../../utils/shopify.utils';
import { COLORS } from '../../constants/colors.constants';
import { initWebSocket, closeWebSocket } from '../../services/websocket.service';
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
          message.sender === 'user' ? primaryColor : COLORS.BOT_TEXT
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

  const shopId = getShopId();
  const sessionData = JSON.parse(sessionStorage.getItem('chatbotSessionData') || '{}');
  const userId = sessionData.email; 
  console.log('Initializing WebSocket with:', { shopId, userId });
  initWebSocket(shopId, userId);

  window.addEventListener('beforeunload', () => {
    closeWebSocket();
  });

  loadChatHistoryFromSession(primaryColor);
  
  const handleSend = async (messageFromQuery) => {
    const message = messageFromQuery || inputBox.value.trim();
    if (!message) return;

    if(!messageFromQuery) inputBox.value = '';
    
    trackEvent('interactions', {});

    addMessage(message, 'user', [], primaryColor);
    inputBox.value = '';
    
    const typingIndicator = createTypingIndicator(primaryColor);
    document.querySelector('.message-list').appendChild(typingIndicator);

    try {
      const { answer, products } = await fetchBotResponse(message, getShopId());

      addMessage(answer, 'bot', products || [], COLORS.BOT_TEXT); 
    } catch(error) {
      console.error('Chat error:', error);
      addMessage(
        'Sorry, something went wrong! Can you please try again later.', 
        'bot', 
        [], 
        COLORS.BOT_TEXT
      );
    } finally {
      typingIndicator.remove();
      inputBox.focus();
    }
  };

  window.sendChatMessage = handleSend;

  inputBox.addEventListener('input', () => {
    sendButton.disabled = inputBox.value.trim() === '';
  });
  
  inputBox.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSend();
  });
  
  sendButton.addEventListener('click', handleSend);
}