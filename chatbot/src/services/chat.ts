import { API_ENDPOINTS } from '../constants/api';
import { COLORS } from '../constants/colors';
import { IMAGE } from '../constants/image';
import { getShopId } from '../utils/utils';
import type {
  ChatResponse,
  LocationInfo,
  Message,
  InitiateSessionRequest,
  InitiateSessionResponse,
  AgentConversationRequestPayload
} from '../types';

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
      country: null,
      city: null,
      region: null,
      ip: ip
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
        region: null,
        ip: ip
      };
    }
    const data = await response.json();
    return {
      country: data.country_name || null,
      city: data.city || null,
      region: data.region || null,
      ip: ip
    };
  } catch (err) {
    console.error('Location fetch failed:', err);
    return {
      country: null,
      city: null,
      region: null,
      ip: ip
    };
  }
};

export const trackEvent = (eventName: string, eventData: Record<string, any> = {}): void => {
  console.log(`Track Event: ${eventName}`, eventData);
};

export const sendChatMessage = async (
  messages: Message[],
  userId: string
): Promise<ChatResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  let shopId = getShopId();
  if (shopId) {
    shopId = shopId.split('?')[0];
  }

  const params = new URLSearchParams({
    shopId: shopId || '',
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
    let shopId = getShopId();
    if (!shopId) return COLORS.ORANGE_450;
    shopId = shopId.split('?')[0];

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
    let shopId = getShopId();
    if (!shopId) return IMAGE.FALLBACK;
    shopId = shopId.split('?')[0];

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

export const getShopStatus = async (): Promise<{ setupCompleted: boolean }> => {
  try {
    let shopId = getShopId();
    if (!shopId) return { setupCompleted: false };
    shopId = shopId.split('?')[0];

    const response = await fetch(`${API_ENDPOINTS.SHOP_STATUS}?shopId=${encodeURIComponent(shopId)}`);
    
    if (!response.ok) {
      console.error('Failed to fetch shop status:', response.status, await response.text());
      return { setupCompleted: false };
    }

    const data = await response.json();
    return { setupCompleted: data.setup_completed || false };
  } catch (err) {
    console.error('Error fetching shop status:', err);
    return { setupCompleted: false };
  }
};

export const initiateUserSession = async (
  payload: InitiateSessionRequest
): Promise<InitiateSessionResponse> => {
  const response = await fetch(`${API_ENDPOINTS.INITIATE_SESSION}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Failed to initiate session" }));
    throw new Error(errorData.detail || "Failed to initiate session");
  }
  return response.json();
};

export const sendAgentMessage = async (
  shopId: string,
  payload: AgentConversationRequestPayload
): Promise<ChatResponse> => { 
  const response = await fetch(`${API_ENDPOINTS.AGENT_CONVERSATION}?shopId=${encodeURIComponent(shopId)}`,
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Failed to send message" }));
    throw new Error(errorData.error || errorData.detail || "Failed to send message to agent");
  }
  return response.json();
};

export const getEmailGatePreference = async (): Promise<boolean> => {
  try {
    let shopId = getShopId();
    if (!shopId) return false;
    shopId = shopId.split('?')[0];

    const response = await fetch(`${API_ENDPOINTS.EMAIL_PAGE_PREFERENCE}?shopId=${encodeURIComponent(shopId)}`);
    
    if (!response.ok) {
      console.error('Failed to fetch email gate preference:', response.status, await response.text());
      return false;
    }

    const data = await response.json();
    return data.show_email_gate || false;
  } catch (err) {
    console.error('Error fetching email gate preference:', err);
    return false;
  }
};

export const getShopOfferTags = async (
  shopDomain: string,
  storefrontAccessToken: string
): Promise<string[]> => {
  const query = `
    query {
        productTags(first: 100) {
          edges {
            node
        }
      }
    }
  `;

  try {
    const response = await fetch(`https://${shopDomain}/api/2024-04/graphql.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': storefrontAccessToken,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Shopify GraphQL error:', errorText);
      return [];
    }

    const json = await response.json();
    const edges = json?.data?.productTags?.edges ?? [];
    const tags = edges.map((edge: { node: string }) => edge.node);
    return Array.from(new Set(tags));
  } catch (err) {
    console.error('Error fetching Shopify product tags:', err);
    return [];
  }
};