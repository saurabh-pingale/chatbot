export function createMessage(text, sender) {
    const message = document.createElement('div');
    message.className = `message ${sender}-message`;
    message.textContent = text;
    
    return message;
  }