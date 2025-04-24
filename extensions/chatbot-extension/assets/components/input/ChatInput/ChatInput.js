export function createChatInput(primaryColor) {
    const container = document.createElement('div');
    container.className = 'input-component';
    
    container.innerHTML = `
      <textarea class="input-box" placeholder="Type your message..." rows="1" maxlength="200"></textarea>
      <button class="send-button" disabled>Send</button>
    `;

    const inputBox = container.querySelector('.input-box');
    const sendButton = container.querySelector('.send-button');
    
    inputBox.style.resize = 'none';
    inputBox.style.overflowY = 'hidden';

    inputBox.addEventListener('input', () => {
      inputBox.style.height = 'auto';
      inputBox.style.height = `${inputBox.scrollHeight}px`;
      sendButton.disabled = inputBox.value.trim() === '';
    });

    sendButton.style.backgroundColor = primaryColor;
    return container;
  }