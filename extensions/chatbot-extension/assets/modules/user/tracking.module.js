import { SESSION_STORAGE } from '../../constants/storage.constants';
import { getShopId } from '../../utils/shopify.utils';
import { API } from '../../constants/api.constants';

export function trackEvent(eventName, metadata = {}) {
  const session = JSON.parse(sessionStorage.getItem(SESSION_STORAGE.CHATBOT_SESSION_DATA)) || {};
  session[eventName] = (session[eventName] || 0) + 1;
  session.last_activity = new Date().toISOString();

  if (!session.total_chat_interactions) {
    session.total_chat_interactions = 0;
  }

  if (eventName.includes('message') || eventName.includes('chat')) {
    session.total_chat_interactions += 1;
  }

  Object.assign(session, metadata);
  sessionStorage.setItem(SESSION_STORAGE.CHATBOT_SESSION_DATA, JSON.stringify(session));
}

export function setupTracking() {
  const shopId = getShopId();
  console.log("Shop ID:", shopId);
  window.addEventListener('beforeunload', () => {
    const session = JSON.parse(sessionStorage.getItem(SESSION_STORAGE.CHATBOT_SESSION_DATA));
    if (session) {
      const headers = {
        type: 'application/json',
      };

      const blob = new Blob([JSON.stringify({
        shopId: shopId,
        sessionData: session
      })], headers);

      navigator.sendBeacon(`${API.ANALYTICS_ENDPOINT}`, blob);
    }
  });
}