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

  window.chatbotConfig = { primaryColor, finalImageUrl, userQueries };

  if (hasEmail) {
    import('../../pages/ChatPage/ChatPage.js');
  } else {
    import('../../pages/EmailGatePage/EmailGatePage.js');
  }

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