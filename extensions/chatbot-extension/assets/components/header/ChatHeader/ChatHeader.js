import { createCartIcon } from '../../cart/CartIcon/CartIcon';

export function createChatHeader(primaryColor, title) {
  const header = document.createElement('div');
  header.className = 'chatbot-header';
  header.style.backgroundColor = primaryColor;
  
  header.innerHTML = `
    <h3 class="chatbot-header-title">${title}</h3>
    <button class="chatbot-close-button">✕</button>
  `;
  
  const cartIcon = createCartIcon();
  header.insertBefore(cartIcon, header.querySelector('.chatbot-close-button'));
  
  return header;
}