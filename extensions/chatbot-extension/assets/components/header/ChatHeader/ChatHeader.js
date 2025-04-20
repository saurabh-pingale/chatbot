import { createCartIcon } from '../../cart/CartIcon/CartIcon';

export function createChatHeader(primaryColor, title, logoUrl = '') {
  const header = document.createElement('div');
  header.className = 'chatbot-header-glass';
  header.style.setProperty('--glass-primary', primaryColor);

  header.innerHTML = `
    <div class="chatbot-header-left">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" class="chatbot-logo" />` : ''}
      <h3 class="chatbot-header-title">${title}</h3>
    </div>
  `;

  const cartIcon = createCartIcon();
  header.appendChild(cartIcon);

  return header;
}