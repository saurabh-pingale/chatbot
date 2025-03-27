export function createToggleButton(primaryColor) {
    const button = document.createElement('button');
    button.className = 'chatbot-toggle-button';
    button.innerHTML = '💬';
    button.style.backgroundColor = primaryColor;
    return button;
  }
  
  export function createChatbotWindow(primaryColor, chatbotTitle) {
    const chatbotWindow = document.createElement('div');
    chatbotWindow.className = 'chatbot-window';
    chatbotWindow.style.borderColor = primaryColor;
  
    const header = document.createElement('div');
    header.className = 'chatbot-header';
    header.style.backgroundColor = primaryColor;
    header.innerHTML = `
      <h3 class="chatbot-header-title">${chatbotTitle}</h3>
      <button class="chatbot-close-button">✕</button>
    `;
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