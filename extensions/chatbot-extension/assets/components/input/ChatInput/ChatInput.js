export function createChatInput(primaryColor) {
    const container = document.createElement('div');
    container.className = 'input-component';
    
    container.innerHTML = `
      <input type="text" class="input-box" placeholder="Type your message...">
      <button class="send-button" disabled>Send</button>
    `;
    
    container.querySelector('.send-button').style.backgroundColor = primaryColor;
    return container;
  }