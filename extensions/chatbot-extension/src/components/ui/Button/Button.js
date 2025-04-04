export function createButton(text, onClick, primaryColor) {
    const button = document.createElement('button');
    button.className = 'custom-button';
    button.textContent = text;
    button.style.backgroundColor = primaryColor;
    button.addEventListener('click', onClick);
    return button;
  }