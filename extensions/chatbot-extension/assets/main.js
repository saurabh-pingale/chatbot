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

    container.style.setProperty('--primary-color', COLORS.ORANGE_450);
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
        
        toggleButton.innerHTML = isOpen ? ' <svg viewBox="0 0 8 6" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.99953 5.5C4.10856 5.50013 4.21636 5.47701 4.31574 5.43218C4.41513 5.38734 4.50381 5.32183 4.57586 5.24L7.84619 1.52267C7.94956 1.39948 8.00062 1.24075 7.98847 1.0804C7.97632 0.920059 7.90192 0.770831 7.78118 0.664629C7.66043 0.558428 7.50293 0.503682 7.34234 0.512098C7.18176 0.520514 7.03084 0.591424 6.92186 0.709666L4.06219 3.96033C4.05437 3.96926 4.04473 3.97641 4.03393 3.9813C4.02312 3.9862 4.01139 3.98874 3.99953 3.98874C3.98766 3.98874 3.97593 3.9862 3.96512 3.9813C3.95432 3.97641 3.94468 3.96926 3.93686 3.96033L1.07719 0.709666C1.02445 0.646808 0.95967 0.595127 0.886666 0.557662C0.813662 0.520197 0.733906 0.497703 0.652084 0.491504C0.570263 0.485304 0.488028 0.495522 0.410212 0.521559C0.332397 0.547596 0.26057 0.588926 0.198956 0.643119C0.137342 0.697312 0.0871826 0.763274 0.0514265 0.83713C0.0156699 0.910986 -0.00496191 0.991244 -0.00925631 1.07319C-0.0135507 1.15513 -0.00142188 1.23711 0.0264187 1.3143C0.0542589 1.39148 0.0972476 1.46233 0.152859 1.52267L3.42219 5.23867C3.49437 5.32069 3.58319 5.38642 3.68273 5.43148C3.78227 5.47654 3.89026 5.4999 3.99953 5.5Z" fill="currentColor"></path></svg> ' : '<img src="https://uploads.servicebell.com/cdn-cgi/image/width=320,height=320,f=auto/widget-org-logos/770540926.533a796cc2644e93a2bb3dec2b40c3f2.png" alt="Logo" class="chatbot-logo" />';
    });

    setupTracking();
});