export function createToggleButton(primaryColor) {    
    const button = document.createElement('button');
    button.className = 'chatbot-toggle-button';
    // button.innerHTML = `<img src="${finalImageUrl} alt="Logo" class="chatbot-logo" />`;
    button.style.backgroundColor = primaryColor;
    return button;
  }