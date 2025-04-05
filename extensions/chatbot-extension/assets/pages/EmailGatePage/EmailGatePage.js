import { COLORS } from '../../constants/colors.constants';
import { isValidEmail } from '../../utils/helpers';
import { initializeUserSession } from '../../modules/user/session.module';

export function createEmailGatePage(chatbotTitle = 'Store Assistant') {
  const page = document.createElement('div');
  page.className = 'email-gate-page';
  
  page.innerHTML = `
    <div class="chatbot-header" style="background-color: ${COLORS.PRIMARY}">
      <h3 class="chatbot-header-title">${chatbotTitle}</h3>
      <button class="chatbot-close-button">✕</button>
    </div>
    <div class="email-collection-content">
      <p>Please enter your email to start chatting12390</p>
      <input type="email" class="email-input" placeholder="Your email address" required>
      <div class="error-message hidden">Please enter a valid email address</div>
      <button class="start-chat-button" style="background-color: ${COLORS.PRIMARY}">Start Chat</button>
    </div>
  `;

  const emailInput = page.querySelector('.email-input');
  const errorMessage = page.querySelector('.error-message');
  const startButton = page.querySelector('.start-chat-button');
  const closeButton = page.querySelector('.chatbot-close-button');
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
        window.chatbotRenderContent();
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

  closeButton.addEventListener('click', () => {
    page.classList.remove('open');
  });
  
  return page;
}