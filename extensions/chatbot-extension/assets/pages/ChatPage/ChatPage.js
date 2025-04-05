import { createChatHeader } from '../../components/header/ChatHeader/ChatHeader';
import { createMessageList } from '../../components/chat/MessageList/MessageList';
import { createChatInput } from '../../components/input/ChatInput/ChatInput';
import { COLORS } from '../../constants/colors.constants';

export function createChatPage(chatbotTitle = 'Store Assistant') {
    const page = document.createElement('div');
    page.className = 'chat-page';

    const header = createChatHeader(COLORS.PRIMARY, chatbotTitle);
    page.appendChild(header);
 
    const messageList = createMessageList();
    page.appendChild(messageList);
   
    const input = createChatInput(COLORS.PRIMARY);
    page.appendChild(input);
    
    return page;
}