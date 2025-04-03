import { COLORS } from './constants/colors.constants';
import { createChatPage } from './pages/ChatPage/ChatPage';
import { createEmailGatePage } from './pages/EmailGatePage/EmailGatePage';
import { initChatModule } from './modules/chat/chat.module'; 
import { initCartModule } from './modules/cart/cart.module'; 
import { initColorTheme } from './modules/color/color.module';
import { hasSubmittedEmail } from './modules/user/session.module';
import { setupTracking } from './modules/user/tracking.module'; 
import { createToggleButton } from './components/ui/ToggleButton/ToggleButton';

document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('shopify-chatbot');
    if (!container) {
        console.error('Chatbot container not found');
        return;
    }

    container.style.setProperty('--primary-color', COLORS.PRIMARY);
    container.style.setProperty('--text-color', COLORS.TEXT);

    const primaryColor = await initColorTheme();

    const toggleButton = createToggleButton(primaryColor); 
    const chatPage = createChatPage('Store Assistant', primaryColor); 
    const emailPage = createEmailGatePage('Store Assistant'); 
    
    initCartModule();
    setupTracking(); 

    const mainContent = hasSubmittedEmail() ? chatPage : emailPage;
    container.appendChild(toggleButton);
    container.appendChild(mainContent);

    if (hasSubmittedEmail()) {
        initChatModule(primaryColor);
    }
});