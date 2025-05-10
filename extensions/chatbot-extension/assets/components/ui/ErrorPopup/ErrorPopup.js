export function createErrorPopup(message) {
    const popup = document.createElement('div');
    popup.className = 'error-popup';
    
    const content = document.createElement('div');
    content.className = 'error-popup-content';
    content.textContent = message;
    
    popup.appendChild(content);
    
    setTimeout(() => {
      popup.classList.add('fade-out');
      setTimeout(() => popup.remove(), 150);
    }, 2000);
    
    return popup;
  }