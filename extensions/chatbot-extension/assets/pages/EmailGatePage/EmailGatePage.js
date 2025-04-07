import { isValidEmail } from '../../utils/helpers';
import { initializeUserSession } from '../../modules/user/session.module';

export function createEmailGatePage(chatbotTitle = 'Store Assistant', primaryColor) {
  const page = document.createElement('div');
  page.className = 'email-gate-page';
  
  page.innerHTML = `
    <div class="chatbot-header" style="background-color: ${primaryColor}">
      <h3 class="chatbot-header-title">${chatbotTitle}</h3>
    </div>
    <div class="email-collection-content">
      <p>Please enter your email to start chatting</p>
      <input type="email" class="email-input" placeholder="Your email address" required>
      <div class="error-message hidden">Please enter a valid email address</div>
      <button class="start-chat-button" style="background-color: ${primaryColor}">Start Chat</button>
      <button class="skip-button">Skip</button> 
    </div>
  `;

  const emailInput = page.querySelector('.email-input');
  const errorMessage = page.querySelector('.error-message');
  const startButton = page.querySelector('.start-chat-button');
  const skipButton = page.querySelector('.skip-button');

  startButton.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    
    if (!isValidEmail(email)) {
      errorMessage.classList.remove('hidden');
      emailInput.focus();
      return;
    }
    
    try {
      await initializeUserSession(email);
      
      if (window.chatbotRenderContent) {
        window.chatbotRenderContent(true);
      }
      
    } catch (error) {
      console.error('Session initialization failed:', error);
      errorMessage.textContent = 'Failed to start chat. Please try again.';
      errorMessage.classList.remove('hidden');
    }
  });

  emailInput.addEventListener('input', () => {
    if (isValidEmail(emailInput.value.trim())) {
      errorMessage.classList.add('hidden');
    }
  });

  skipButton.addEventListener('click', async () => {
    const anonymousId = `Anonymous_${Date.now()}`;
    await initializeUserSession(anonymousId);

    if (window.chatbotRenderContent) {
      window.chatbotRenderContent(true);
    }
  });
  
  return page;
}