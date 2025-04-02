import { fetchBotResponse } from './apiHandler'
import { trackUserInteraction } from './trackingService';

export function initChat(primaryColor) {
    const inputBox = document.querySelector('.input-box');
    const sendButton = document.querySelector('.send-button');
    const messageList = document.querySelector('.message-list');
  
    inputBox.addEventListener('input', () => {
      sendButton.disabled = inputBox.value.trim() === '';
    });
  
    sendButton.addEventListener('click', () => sendMessage());
  
    inputBox.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && inputBox.value.trim() !== '') {
        e.preventDefault();
        sendMessage();
      }
    });
  
    setTimeout(() => {
      addMessage('Hi there! How can I help you today?', 'bot');
    }, 500);
  
    function sendMessage() {
      const message = inputBox.value.trim();
      if (message === '') return;
      
      addMessage(message, 'user');
      trackUserInteraction('chat_interactions');
  
      inputBox.value = '';
      sendButton.disabled = true;
      
      const typingIndicator = document.createElement('div');
      typingIndicator.className = 'typing-indicator';
      typingIndicator.innerHTML = '<span></span><span></span><span></span>';
      typingIndicator.style.backgroundColor = '#40444b';
      typingIndicator.style.borderColor = '#40444b';
      
      messageList.appendChild(typingIndicator);
  
      scrollToBottom();
  
      fetchBotResponse(message, typingIndicator);
    }
  
    function addMessage(text, sender) {
      const messageElement = document.createElement('div');
      messageElement.className = `message ${sender}-message`;
      messageElement.textContent = text;
      
      messageList.appendChild(messageElement);
      scrollToBottom();
    }
  
    function scrollToBottom() {
      const chatWindow = document.querySelector('.chat-window');
      chatWindow.scrollTop = chatWindow.scrollHeight;
    }
  
    return { fetchBotResponse };
  }