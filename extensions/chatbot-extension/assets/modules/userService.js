export async function fetchUserIP() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        return await response.json();
    } catch (error) {
        console.error('Error fetching IP:', error);
        return { ip: 'unknown' };
    }
}

export async function fetchUserLocation(ip) {
    if (ip === 'unknown') return { country: 'unknown', city: 'unknown' };
    
    try {
        const response = await fetch(`https://ipapi.co/${ip}/json/`);
        const data = await response.json();
        return {
            country: data.country_name || 'unknown',
            city: data.city || 'unknown',
            region: data.region || 'unknown'
        };
    } catch (error) {
        console.error('Error fetching location:', error);
        return { country: 'unknown', city: 'unknown' };
    }
}

export function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getPersistentUserData() {
    return JSON.parse(localStorage.getItem('chatbotUserData')) || {};
}

export function getSessionData() {
    return JSON.parse(sessionStorage.getItem('chatbotSessionData')) || {};
}

export function hasSubmittedEmail() {
    const userData = getPersistentUserData();
    return !!userData.email;
}

export function initializeUserSession(email) {
    const persistentData = getPersistentUserData();
    const sessionData = {
        ...persistentData,
        email,
        session_start: new Date().toISOString(),
        session_chat_interactions: 0,
        session_products_added_to_cart: 0,
        session_products_purchased: 0
    };
    sessionStorage.setItem('chatbotSessionData', JSON.stringify(sessionData));
    return sessionData;
}

export function updateSessionData(updates) {
    const sessionData = getSessionData();
    const updatedData = { ...sessionData, ...updates };
    sessionStorage.setItem('chatbotSessionData', JSON.stringify(updatedData));
    return updatedData;
}

export function finalizeSession() {
    const sessionData = getSessionData();
    if (!sessionData.email) return;

    const completeSessionData = {
        ...sessionData,
        session_end: new Date().toISOString(),
        total_chat_interactions: sessionData.session_chat_interactions || 0,
        total_products_added_to_cart: sessionData.session_products_added_to_cart || 0,
        total_products_purchased: sessionData.session_products_purchased || 0
    };

    localStorage.setItem('chatbotUserData', JSON.stringify({
        email: sessionData.email,
        first_interaction: sessionData.first_interaction || new Date().toISOString(),
        last_interaction: completeSessionData.session_end
    }));

    sessionStorage.removeItem('chatbotSessionData');
    
    return completeSessionData;
}