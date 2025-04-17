import { COLORS } from './constants/colors.constants';
import { initChatModule } from './modules/chat/chat.module'; 
import { initColorTheme } from './modules/color/color.module';
import { createToggleButton } from './components/ui/ToggleButton/ToggleButton';
import { hasSubmittedEmail } from './modules/user/session.module';
import { initCartModule } from './modules/cart/cart.module';
import { renderContent } from './modules/content/content.module';
import { setupTracking } from './modules/user/tracking.module';
import { createLoader } from './components/ui/Loader/Loader';

let currentContent = null;
let isOpen = false;
document.addEventListener('DOMContentLoaded', async () => {
    const container = document.getElementById('shopify-chatbot');
    if (!container) {
        console.error('Chatbot container not found');
        return;
    }

    const colorLoader = createLoader();
    container.appendChild(colorLoader);

    container.style.setProperty('--primary-color', COLORS.TEAL_400);
    container.style.setProperty('--text-color', COLORS.WHITE_100);

    const primaryColor = await initColorTheme();
    container.removeChild(colorLoader);
    
    const toggleButton = createToggleButton(primaryColor); 
    container.appendChild(toggleButton);

    window.chatbotRenderContent = (shouldOpen) => {
        currentContent = renderContent(container, primaryColor, shouldOpen);
        if (shouldOpen && hasSubmittedEmail()) {
            initChatModule(primaryColor);
        }

        if (currentContent.classList.contains('chat-page')) {
            initCartModule();
        }
        return currentContent;
    };

    currentContent = renderContent(container, primaryColor, false);
    
    toggleButton.addEventListener('click', () => {
        isOpen = !isOpen;
        
        if (isOpen) {
            currentContent.classList.remove('hidden');
                currentContent.classList.add('open');
                if (hasSubmittedEmail()) {
                    initChatModule(primaryColor);
                    document.querySelector('.input-box')?.focus();
                }

                if (currentContent.classList.contains('chat-page')) {
                    initCartModule();
                }
        } else {
            currentContent.classList.remove('open');
            currentContent.classList.add('hidden');
        }
        
        toggleButton.innerHTML = isOpen ? 'x' : '💬';
    });

    setupTracking();
});