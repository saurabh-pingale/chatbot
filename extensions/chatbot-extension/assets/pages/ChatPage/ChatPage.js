import { initChatModule, loadChatHistoryFromSession } from './modules/chat.module.js';
import { initCartModule } from './modules/cart/cart.module.js';
import { openCartDrawer, closeCartDrawer, getCartItems, syncWithStoreCart } from './services/cart.service.js';
import { createLoader } from './components/ui/Loader/Loader.js';

const { primaryColor, finalImageUrl, chatbotTitle, userQueries } = window.chatbotConfig || {};

document.addEventListener('DOMContentLoaded', () => {
    initChatHeader();
    initUserQuerySlider();
    initInputComponent();
    initCartDrawer();
    initChatModules();
});

function initChatHeader() {
    const chatHeader = document.getElementById('chat-header');
    const chatLogo = document.getElementById('chat-logo');
    const chatTitle = document.getElementById('chat-title');
    const cartIcon = document.getElementById('cart-icon');

    chatHeader.style.setProperty('--glass-primary', primaryColor);
    cartIcon.style.backgroundColor = primaryColor;

    chatLogo.src = finalImageUrl;
    chatTitle.textContent = chatbotTitle;
}

function initUserQuerySlider() {
    const querySlider = document.getElementById('query-slider');
    userQueries.forEach(query => {
        const button = document.createElement('button');
        button.className = 'user-query-button';
        button.textContent = query;
        button.addEventListener('click', () => {
            window.sendChatMessage?.(query);
        });
        querySlider.appendChild(button);
    });
}

function initInputComponent() {
    const inputBox = document.querySelector('.input-box');
    const sendButton = document.querySelector('.send-button');

    sendButton.style.backgroundColor = primaryColor;

    inputBox.addEventListener('input', () => {
        inputBox.style.height = 'auto';
        inputBox.style.height = `${inputBox.scrollHeight}px`;
        sendButton.disabled = inputBox.value.trim() === '';
    });

    const sendMessage = () => {
        const msg = inputBox.value.trim();
        if (msg) {
            window.sendChatMessage(msg);
            inputBox.value = '';
            inputBox.dispatchEvent(new Event('input'));
        }
    };

    sendButton.addEventListener('click', sendMessage);

    inputBox.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

function initCartDrawer() {
    const cartIcon = document.querySelector('.chatbot-cart-icon');
    const closeButton = document.querySelector('.cart-drawer-close');
    const checkoutButton = document.querySelector('.checkout-button');

    cartIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        openCartDrawer();
    });

    closeButton.addEventListener('click', closeCartDrawer);

    checkoutButton.addEventListener('click', async (e) => {
        e.preventDefault();
        const button = e.target;
        const originalText = button.textContent;

        const loader = createLoader();
        button.innerHTML = '';
        button.appendChild(loader);
        button.disabled = true;

        try {
            const items = getCartItems();
            const syncSuccess = await syncWithStoreCart(items);

            if (syncSuccess) {
                window.location.href = '/cart';
            } else {
                alert('Failed to sync cart. Please try again.');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            alert('An error occurred during checkout.');
        } finally {
            button.removeChild(loader);
            button.textContent = originalText;
            button.disabled = false;
        }
    });
}

function initChatModules() {
    initChatModule(primaryColor);
    initCartModule();
    loadChatHistoryFromSession(primaryColor);
}