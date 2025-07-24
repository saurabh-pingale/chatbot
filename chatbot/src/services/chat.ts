import { API_ENDPOINTS } from '../constants/api';
import { COLORS } from '../constants/colors';
import { IMAGE } from '../constants/image';
import { getShopId } from '../utils/utils';
import { getOrCreateGuestId } from '../utils/guest';
import type {
  ChatResponse,
  LocationInfo,
  InitiateSessionRequest,
  InitiateSessionResponse,
  AgentConversationRequestPayload
} from '../types';
import { fetchWithTokenRefresh } from '../utils/api';

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

export const getShopConfiguration = async () => {
  try {
    let shopId = getShopId();
    if (!shopId) {
      return { 
        preferred_color: COLORS.ORANGE_450,
        image: IMAGE.FALLBACK,
        setup_completed: false,
        show_email_gate: false
      };
    }
    shopId = shopId.split("?")[0];

    const response = await fetch(
      `${API_ENDPOINTS.SHOP_CONFIG}?shop_id=${encodeURIComponent(shopId)}`
    );

    if (!response.ok) {
      console.error('Failed to fetch shop config:', response.status, await response.text());
      return { 
        preferred_color: COLORS.ORANGE_450,
        image: IMAGE.FALLBACK,
        setup_completed: false,
        show_email_gate: false
      };
    }

    const data = await response.json();
    return {
      preferred_color: data.preferred_color || COLORS.ORANGE_450,
      image: data.image || IMAGE.FALLBACK,
      setup_completed: data.setup_completed || false,
      show_email_gate: data.show_email_gate || false,
    };
  } catch (err) {
    console.error('Config fetch error:', err);
    return { 
      preferred_color: COLORS.ORANGE_450,
      image: IMAGE.FALLBACK,
      setup_completed: false,
      show_email_gate: false
    };
  }
};

export const initiateUserSession = async (
  payload: InitiateSessionRequest
): Promise<InitiateSessionResponse> => {
  const response = await fetchWithTokenRefresh(API_ENDPOINTS.INITIATE_SESSION, {
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
  const { token, ...bodyPayload } = payload;
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const params = new URLSearchParams({
    shopId: shopId,
  });

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    params.set('guest_id', getOrCreateGuestId());
  }
  
  const response = await fetchWithTokenRefresh(`${API_ENDPOINTS.AGENT_CONVERSATION}?${params.toString()}`,
  {
    method: "POST",
    headers: headers,
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: "Failed to send message" }));
    throw new Error(errorData.error || errorData.detail || "Failed to send message to agent");
  }
  return response.json();
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