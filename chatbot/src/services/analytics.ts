import { API_ENDPOINTS } from '../constants/api';
import { getAuthToken } from '../utils/auth';

const makeRequest = async (endpoint: string, body: object = {}, isAuthenticated: boolean = false) => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (isAuthenticated) {
    const token = getAuthToken();
    if (!token) {
      console.error("Analytics tracking failed: No auth token available.");
      return;
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: Object.keys(body).length ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to track event at ${endpoint}:`, response.status, errorText);
    }
  } catch (error) {
    console.error(`Error tracking event at ${endpoint}:`, error);
  }
};

const makeAuthenticatedRequest = async (endpoint: string, body: object = {}) => {
  return makeRequest(endpoint, body, true);
};

export const trackOpenedChatbot = () => {
  makeRequest(API_ENDPOINTS.TRACK_OPENED_CHATBOT, {}, false);
};

export const trackAddedToCart = () => {
  makeAuthenticatedRequest(API_ENDPOINTS.TRACK_ADDED_TO_CART);
};

export const trackPurchase = (amount: number) => {
  makeAuthenticatedRequest(API_ENDPOINTS.TRACK_PURCHASE, { amount });
}; 