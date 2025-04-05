export function createTypingIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
    `;
    return indicator;
  }