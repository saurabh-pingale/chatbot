export function createMessage(text, sender, primaryColor) {
    const message = document.createElement('div');
    message.className = `message ${sender}-message`;
    message.textContent = text;
    
    if (sender === 'user') {
      message.style.backgroundColor = primaryColor;
      message.style.borderColor = primaryColor;
    } else {
      message.style.backgroundColor = '#40444b';
      message.style.borderColor = '#40444b';
    }
    
    return message;
  }