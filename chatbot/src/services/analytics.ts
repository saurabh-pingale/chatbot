import { API_ENDPOINTS } from '../constants/api';
import { getAuthToken } from '../utils/auth';
import { getOrCreateGuestId } from '../utils/guest';
import { getShopId } from '../utils/utils';
import { fetchWithTokenRefresh } from '../utils/api';
import type { LocationInfo } from '../types';

const makeRequest = async (endpoint: string, originalBody: object = {}) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const token = getAuthToken();
  const body = { ...originalBody };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    (body as any).guest_id = getOrCreateGuestId();
  }

  try {
    const response = await fetchWithTokenRefresh(endpoint, {
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

export const trackOpenedChatbot = (
  userId: string | null,
  shopId: string,
  utmParams: any,
  locationInfo: LocationInfo | null
) => {
  const payload = {
    user_id: userId,
    guest_id: userId ? null : getOrCreateGuestId(),
    shop_id: shopId,
    utm_params: utmParams,
    location_info: locationInfo,
  };
  
  makeRequest(API_ENDPOINTS.TRACK_OPENED_CHATBOT, payload);
};

export const trackAddedToCart = () => {
  makeRequest(API_ENDPOINTS.TRACK_ADDED_TO_CART, {
    shop_id: getShopId() 
  });
};

export const trackPurchase = (amount: number) => {
   makeRequest(API_ENDPOINTS.TRACK_PURCHASE, {
    amount,
    shop_id: getShopId(),
  });
}; 