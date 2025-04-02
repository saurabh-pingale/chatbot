import { createProductSlider } from './productService.js';

export function addMessage(text, sender, products = [], primaryColor) {
  const messageList = document.querySelector('.message-list');
  const messageWrapper = document.createElement('div');
  messageWrapper.className = 'message-wrapper';

  const messageElement = document.createElement('div');
  messageElement.className = `message ${sender}-message`;
  messageElement.textContent = text;
  
  if (sender === 'user') {
    messageElement.style.backgroundColor = primaryColor;
    messageElement.style.borderColor = primaryColor;
  } else {
    messageElement.style.backgroundColor = '#40444b';
    messageElement.style.borderColor = '#40444b';
  }

  messageWrapper.appendChild(messageElement);

  if (sender === 'bot' && products && products.length > 0) {
    const productSlider = createProductSlider(products, primaryColor);
    messageWrapper.appendChild(productSlider);
  }
  
  messageList.appendChild(messageWrapper);
  scrollToBottom();
}

export function scrollToBottom() {
  const chatWindow = document.querySelector('.chat-window');
  chatWindow.scrollTop = chatWindow.scrollHeight;
}