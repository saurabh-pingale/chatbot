export function createToggleButton(primaryColor) {
    const button = document.createElement('button');
    button.className = 'chatbot-toggle-button';
    button.innerHTML = '💬';
    button.style.backgroundColor = primaryColor;
    return button;
  }

  export function createEmailCollectionScreen(primaryColor, chatbotTitle) {
    const emailScreen = document.createElement('div');
    emailScreen.className = 'email-collection-screen';
    emailScreen.style.borderColor = primaryColor;
    emailScreen.innerHTML = `
        <div class="chatbot-header" style="background-color: ${primaryColor}">
            <h3 class="chatbot-header-title">${chatbotTitle}</h3>
            <button class="chatbot-close-button">✕</button>
        </div>
        <div class="email-collection-content">
            <p>Please enter your email to start chatting</p>
            <input type="email" class="email-input" placeholder="Your email address" required>
            <button class="start-chat-button" style="background-color: ${primaryColor}">Start Chat</button>
        </div>
    `;
    return emailScreen;
}