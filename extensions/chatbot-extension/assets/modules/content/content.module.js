import { hasSubmittedEmail } from '../user/session.module.js';
import { userQueries } from '../../utils/queris.config.js';

export async function renderContent(containerId = 'chatbot-container', primaryColor, finalImageUrl) {
  const hasEmail = hasSubmittedEmail();
  const htmlPath = hasEmail
    ? '/pages/ChatPage/ChatPage.html'
    : '/pages/EmailGatePage/EmailGatePage.html';
  const jsPath = hasEmail
    ? '/pages/ChatPage/ChatPage.js'
    : '/pages/EmailGatePage/EmailGatePage.js';

  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  const response = await fetch(htmlPath);
  const html = await response.text();
  container.innerHTML = html;

  if (currentScript) {
    document.body.removeChild(currentScript);
    currentScript = null;
  }

  window.chatbotConfig = { primaryColor, finalImageUrl, userQueries };

  const script = document.createElement('script');
  script.src = jsPath;
  script.type = 'module';
  document.body.appendChild(script);

  currentScript = script;
}