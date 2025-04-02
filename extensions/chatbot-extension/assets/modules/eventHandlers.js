import { initChat } from './chatLogic';
import { trackUserInteraction } from './trackingService';
import { initializeUserSession, isValidEmail, fetchUserIP, fetchUserLocation, hasSubmittedEmail } from './userService';

export function setupToggleButtonHandler(toggleButton, emailCollectionScreen, chatbotWindow, primaryColor) {
    toggleButton.addEventListener('click', () => {
        if (!hasSubmittedEmail()) {
            emailCollectionScreen.classList.toggle('open');
            if (emailCollectionScreen.classList.contains('open')) {
                toggleButton.innerHTML = '×';
                emailCollectionScreen.querySelector('.email-input').focus();
            } else {
                toggleButton.innerHTML = '💬';
            }
        } else {
            chatbotWindow.classList.toggle('open');
            if (chatbotWindow.classList.contains('open')) {
                toggleButton.innerHTML = '×';
                document.querySelector('.input-box').focus();
            } else {
                toggleButton.innerHTML = '💬';
            }
        }
    });
}

export function setupEmailSubmissionHandler(emailCollectionScreen, chatbotWindow, toggleButton, primaryColor) {
    emailCollectionScreen.querySelector('.start-chat-button').addEventListener('click', async () => {
        const emailInput = emailCollectionScreen.querySelector('.email-input');
        const email = emailInput.value.trim();
        
        if (!email || !isValidEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }

        try {
            const ipData = await fetchUserIP();
            const locationData = await fetchUserLocation(ipData.ip);

            const userData = initializeUserSession(email, {
                ip: ipData.ip,
                location: locationData
            });

            localStorage.setItem('chatbotUserData', JSON.stringify({
                email,
                first_interaction: userData.first_interaction || new Date().toISOString()
            }));

            emailCollectionScreen.classList.remove('open');
            chatbotWindow.classList.add('open');
            toggleButton.innerHTML = '×';
            document.querySelector('.input-box').focus();

            initChat(primaryColor);
            trackUserInteraction('chat_interactions');
        } catch (error) {
            console.error('Error collecting user data:', error);
            alert('Failed to start chat. Please try again.');
        }
    });
}

export function setupCloseButtonHandlers(emailCollectionScreen, chatbotWindow, toggleButton) {
    emailCollectionScreen.querySelector('.chatbot-close-button').addEventListener('click', () => {
        emailCollectionScreen.classList.remove('open');
        toggleButton.innerHTML = '💬';
    });

    chatbotWindow.querySelector('.chatbot-close-button').addEventListener('click', () => {
        chatbotWindow.classList.remove('open');
        toggleButton.innerHTML = '💬';
    });
}