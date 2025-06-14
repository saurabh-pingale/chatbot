import { API_ENDPOINTS } from '../constants/api';
import { getAuthToken } from '../utils/auth';
import { getOrCreateGuestId } from '../utils/guest';
import { getShopId } from '../utils/utils';

const makeRequest = async (endpoint: string, body: object = {}) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    (body as any).guest_id = getOrCreateGuestId();
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to track event at ${endpoint}:`, response.status, errorText);
    }
  } catch (error) {
    console.error(`Error tracking event at ${endpoint}:`, error);
  }
};

export const trackOpenedChatbot = (userId: string | null, shopId: string, utmParams: any) => {
  const isGuest = !userId;
  const guestId = isGuest ? getOrCreateGuestId() : null;
  
  fetch(API_ENDPOINTS.TRACK_OPENED_CHATBOT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      user_id: userId,
      guest_id: guestId,
      shop_id: shopId, 
      utm_params: utmParams,
      is_guest: isGuest 
    }),
  }).catch(error => console.error(`Error tracking event at ${API_ENDPOINTS.TRACK_OPENED_CHATBOT}:`, error));
};

export const trackAddedToCart = () => {
  const shopId = getShopId();
  if (!getAuthToken()) {
    makeRequest(API_ENDPOINTS.TRACK_ADDED_TO_CART, { shop_id: shopId });
  } else {
    makeRequest(API_ENDPOINTS.TRACK_ADDED_TO_CART, {});
  }
};

export const trackPurchase = (amount: number) => {
  const shopId = getShopId();
  if (!getAuthToken()) {
    makeRequest(API_ENDPOINTS.TRACK_PURCHASE, { amount, shop_id: shopId });
  } else {
    makeRequest(API_ENDPOINTS.TRACK_PURCHASE, { amount });
  }
}; 