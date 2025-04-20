import { createChatHeader } from '../../components/header/ChatHeader/ChatHeader';
import { createMessageList } from '../../components/chat/MessageList/MessageList';
import { createChatInput } from '../../components/input/ChatInput/ChatInput';
import { createUserQuerySlider } from '../../components/query-slider/UserQuerySlider';

export function createChatPage(chatbotTitle, primaryColor, userQueries) { 
    const page = document.createElement('div');
    page.className = 'chat-page';

    //TODO - Image should come from db where shopify admin will be uploaded also fallback if image is not uploaded
    const header = createChatHeader('#00A8E8', chatbotTitle, "https://uploads.servicebell.com/cdn-cgi/image/width=320,height=320,f=auto/widget-org-logos/770540926.533a796cc2644e93a2bb3dec2b40c3f2.png");
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