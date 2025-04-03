import { initColorPreference } from './modules/colorHandling';
import { createToggleButton, createChatbotWindow, createEmailCollectionScreen } from './modules/uiElements';
import { initChat } from './modules/chatLogic';
import { initCartDrawer } from './modules/cartService';
import { hasSubmittedEmail } from './modules/userService';
import { setupTrackingListeners } from './modules/trackingService';
import { 
    setupToggleButtonHandler, 
    setupEmailSubmissionHandler, 
    setupCloseButtonHandlers 
} from './modules/eventHandlers';

document.addEventListener('DOMContentLoaded', function() {
    try{
        const container = document.getElementById('shopify-chatbot');
        if (!container) return;

        //TODO - Create a file color.js in constants folder and move it and import from it
        const primaryColor = '#008080';
        const textColor = '#f8f8f8';
        const chatbotTitle = 'Store Assistant';

        container.style.setProperty('--primary-color', primaryColor);
        container.style.setProperty('--text-color', textColor);

        const toggleButton = createToggleButton(primaryColor);
        container.appendChild(toggleButton);

        const emailCollectionScreen = createEmailCollectionScreen(primaryColor, chatbotTitle);
        container.appendChild(emailCollectionScreen);

        const chatbotWindow = createChatbotWindow(primaryColor, chatbotTitle);
        container.appendChild(chatbotWindow);

        initCartDrawer();

        if (hasSubmittedEmail()) {
            initChat(primaryColor);
        }

        setupToggleButtonHandler(toggleButton, emailCollectionScreen, chatbotWindow, primaryColor);
        setupEmailSubmissionHandler(emailCollectionScreen, chatbotWindow, toggleButton, primaryColor);
        setupCloseButtonHandlers(emailCollectionScreen, chatbotWindow, toggleButton);

        initColorPreference(primaryColor);
        setupTrackingListeners();
    } catch (error) {
        console.error("Initialization error:", error);
    }
});