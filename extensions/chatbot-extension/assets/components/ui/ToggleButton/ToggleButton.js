export function createToggleButton(primaryColor) {
    const button = document.createElement('button');
    button.className = 'chatbot-toggle-button';
    button.innerHTML = '<img src="https://uploads.servicebell.com/cdn-cgi/image/width=320,height=320,f=auto/widget-org-logos/770540926.533a796cc2644e93a2bb3dec2b40c3f2.png" alt="Logo" class="chatbot-logo" />';
    button.style.backgroundColor = primaryColor;
    return button;
  }

