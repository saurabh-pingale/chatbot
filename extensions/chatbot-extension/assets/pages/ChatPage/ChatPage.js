document.addEventListener('DOMContentLoaded', () => {
  const page = document.createElement('div');
  page.className = 'chat-page';
  page.style.borderColor = primaryColor;

  const header = document.createElement('div');
  header.className = 'chatbot-header-glass';
  header.style.setProperty('--glass-primary', primaryColor);
  header.innerHTML = `
    <div class="chatbot-header-left">
      <img src="${finalImageUrl}" alt="Logo" class="chatbot-logo" />
      <h3 class="chatbot-header-title">${chatbotTitle}</h3>
    </div>
  `;

  const cartIcon = document.createElement('div');
  cartIcon.className = 'cart-icon';
  cartIcon.style.backgroundColor = primaryColor;
  cartIcon.innerHTML = '🛒';
  header.appendChild(cartIcon);

  page.appendChild(header);

  const chatContent = document.createElement('div');
  chatContent.className = 'chat-content';

  const messageList = document.createElement('div');
  messageList.className = 'message-list';
  chatContent.appendChild(messageList);
  page.appendChild(chatContent);

  const sliderWrapper = document.createElement('div');
  sliderWrapper.className = 'user-query-slider';

  userQueries.forEach(query => {
    const queryButton = document.createElement('button');
    queryButton.className = 'user-query-button';
    queryButton.innerText = query;
    queryButton.onclick = () => {
      if (typeof window.sendChatMessage === 'function') {
        window.sendChatMessage(query);
      }
    };
    sliderWrapper.appendChild(queryButton);
  });

  page.appendChild(sliderWrapper);

  const inputContainer = document.createElement('div');
  inputContainer.className = 'input-component';
  inputContainer.innerHTML = `
    <textarea class="input-box" placeholder="Type your message..." rows="1" maxlength="200"></textarea>
    <button class="send-button" disabled>Send</button>
  `;

  const inputBox = inputContainer.querySelector('.input-box');
  const sendButton = inputContainer.querySelector('.send-button');

  inputBox.style.resize = 'none';
  inputBox.style.overflowY = 'hidden';
  sendButton.style.backgroundColor = primaryColor;

  inputBox.addEventListener('input', () => {
    inputBox.style.height = 'auto';
    inputBox.style.height = `${inputBox.scrollHeight}px`;
    sendButton.disabled = inputBox.value.trim() === '';
  });

  sendButton.addEventListener('click', () => {
    const msg = inputBox.value.trim();
    if (msg) {
      window.sendChatMessage(msg);
      inputBox.value = '';
      inputBox.dispatchEvent(new Event('input'));
    }
  });

  page.appendChild(inputContainer);

  document.getElementById('chat-container').appendChild(page);
});
