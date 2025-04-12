export function createTypingIndicator(primaryColor) {
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = `
      <span></span>
      <span></span>
      <span></span>
    `;

    const dots = indicator.querySelectorAll('span');
    dots.forEach(dot => {
      dot.style.backgroundColor = primaryColor;
    })
    return indicator;
  }