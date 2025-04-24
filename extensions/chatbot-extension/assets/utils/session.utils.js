import { SESSION_STORAGE } from '../constants/storage.constants';

export function getSessionData() {
  try {
    const data = sessionStorage.getItem(SESSION_STORAGE.CHATBOT_SESSION_DATA);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Failed to parse session data:', error);
    return {};
  }
}

export function updateSessionData(data) {
  try {
    const serialized = JSON.stringify({
      ...getSessionData(), 
      ...data             
    });
    sessionStorage.setItem(SESSION_STORAGE.CHATBOT_SESSION_DATA, serialized);
    return true;
  } catch (error) {
    console.error('Failed to update session:', error);
    return false;
  }
}