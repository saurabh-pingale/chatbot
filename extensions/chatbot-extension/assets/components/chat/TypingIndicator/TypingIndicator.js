export function createTypingIndicator(primaryColor) {
  const indicator = document.createElement('div');
  indicator.className = 'typing-indicator';
  indicator.style.setProperty('--primary-color', primaryColor);

  indicator.innerHTML = `
    <span></span>
    <span></span>
    <span></span>
  `;

  return indicator;
}