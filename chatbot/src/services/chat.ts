import { API_ENDPOINTS } from '../constants/api';
import { COLORS } from '../constants/colors';
import { IMAGE } from '../constants/image';
import { getShopId } from '../utils/utils';
import type { ChatResponse, LocationInfo, Message, AnalyticsData, PurchasedItem, CartItem } from '../types';

let hasAttemptedAnalyticsSend = false;

export const getIpAddress = async (): Promise<string> => {
  try {
    const response = await fetch(API_ENDPOINTS.IP_INFO);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('IP fetch failed:', response.status, errorText);
      return 'unknown';
    }
    const data = await response.json();
    return data.ip || 'unknown';
  } catch (err) {
    console.error('IP fetch failed:', err);
    return 'unknown';
  }
};

export const getLocationInfo = async (ip: string): Promise<LocationInfo> => {
  if (ip === 'unknown' || !ip) {
    return {
      country: 'unknown',
      city: null,
      region: null
    };
  }

  try {
    const response = await fetch(`${API_ENDPOINTS.LOCATION_INFO}/${ip}/json/`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Location fetch failed:', response.status, errorText);
      return {
        country: null,
        city: null,
        region: null
      };
    }
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

export const initializeSession = async (email: string): Promise<AnalyticsData> => {
  try {
    const ip = await getIpAddress();
    const location = await getLocationInfo(ip);
    const shopId = getShopId();

    const analyticsData: AnalyticsData = {
      email,
      ip,
      country: location.country || 'unknown',
      city: location.city || 'unknown',
      region: location.region || 'unknown',
      session_start: new Date().toISOString(),
      interactions: 0,
      total_chat_interactions: 0,
      products_added_to_cart: 0,
      cart_items: [],
      products_purchased: 0,
      total_purchase_value: 0,
      purchased_items: [],
      is_anonymous: email.startsWith('Anonymous_'),
      shop_id: shopId
    };

    sessionStorage.setItem('AnalyticsData', JSON.stringify(analyticsData));
    hasAttemptedAnalyticsSend = false;
    return analyticsData;
  } catch (err) {
    console.error('Session initialization failed:', err);
    throw err;
  }
};

export const getSessionData = (): AnalyticsData | null => {
  try {
    const data = sessionStorage.getItem('AnalyticsData');
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error('Failed to parse session data:', err);
    return null;
  }
};

export const updateSessionData = (data: Partial<AnalyticsData>): boolean => {
  try {
    const currentData = getSessionData();
    const newData = { ...currentData, ...data, shop_id: currentData?.shop_id || getShopId() };
    sessionStorage.setItem('AnalyticsData', JSON.stringify(newData));
    return true;
  } catch (err) {
    console.error('Failed to update session:', err);
    return false;
  }
};

export const trackEvent = (eventName: string, eventData: Record<string, any> = {}): void => {
  const session = getSessionData();
  if (!session) {
    console.warn('trackEvent: No session data found. Cannot track event:', eventName);
    return;
  }

  let updatedSession: Partial<AnalyticsData> = {
    interactions: (session.interactions || 0) + 1,
  };

  if (eventName.toLowerCase().includes('message') || eventName.toLowerCase().includes('chat')) {
    updatedSession.total_chat_interactions = (session.total_chat_interactions || 0) + 1;
  }

  if (eventName === 'productAddedToCart') {
    const itemToAdd = eventData.item as CartItem;
    if (!itemToAdd || !itemToAdd.id || typeof itemToAdd.quantity !== 'number') {
      console.warn('trackEvent: Invalid item data for productAddedToCart', itemToAdd);
      return;
    }

    updatedSession.products_added_to_cart = (session.products_added_to_cart || 0) + itemToAdd.quantity;
    
    const existingCartItems = session.cart_items || [];
    const itemIndex = existingCartItems.findIndex(ci => ci.id === itemToAdd.id && ci.variant_id === itemToAdd.variant_id); // Consider variants

    let newCartItems: CartItem[];
    if (itemIndex > -1) {
      newCartItems = existingCartItems.map((ci, index) => 
        index === itemIndex ? { ...ci, quantity: ci.quantity + itemToAdd.quantity } : ci
      );
    } else {
      newCartItems = [...existingCartItems, itemToAdd];
    }
    updatedSession.cart_items = newCartItems;
    console.log('productAddedToCart: Updated cart items', newCartItems);
  }

  if (eventName === 'productPurchased') {
    const purchasedItemsArray = eventData.items as PurchasedItem[] | undefined;
    const totalValue = eventData.value as number | undefined;

    if (!purchasedItemsArray || !Array.isArray(purchasedItemsArray) || purchasedItemsArray.length === 0) {
      console.warn('trackEvent: Invalid items data for productPurchased', purchasedItemsArray);
      if (typeof totalValue === 'number') {
         updatedSession.total_purchase_value = (session.total_purchase_value || 0) + totalValue;
      } else {
        return;
      }
    } else { 
      updatedSession.products_purchased = (session.products_purchased || 0) + purchasedItemsArray.reduce((sum, item) => sum + item.quantity, 0);
      updatedSession.purchased_items = [...(session.purchased_items || []), ...purchasedItemsArray];
  
      if (typeof totalValue === 'number') {
        updatedSession.total_purchase_value = (session.total_purchase_value || 0) + totalValue;
      } else {
        const calculatedValue = purchasedItemsArray.reduce((sum, item) => sum + (item.revenue || 0), 0);
        if (calculatedValue > 0) {
            updatedSession.total_purchase_value = (session.total_purchase_value || 0) + calculatedValue;
        } else {
            console.warn('trackEvent(productPurchased): Items provided but no total value or item revenue to sum.');
        }
      }
    }
    
    updatedSession.cart_items = [];
    updatedSession.products_added_to_cart = 0;
    console.log('productPurchased: Updated purchase analytics', updatedSession);
  }

  if (eventName === 'cartCleared') {
    updatedSession.cart_items = [];
    updatedSession.products_added_to_cart = 0;
    console.log('cartCleared: Cart has been cleared.');
  }
  
  updateSessionData(updatedSession);
};

export const sendChatMessage = async (
  messages: Message[],
  userId: string
): Promise<ChatResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  const shopId = getShopId();
  const params = new URLSearchParams({
    shopId: shopId,
    user_id: userId || ''
  });

  trackEvent('chatMessageSent');

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

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Chat API Error:", response.status, errorText);
      try {
        const errorJson = JSON.parse(errorText);
         throw new Error(errorJson.message || `Failed to get bot response (status ${response.status})`);
      } catch(e){
         throw new Error(`Failed to get bot response (status ${response.status}): ${errorText}`);
      }
    }
    
    const responseData: ChatResponse = await response.json();
    trackEvent('chatMessageReceived');
    return responseData;

  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    }
    throw new Error('An unknown error occurred during chat.');
  }
};

