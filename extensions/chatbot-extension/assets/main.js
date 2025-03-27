import { initColorPreference } from './modules/colorHandling';
import { createToggleButton, createChatbotWindow } from './modules/uiElements';
import { initChat } from './modules/chatLogic';

document.addEventListener('DOMContentLoaded', function() {
  const container = document.getElementById('shopify-chatbot');
  if (!container) return;

  const primaryColor = container.dataset.primaryColor || '#008080';
  const textColor = container.dataset.textColor || '#f8f8f8';
  const chatbotTitle = container.dataset.title || 'Store Assistant';

  container.style.setProperty('--primary-color', primaryColor);
  container.style.setProperty('--text-color', textColor);

  const toggleButton = createToggleButton(primaryColor);
  container.appendChild(toggleButton);

  const chatbotWindow = createChatbotWindow(primaryColor, chatbotTitle);
  container.appendChild(chatbotWindow);

  toggleButton.addEventListener('click', () => {
    chatbotWindow.classList.toggle('open');
    if (chatbotWindow.classList.contains('open')) {
      toggleButton.innerHTML = '×';
    } else {
      toggleButton.innerHTML = '💬';
    }
    
    if (chatbotWindow.classList.contains('open')) {
      document.querySelector('.input-box').focus();
    }
  });

  chatbotWindow.querySelector('.chatbot-close-button').addEventListener('click', () => {
    chatbotWindow.classList.remove('open');
    document.querySelector('.chatbot-toggle-button').innerHTML = '💬';
  });

  initChat(primaryColor);
  initColorPreference(primaryColor);
});