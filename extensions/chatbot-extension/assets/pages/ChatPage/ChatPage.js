import { createChatHeader } from '../../components/header/ChatHeader/ChatHeader';
import { createMessageList } from '../../components/chat/MessageList/MessageList';
import { createChatInput } from '../../components/input/ChatInput/ChatInput';

export function createChatPage(chatbotTitle, primaryColor) {
    const page = document.createElement('div');
    page.className = 'chat-page';

    const header = createChatHeader(primaryColor, "Store Assistant");
    page.appendChild(header);
 
    const messageList = createMessageList();
    page.appendChild(messageList);
   
    const input = createChatInput(primaryColor);
    page.appendChild(input);
    
    return page;
}