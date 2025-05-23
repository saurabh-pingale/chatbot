import { createChatPage } from '../../pages/ChatPage/ChatPage';
import { createEmailGatePage } from '../../pages/EmailGatePage/EmailGatePage';
import { hasSubmittedEmail } from '../user/session.module';
import { userQueries } from '../../utils/queris.config';

export function renderContent(container, primaryColor, shouldOpen = false, finalImageUrl) {
    const hasEmail = hasSubmittedEmail();
    const content = hasEmail
      ? createChatPage('Store Assistant', primaryColor, userQueries, finalImageUrl)
      : createEmailGatePage('Store Assistant', primaryColor, finalImageUrl);
  
    const existingContent = container.querySelector('.chat-page, .email-gate-page');
    if (existingContent) container.removeChild(existingContent);

    content.classList.add('hidden');
    container.appendChild(content);

    if (shouldOpen) {
        content.classList.remove('hidden');
        content.classList.add('open');
    }
  
    return content;
}