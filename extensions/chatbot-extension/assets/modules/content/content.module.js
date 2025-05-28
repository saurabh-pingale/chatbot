import { hasSubmittedEmail } from '../user/session.module.js';
import { userQueries } from '../../utils/queris.config.js';
import EmailGatePage from '../../pages/EmailGatePage/EmailGatePage.html';
import ChatPage from '../../pages/ChatPage/ChatPage.html'

let currentScript = null;

export async function renderContent(container, primaryColor, shouldOpen = false, finalImageUrl) {
  if (!container) return null;

  const hasEmail = hasSubmittedEmail();
  const html = hasEmail ? ChatPage : EmailGatePage;
  
  const contentWrapper = container.querySelector('#chatbot-content');
  if (contentWrapper) {
    contentWrapper.innerHTML = html;
  }

  if (currentScript) {
    document.body.removeChild(currentScript);
    currentScript = null;
  }

  window.chatbotConfig = { primaryColor, finalImageUrl, userQueries };

  const script = document.createElement('script');
  script.type = 'module';

  script.src = hasEmail
    ? new URL('../../pages/ChatPage/ChatPage.js', import.meta.url).href
    : new URL('../../pages/EmailGatePage/EmailGatePage.js', import.meta.url).href;


  document.body.appendChild(script);
  currentScript = script;

  const contentElement = container.querySelector('.chat-page') || container.querySelector('.email-gate-page');

  if (contentElement) {
    contentElement.classList.add('hidden');
    if (shouldOpen) {
      contentElement.classList.remove('hidden');
      contentElement.classList.add('open');
    }
  }

  return contentElement;
}