export const getStoreColor = async (): Promise<string> => {
  try {
    const shopId = getShopId();
    if (!shopId) return COLORS.ORANGE_450;

    const response = await fetch(`${API_ENDPOINTS.COLOR_PREFERENCE}?shopId=${encodeURIComponent(shopId)}`);
    
    if (!response.ok) {
      console.error('Failed to fetch color:', response.status, await response.text());
      return COLORS.ORANGE_450;
    }

    const data = await response.json();
    return data.color || COLORS.ORANGE_450;
  } catch (err) {
    console.error('Color fetch error:', err);
    return COLORS.ORANGE_450;
  }
};

export const getStoreImage = async (): Promise<string> => {
  try {
    const shopId = getShopId();
    if (!shopId) return IMAGE.FALLBACK;

    const response = await fetch(`${API_ENDPOINTS.GET_IMAGE}?shopId=${encodeURIComponent(shopId)}`);
    
    if (!response.ok) {
      console.error('Failed to fetch image:', response.status, await response.text());
      return IMAGE.FALLBACK;
    }

    const data = await response.json();
    return data.image || IMAGE.FALLBACK;
  } catch (err) {
    console.error('Error fetching store image:', err);
    return IMAGE.FALLBACK;
  }
};

export const sendAnalyticsDataOnSessionEnd = (): void => {
  if (hasAttemptedAnalyticsSend) {
    return;
  }

  const analyticsData = getSessionData();
  if (analyticsData) {
    hasAttemptedAnalyticsSend = true; 

    const shopId = analyticsData.shop_id || getShopId();
    if (!shopId) {
      console.error("Cannot send analytics: shopId is missing.");
      hasAttemptedAnalyticsSend = false;
      return;
    }

    const dataToSend: Partial<AnalyticsData> & { session_end: string } = {
      ...analyticsData,
      session_end: new Date().toISOString(),
    };

    const payload = {
        email: dataToSend.email,
        shop_id: shopId,
        is_anonymous: dataToSend.is_anonymous,
        country: dataToSend.country,
        region: dataToSend.region,
        city: dataToSend.city,
        ip: dataToSend.ip,
        session_start: dataToSend.session_start,
        session_end: dataToSend.session_end,
        total_chat_interactions: dataToSend.total_chat_interactions || 0,
        products_added_to_cart: dataToSend.products_added_to_cart || 0,
        products_purchased: dataToSend.products_purchased || 0,
        total_purchase_value: dataToSend.total_purchase_value || 0,
        top_purchased_products: dataToSend.purchased_items || [], 
    };
    
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json; charset=UTF-8' });
    const beaconUrl = `${API_ENDPOINTS.ANALYTICS_STORE}?shopId=${encodeURIComponent(shopId)}`;
    
    try {
      const success = navigator.sendBeacon(beaconUrl, blob);
      if (success) {
        console.log('Analytics data beacon queued successfully.');
        sessionStorage.removeItem('AnalyticsData');
      } else {
        console.error('Failed to queue analytics data beacon. Data might be lost.');
        hasAttemptedAnalyticsSend = false;
      }
    } catch (error) {
        console.error('Error sending analytics data beacon:', error);
        hasAttemptedAnalyticsSend = false;
    }
  }
}; 