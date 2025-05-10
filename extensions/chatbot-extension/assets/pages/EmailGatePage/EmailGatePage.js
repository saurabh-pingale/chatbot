import { isValidEmail } from '../../utils/helpers';
import { initializeUserSession } from '../../modules/user/session.module';
import { createLoader } from '../../components/ui/Loader/Loader';

export function createEmailGatePage(chatbotTitle = 'Store Assistant', primaryColor, finalImageUrl) {
  const page = document.createElement('div');
  page.className = 'email-gate-page';
  page.style.borderColor = primaryColor;
    
  page.innerHTML = `
    <div class="chatbot-header" style="background-color: ${primaryColor}">
      <img src="${finalImageUrl}" alt="Logo" class="chatbot-logo" />
      <h3 class="chatbot-header-title">${chatbotTitle}</h3>
    </div>
    <div class="email-collection-content">
      <p>
        To get started with our chat assistant, please enter your email address. This helps us 
        personalize your experience
      </p>
      <input 
        type="email" 
        class="email-input" 
        placeholder="Your email address" 
        required
        aria-label="Email address"
        aria-describedby="email-error"
        >
      <div id="email-error" class="error-message hidden">Please enter a valid email address</div>
      <button class="start-chat-button" style="background-color: ${primaryColor}">Continue to Chat</button>
      <button class="skip-button">Continue as Guest</button> 
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

    const originalText = startButton.textContent;
    const loader = createLoader();
    startButton.innerHTML = '';
    startButton.appendChild(loader);
    startButton.disabled = true;
    
    try {
      await initializeUserSession(email);
      
      if (window.chatbotRenderContent) {
        window.chatbotRenderContent(true);
      }
      
    } catch (error) {
      console.error('Session initialization failed:', error);
      errorMessage.textContent = 'Failed to start chat. Please try again.';
      errorMessage.classList.remove('hidden');

      startButton.removeChild(loader);
      startButton.textContent = originalText;
      startButton.disabled = false;
    }
  });

  emailInput.addEventListener('input', () => {
    if (isValidEmail(emailInput.value.trim())) {
      errorMessage.classList.add('hidden');
    }
  });

  skipButton.addEventListener('click', async () => {
    const originalText = skipButton.textContent;
    const loader = createLoader('black');
    skipButton.innerHTML = '';
    skipButton.appendChild(loader);
    skipButton.disabled = true;

    try {
      const anonymousId = `Anonymous_${Date.now()}`;
      await initializeUserSession(anonymousId);

      if (window.chatbotRenderContent) {
          window.chatbotRenderContent(true);
      }
    } catch (error) {
        console.error('Session initialization failed:', error);
    
        skipButton.removeChild(loader);
        skipButton.textContent = originalText;
        skipButton.disabled = false;
    }
  });
  
  return page;
}