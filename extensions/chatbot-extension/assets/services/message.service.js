import { createProductSlider } from '../components/products/ProductSlider/ProductSlider';

export function addMessage(text, sender, products = [], primaryColor) {
  const messageList = document.querySelector('.message-list');
  if (!messageList) return;

  const messageWrapper = document.createElement('div');
  messageWrapper.className = 'message-wrapper';

  const messageElement = document.createElement('div');
  messageElement.className = `message ${sender}-message`;
  messageElement.textContent = text;

  if (sender === 'user') {
    messageElement.style.backgroundColor = primaryColor;
    messageElement.style.borderColor = primaryColor;
  }

  messageWrapper.appendChild(messageElement);

  if (sender === 'bot' && products.length > 0) {
    const slider = createProductSlider(products, primaryColor);
    messageWrapper.appendChild(slider);
  }

  messageList.appendChild(messageWrapper);
}