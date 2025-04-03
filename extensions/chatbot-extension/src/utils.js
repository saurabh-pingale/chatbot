
export function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function getPersistentUserData() {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE.CHATBOT_USER_DATA)) || {};
}

export function getSessionData() {
    return JSON.parse(sessionStorage.getItem(LOCAL_STORAGE.CHATBOT_SESSION_DATA)) || {};
}
