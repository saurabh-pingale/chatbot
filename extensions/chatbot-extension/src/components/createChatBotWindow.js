//TODO - Function Doing more than one thing, split it, Add references to it
export function createChatbotWindow(primaryColor, chatbotTitle) {
    const chatbotWindow = document.createElement('div');
    chatbotWindow.className = 'chatbot-window';
    chatbotWindow.style.borderColor = primaryColor;
  
    const header = document.createElement('div');
    header.className = 'chatbot-header';
    header.style.backgroundColor = primaryColor;

    const title = document.createElement('h3');
    title.className = 'chatbot-header-title';
    title.textContent = chatbotTitle;

    const closeButton = document.createElement('button');
    closeButton.className = 'chatbot-close-button';
    closeButton.innerHTML = '✕';

    const cartIcon = document.createElement('div');
    cartIcon.className = 'chatbot-cart-icon';
    cartIcon.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
      </svg>
      <span class="cart-count">0</span>
    `;

    cartIcon.addEventListener('click', () => {
      window.location.href = '/cart';
    });

    header.appendChild(title);
    header.appendChild(cartIcon);
    header.appendChild(closeButton);
    
    chatbotWindow.appendChild(header);
  
    const chatWindow = document.createElement('div');
    chatWindow.className = 'chat-window';
    
    const messageList = document.createElement('div');
    messageList.className = 'message-list';
    chatWindow.appendChild(messageList);
    
    chatbotWindow.appendChild(chatWindow);
  
    const inputComponent = document.createElement('div');
    inputComponent.className = 'input-component';
    inputComponent.innerHTML = `
      <input type="text" class="input-box" placeholder="Type your message...">
      <button class="send-button" disabled style="background-color: ${primaryColor};">
        Send
      </button>
    `;
    chatbotWindow.appendChild(inputComponent);
  
    return chatbotWindow;
  }
