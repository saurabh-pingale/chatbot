import { createChatHeader } from '../../components/header/ChatHeader/ChatHeader';
import { createMessageList } from '../../components/chat/MessageList/MessageList';
import { createChatInput } from '../../components/input/ChatInput/ChatInput';
import { createUserQuerySlider } from '../../components/query-slider/UserQuerySlider';

export function createChatPage(chatbotTitle, primaryColor, userQueries, finalImageUrl) { 
    const page = document.createElement('div');
    page.className = 'chat-page';

    const header = createChatHeader('#00A8E8', chatbotTitle, finalImageUrl);
    page.appendChild(header);

    const chatContent = document.createElement('div');
    chatContent.className = 'chat-content';
 
    const messageList = createMessageList();
    chatContent.appendChild(messageList);

    page.appendChild(chatContent);

    const querySlider = createUserQuerySlider(userQueries, (query) => {
        if (typeof window.sendChatMessage === 'function') {
            window.sendChatMessage(query); 
        }
    });

    const input = createChatInput(primaryColor);
    
    page.appendChild(querySlider);
    page.appendChild(input);

    return page;
}