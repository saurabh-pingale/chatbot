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
    sessionStorage.setItem(LOCAL_STORAGE.CHATBOT_SESSION_DATA, JSON.stringify(sessionData));
    return sessionData;
}

export function updateSessionData(updates) {
    const sessionData = getSessionData();
    const updatedData = { ...sessionData, ...updates };
    sessionStorage.setItem(LOCAL_STORAGE.CHATBOT_SESSION_DATA, JSON.stringify(updatedData));
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

    localStorage.setItem(LOCAL_STORAGE.CHATBOT_USER_DATA, JSON.stringify({
        email: sessionData.email,
        first_interaction: sessionData.first_interaction || new Date().toISOString(),
        last_interaction: completeSessionData.session_end
    }));

    sessionStorage.removeItem(LOCAL_STORAGE.CHATBOT_SESSION_DATA);
    
    return completeSessionData;
}