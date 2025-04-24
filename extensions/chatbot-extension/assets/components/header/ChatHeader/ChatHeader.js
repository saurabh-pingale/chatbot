import { createCartIcon } from '../../cart/CartIcon/CartIcon';

export function createChatHeader(primaryColor, title, finalImageUrl) {
  const header = document.createElement('div');
  header.className = 'chatbot-header-glass';
  header.style.setProperty('--glass-primary', primaryColor);

  header.innerHTML = `
    <div class="chatbot-header-left">
      <img src="${finalImageUrl}" alt="Logo" class="chatbot-logo" />
      <h3 class="chatbot-header-title">${title}</h3>
    </div>
  `;

  const cartIcon = createCartIcon();
  header.appendChild(cartIcon);

  return header;
}