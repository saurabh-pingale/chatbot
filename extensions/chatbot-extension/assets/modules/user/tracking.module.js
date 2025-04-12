import { LOCAL_STORAGE } from '../../constants/storage.constants';
import { getShopId } from '../../utils/shopify.utils';

export function trackEvent(eventName, metadata = {}) {
  const session = JSON.parse(sessionStorage.getItem(LOCAL_STORAGE.CHATBOT_SESSION_DATA)) || {};
  session[eventName] = (session[eventName] || 0) + 1;
  session.last_activity = new Date().toISOString();

  if (!session.total_chat_interactions) {
    session.total_chat_interactions = 0;
  }

  if (eventName.includes('message') || eventName.includes('chat')) {
    session.total_chat_interactions += 1;
  }

  Object.assign(session, metadata);
  sessionStorage.setItem(LOCAL_STORAGE.CHATBOT_SESSION_DATA, JSON.stringify(session));
}

export function setupTracking() {
  const shopId = getShopId();
  window.addEventListener('beforeunload', () => {
    const session = JSON.parse(sessionStorage.getItem(LOCAL_STORAGE.CHATBOT_SESSION_DATA));
    if (session) {
      navigator.sendBeacon(`/apps/chatbot-api/store-session?shopId=${encodeURIComponent(shopId)}`, JSON.stringify(session));
    }
  });
}