import { SHOPIFY_VARIANT_PREFIX } from "../constants/cart";
import { getShopConfiguration } from "../services/chat";

export const getShopId = (): string => {
  return window.Shopify?.shop || '';
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
  //TODO: Add a comment like //phone number validation regex or //email validation regex, also describe little bit of regex by adding comments  or keep variable name explainable 
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
};

export const validateEmail = (email: string): boolean => {
  //TODO: Here explain little bit of regex by adding comments  or keep variable name explainable 
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const formatMessage = (text: string, type: 'bot' | 'user'): string[] => {
  const formattedHtml: string[] = [];

  if (type === 'user') {
    formattedHtml.push(`<p>${text}</p>`);
    return formattedHtml;
  }

  //TODO: What are we doing exactly here ?, 
  //TODO: Try to explain via comments or keep variable name explainable 
  text = text.replace(/â€¢/g, "•").replace(/\s+/g, " ").replace(/\n/g, " ").trim();

  const segments: string[] = [];
  //TODO: Why we choose max segement length 250 ?,  Try to explain via comments or keep variable name explainable 
  const MAX_SEGMENT_LENGTH = 250;

  const parts = text.split('•').filter(part => part.trim());

  if (parts.length <= 1) {
    //TODO:  Try to explain via comments or keep variable name explainable 
    const sentences = text.match(/[^.]+\.|[^.]+/g) || [text];
    
    //TODO: What is buffer about ?. explain via comments or keep variable name explainable 
    let buffer = '';
    for (let sentence of sentences) {
      sentence = sentence.trim();
      if (!sentence) continue;

      if ((buffer + ' ' + sentence).length <= MAX_SEGMENT_LENGTH) {
        buffer += (buffer ? ' ' : '') + sentence;
      } else {
        //TODO: What is segment about ?, Try to explain via comments or keep variable name explainable 
        if (buffer) segments.push(buffer);
        buffer = sentence;
      }
    }
    if (buffer) segments.push(buffer);
  } else {
    //TODO:Are we validating whether parts has items ? before extraction or Trim
    const introText = parts[0].trim();
    if (introText) {
      segments.push(introText);
    }

    for (let i = 1; i < parts.length; i++) {
      const bulletContent = parts[i].trim();
      if (bulletContent) {
        segments.push(`• ${bulletContent}`);
      }
    }
  }

  for (const segment of segments) {
    formattedHtml.push(`<p>${segment.trim()}</p>`);
  }

  return formattedHtml;
};

export const getShopConfig = async () => {
  const config = await getShopConfiguration();

  return {
    setupCompleted: config.setup_completed,
    primaryColor: config.preferred_color,
    storeImage: config.image,
    shopId: getShopId() || 'demo-shop',
    showEmailGate: config.show_email_gate,
    allowGuestMode: !config.show_email_gate,
  }
}

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