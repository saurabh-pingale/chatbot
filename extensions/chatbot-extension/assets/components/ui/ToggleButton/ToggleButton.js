export function createToggleButton(primaryColor) {
    const button = document.createElement('button');
    button.className = 'chatbot-toggle-button';
    button.innerHTML = '💬';
    button.style.backgroundColor = primaryColor;
    return button;
  }