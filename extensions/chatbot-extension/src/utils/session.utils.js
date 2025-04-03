import { LOCAL_STORAGE } from '../constants/storage.constants';

export function getSessionData() {
  try {
    const data = sessionStorage.getItem(LOCAL_STORAGE.CHATBOT_SESSION_DATA);
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
    sessionStorage.setItem(LOCAL_STORAGE.CHATBOT_SESSION_DATA, serialized);
    console.log('Session updated:', serialized); 
    return true;
  } catch (error) {
    console.error('Failed to update session:', error);
    return false;
  }
}