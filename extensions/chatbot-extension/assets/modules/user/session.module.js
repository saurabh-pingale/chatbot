import { fetchUserIP, fetchUserLocation } from '../api/external.module';
import { getSessionData, updateSessionData } from '../../utils/session.utils';

export async function initializeUserSession(email) {
  try {
    const ipData = await fetchUserIP();
    const ip = ipData.ip || 'unknown';

    const location = await fetchUserLocation(ip);

    const sessionData = {
      email,
      ip,
      country: location.country || 'unknown',  
      city: location.city || 'unknown',
      region: location.region || 'unknown',
      session_start: new Date().toISOString(),
      interactions: 0,
      total_chat_interactions: 0,
      products_added_to_cart: 0,
      cart_items: []
    };

    const storageSuccess = updateSessionData(sessionData);
    if (!storageSuccess) throw new Error('Failed to store session');

    const storedData = getSessionData();

    return storedData;
  } catch (error) {
    console.error('Session initialization failed:', error);
    throw error; 
  }
}

export function hasSubmittedEmail() {
  const session = getSessionData();
  const hasEmail = !!session.email;
  return hasEmail;
}