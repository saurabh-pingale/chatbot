import { SHOPIFY_VARIANT_PREFIX } from "../constants/cart";
import { CHATBOT_DEFAULTS } from "../constants/chatbot.defaults";
import { CHATBOT_LOGO_DATA_URI } from "../assets/ChatbotLogo";
import { getShopConfiguration } from "../services/chat";
import { loadFaqAssistantData } from "../services/faqAssistant";
import { MESSAGE_REVEAL_EXPIRY_MS } from "../constants/messages";
import type { ChatbotAppConfig } from "../types";

export const getShopId = (): string => {
  const normalize = (value: string) => value.split('?')[0].trim();

  const fromShopifyGlobal = window.Shopify?.shop;
  if (fromShopifyGlobal) {
    return normalize(fromShopifyGlobal);
  }

  const mountEl = document.getElementById('shopify-chatbot');
  const fromDataAttr = mountEl?.dataset.shop;
  if (fromDataAttr) {
    return normalize(fromDataAttr);
  }

  if (import.meta.env.DEV && import.meta.env.VITE_DEV_SHOP_ID) {
    return normalize(import.meta.env.VITE_DEV_SHOP_ID);
  }

  return '';
};

export const parseVariantId = (variantId: string | number): number | null => {
  if (!variantId) return null;

  if (typeof variantId === 'string' && variantId.startsWith(SHOPIFY_VARIANT_PREFIX)) {
    return parseInt(variantId.split('/').pop() || '', 10) || null;
  }

  const result = parseInt(String(variantId), 10) || null;
  return result
};

export const formatVariantId = (id: number): string => {
  return `${SHOPIFY_VARIANT_PREFIX}${id}`;
};

export const hexToRgbArray = (hex: string): [number, number, number] | null => {
  const hexColorMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  return hexColorMatch ? [
    parseInt(hexColorMatch[1], 16),
    parseInt(hexColorMatch[2], 16),
    parseInt(hexColorMatch[3], 16)
  ] : null;
};

export const validateEmail = (email: string): boolean => {
  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return basicEmailRegex.test(email);
};

export const formatMessage = (text: string, type: 'bot' | 'user'): string[] => {
  const formattedHtml: string[] = [];

  if (type === 'user') {
    formattedHtml.push(`<p>${text}</p>`);
    return formattedHtml;
  }

  const normalizedText = text
    .replace(/â€¢/g, "•")
    .replace(/\s+/g, " ")
    .replace(/\n/g, " ")
    .trim();

  const segments: string[] = [];
  const MAX_SEGMENT_LENGTH = 250;
  const bulletParts = normalizedText.split('•').filter(part => part.trim());

  if (bulletParts.length <= 1) {
    const sentenceChunks = normalizedText.match(/[^.]+\.|[^.]+/g) || [normalizedText];
    let currentSegmentBuffer = '';
    for (let sentence of sentenceChunks) {
      sentence = sentence.trim();
      if (!sentence) continue;

      if ((currentSegmentBuffer + ' ' + sentence).length <= MAX_SEGMENT_LENGTH) {
        currentSegmentBuffer += (currentSegmentBuffer ? ' ' : '') + sentence;
      } else {
        if (currentSegmentBuffer) segments.push(currentSegmentBuffer);
        currentSegmentBuffer = sentence;
      }
    }
    if (currentSegmentBuffer) segments.push(currentSegmentBuffer);
  } else {
    const introduction = bulletParts[0].trim();
    if (introduction) {
      segments.push(introduction);
    }

    for (let i = 1; i < bulletParts.length; i++) {
      const bullet = bulletParts[i].trim();
      if (bullet) {
        segments.push(bullet);
      }
    }
  }

  for (const segment of segments) {
    formattedHtml.push(`<p>${segment.trim()}</p>`);
  }

  return formattedHtml;
};

export const getShopConfig = async (): Promise<ChatbotAppConfig> => {
  const shopId = getShopId() || CHATBOT_DEFAULTS.shopId;
  const remoteConfig = await getShopConfiguration();
  const assistantData = await loadFaqAssistantData(shopId);

  const logoUrl = remoteConfig.image || CHATBOT_LOGO_DATA_URI;

  return {
    setupCompleted: remoteConfig.setup_completed ?? CHATBOT_DEFAULTS.setupCompleted,
    primaryColor: remoteConfig.preferred_color || CHATBOT_DEFAULTS.primaryColor,
    logoUrl,
    storeImage: logoUrl,
    headerTitle: CHATBOT_DEFAULTS.headerTitle,
    greetingMessage: CHATBOT_DEFAULTS.greetingMessage,
    helloButtonLabel: CHATBOT_DEFAULTS.helloButtonLabel,
    fallbackMessage: assistantData.fallbackMessage,
    shopId,
    showEmailGate: remoteConfig.show_email_gate ?? CHATBOT_DEFAULTS.showEmailGate,
    allowGuestMode: !(remoteConfig.show_email_gate ?? CHATBOT_DEFAULTS.showEmailGate),
  };
};

export const getContrastingTextColor = (hexcolor: string) => {
  if (!hexcolor) {
    return '#000000';
  }

  if (hexcolor.slice(0, 1) === '#') {
    hexcolor = hexcolor.slice(1);
  }

  if (hexcolor.length === 3) {
    hexcolor = hexcolor.split('').map(char => char + char).join('');
  }

  const r = parseInt(hexcolor.substr(0, 2), 16);
  const g = parseInt(hexcolor.substr(2, 2), 16);
  const b = parseInt(hexcolor.substr(4, 2), 16);

  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

  return (yiq >= 128) ? '#000000' : '#FFFFFF';
};

export const normalizeShopifyGID = (id: string): string => {
  const shopifyGidTypeRegex = /gid:\/\/shopify\/([a-z]+)/i;

  return id.replace(shopifyGidTypeRegex, (_, type: string) => {
    if (type.toLowerCase() === 'productvariant') {
      return 'gid://shopify/ProductVariant';
    }

    return `gid://shopify/${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  });
};

export function isMessageExpired(
  timestamp?: string | number | Date
): boolean {
  if (!timestamp) return false;

  const messageTime = 
    timestamp instanceof Date ? timestamp.getTime() : new Date(timestamp).getTime();
  return Date.now() - messageTime > MESSAGE_REVEAL_EXPIRY_MS;
}
