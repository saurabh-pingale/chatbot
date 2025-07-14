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

  return parseInt(String(variantId), 10) || null;
};

export const formatVariantId = (id: number): string => {
  return `${SHOPIFY_VARIANT_PREFIX}${id}`;
};

export const hexToRgbArray = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
};

export const validateEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const formatMessage = (text: string, type: 'bot'|'user'): string[] => {
  const formattedHtml = [];
  if(type == 'user'){
    formattedHtml.push(`<p>${text}</p>`)
    return formattedHtml
  }

  const lines = text.replace(/â€¢/g, "•").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if(line){
      formattedHtml.push(`<p>${line}</p>`);
    }
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