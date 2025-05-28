import { initializeUserSession } from "../../modules/user/session.module";

const { primaryColor, finalImageUrl, chatbotTitle } = window.chatbotConfig || {};

document.addEventListener('DOMContentLoaded', function () {
    initializeEmailGatePage();
    setupEmailInputValidation();
    setupStartChatHandler();
    setupSkipHandler();
});

function initializeEmailGatePage() {
    const container = document.getElementById('email-gate-container');
    const header = document.getElementById('email-gate-header');
    const title = document.getElementById('email-gate-title');
    const logo = document.getElementById('email-gate-logo');
    const startBtn = document.getElementById('start-chat-btn');

    if (container) container.style.borderColor = primaryColor;
    if (header) header.style.backgroundColor = primaryColor;
    if (title) title.textContent = chatbotTitle;
    if (logo) logo.src = finalImageUrl;
    if (startBtn) startBtn.style.backgroundColor = primaryColor;
}

function setupEmailInputValidation() {
    const emailInput = document.querySelector('.email-input');
    const errorMessage = document.getElementById('email-error');

    emailInput?.addEventListener('input', () => {
        if (isValidEmail(emailInput.value.trim())) {
            errorMessage.classList.add('hidden');
        }
    });
}

function setupStartChatHandler() {
    const emailInput = document.querySelector('.email-input');
    const errorMessage = document.getElementById('email-error');
    const startBtn = document.getElementById('start-chat-btn');

    startBtn?.addEventListener('click', async () => {
        const email = emailInput.value.trim();

        if (!isValidEmail(email)) {
            errorMessage.classList.remove('hidden');
            emailInput.focus();
            return;
        }

        const originalText = startBtn.textContent;
        const loader = createLoader();
        startBtn.innerHTML = '';
        startBtn.appendChild(loader);
        startBtn.disabled = true;

        try {
            await initializeUserSession(email);
            window.chatbotRenderContent?.(true);
        } catch (err) {
            console.error('Session init failed:', err);
            errorMessage.textContent = 'Failed to start chat. Please try again.';
            errorMessage.classList.remove('hidden');
            startBtn.innerHTML = originalText;
            startBtn.disabled = false;
        }
    });
}

function setupSkipHandler() {
    const skipBtn = document.getElementById('skip-btn');

    skipBtn?.addEventListener('click', async () => {
        const originalText = skipBtn.textContent;
        const loader = createLoader('black');
        skipBtn.innerHTML = '';
        skipBtn.appendChild(loader);
        skipBtn.disabled = true;

        try {
            const guestId = `Anonymous_${Date.now()}`;
            await initializeUserSession(guestId);
            window.chatbotRenderContent?.(true);
        } catch (err) {
            console.error('Guest session failed:', err);
            skipBtn.innerHTML = originalText;
            skipBtn.disabled = false;
        }
    });
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function createLoader(color = 'white') {
    const loader = document.createElement('div');
    loader.className = 'circular-loader';
    loader.style.borderTopColor = color;

    loader.innerHTML = `
        <svg class="circular-loader-svg" viewBox="25 25 50 50">
            <circle 
                class="loader-path" 
                cx="50" cy="50" r="20" fill="none" 
                stroke="${color}" stroke-width="3" stroke-miterlimit="10"
            />
        </svg>
    `;

    return loader;
}