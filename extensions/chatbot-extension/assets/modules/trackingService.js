import { updateSessionData, finalizeSession, getSessionData } from './userService';

export function trackUserInteraction(type) {
    const sessionData = updateSessionData({
        [`session_${type}`]: (getSessionData()[`session_${type}`] || 0) + 1,
        last_interaction: new Date().toISOString()
    });
    return sessionData;
}

export function setupTrackingListeners() {
    window.addEventListener('load', () => {
        document.addEventListener('productAddedToCart', () => {
            trackUserInteraction('products_added_to_cart');
        });

        document.addEventListener('productPurchased', () => {
            trackUserInteraction('products_purchased');
        });
    });

    window.addEventListener('beforeunload', () => {
        const finalizedData = finalizeSession();
        if (finalizedData) {
            const blob = new Blob([JSON.stringify(finalizedData)], { type: 'application/json' });
            navigator.sendBeacon('/apps/chatbot-api/store-session', blob);
        }
    });
}