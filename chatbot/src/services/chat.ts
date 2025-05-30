import { API_ENDPOINTS } from '../constants/api';
import type { Message, Product } from '../types';
import { getShopId } from './shopify';

interface ChatResponse {
  answer: string;
  products: Product[];
  history: Message[];
}

interface LocationInfo {
  country: string | null;
  city: string | null;
  region: string | null;
}

interface SessionData {
  email: string;
  ip: string;
  country: string;
  city: string;
  region: string;
  session_start: string;
  interactions: number;
  total_chat_interactions: number;
  products_added_to_cart: number;
  cart_items: any[];
}

export const getIpAddress = async (): Promise<string> => {
  try {
    const response = await fetch(API_ENDPOINTS.IP_INFO);
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (err) {
    console.error('IP fetch failed:', err);
    return 'unknown';
  }
};

export const getLocationInfo = async (ip: string): Promise<LocationInfo> => {
  if (ip === 'unknown') {
    return {
      country: 'unknown',
      city: null,
      region: null
    };
  }

  try {
    const response = await fetch(`${API_ENDPOINTS.LOCATION_INFO}/${ip}/json/`);
    const data = await response.json();
    return {
      country: data.country_name || null,
      city: data.city || null,
      region: data.region || null
    };
  } catch (err) {
    console.error('Location fetch failed:', err);
    return {
      country: null,
      city: null,
      region: null
    };
  }
};

export const initializeSession = async (email: string): Promise<SessionData> => {
  try {
    const ip = await getIpAddress();
    const location = await getLocationInfo(ip);

    const sessionData: SessionData = {
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

    sessionStorage.setItem('chatbotSessionData', JSON.stringify(sessionData));
    return sessionData;
  } catch (err) {
    console.error('Session initialization failed:', err);
    throw err;
  }
};

export const getSessionData = (): SessionData | null => {
  try {
    const data = sessionStorage.getItem('chatbotSessionData');
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Failed to parse session data:', err);
    return null;
  }
};

export const updateSessionData = (data: Partial<SessionData>): boolean => {
  try {
    const currentData = getSessionData();
    const newData = { ...currentData, ...data };
    sessionStorage.setItem('chatbotSessionData', JSON.stringify(newData));
    return true;
  } catch (err) {
    console.error('Failed to update session:', err);
    return false;
  }
};

export const trackEvent = (eventName: string, data: Record<string, any> = {}): void => {
  const sessionData = getSessionData();
  if (!sessionData) return;

  sessionData.interactions = (sessionData.interactions || 0) + 1;

  if (eventName.includes('message') || eventName.includes('chat')) {
    sessionData.total_chat_interactions = (sessionData.total_chat_interactions || 0) + 1;
  }

  updateSessionData({ ...sessionData, ...data });
};

export const sendChatMessage = async (
  messages: Message[],
  userId: string
): Promise<ChatResponse> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000);

  const params = new URLSearchParams({
    shopId: getShopId(),
    user_id: userId || ''
  });

  try {
    const response = await fetch(`${API_ENDPOINTS.AGENT_CONVERSATION}?${params.toString()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ messages }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get bot response');
    }

    return await response.json();
  } catch (error: unknown) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timed out. Please try again.');
    }
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('An unknown error occurred');
  }
};

export const getStoreColor = async (): Promise<string> => {
  try {
    const shopId = getShopId();
    const response = await fetch(`${API_ENDPOINTS.COLOR_PREFERENCE}?shopId=${encodeURIComponent(shopId)}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch color');
    }

    const data = await response.json();
    return data.color;
  } catch (err) {
    console.error('Color fetch error:', err);
    return '#008080'; // Default color
  }
};

export const getStoreImage = async (): Promise<string | null> => {
  try {
    const shopId = getShopId();
    const response = await fetch(`${API_ENDPOINTS.GET_IMAGE}?shopId=${encodeURIComponent(shopId)}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch image');
    }

    const data = await response.json();
    return data.image;
  } catch (err) {
    console.error('Error fetching store image:', err);
    return null;
  }
}; 