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
  // This regex matches a 6-digit hexadecimal color code (with or without the leading #).
  // It captures three pairs of hexadecimal digits (00 to FF), each representing red, green, and blue values.
  const hexColorMatch = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  return hexColorMatch ? [
    parseInt(hexColorMatch[1], 16), // Red component
    parseInt(hexColorMatch[2], 16), // Green component
    parseInt(hexColorMatch[3], 16) // Blue component
  ] : null;
};

export const validateEmail = (email: string): boolean => {
  // This regex checks for a basic email pattern
  const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return basicEmailRegex.test(email);
};

export const formatMessage = (text: string, type: 'bot' | 'user'): string[] => {
  const formattedHtml: string[] = [];

  if (type === 'user') {
    formattedHtml.push(`<p>${text}</p>`);
    return formattedHtml;
  }

  // Replace malformed bullet characters (â€¢) with proper bullets (•)
  // Collapse multiple whitespaces into single space
  // Replace newlines with space
  // Trim leading/trailing spaces
  const normalizedText = text
    .replace(/â€¢/g, "•")
    .replace(/\s+/g, " ")
    .replace(/\n/g, " ")
    .trim();

  const segments: string[] = [];
  
  // Max characters per segment to ensure readability and prevent overflow
  const MAX_SEGMENT_LENGTH = 250;

   // Split the text by bullet points to process bullet-formatted content
  const bulletParts = normalizedText.split('•').filter(part => part.trim());

  if (bulletParts.length <= 1) {
     // Split by sentence-ending periods (.) while preserving them
    const sentenceChunks = normalizedText.match(/[^.]+\.|[^.]+/g) || [normalizedText];
    
    let currentSegmentBuffer = '';
    for (let sentence of sentenceChunks) {
      sentence = sentence.trim();
      if (!sentence) continue;

      // Add sentence to the current buffer if within limit
      if ((currentSegmentBuffer + ' ' + sentence).length <= MAX_SEGMENT_LENGTH) {
        currentSegmentBuffer += (currentSegmentBuffer ? ' ' : '') + sentence;
      } else {
        // Push the current buffer as a segment and start a new one
        if (currentSegmentBuffer) segments.push(currentSegmentBuffer);
        currentSegmentBuffer = sentence;
      }
    }
    if (currentSegmentBuffer) segments.push(currentSegmentBuffer);
  } else {
    // If bullet points exist, format the first part as introduction if not empty
    const introduction = bulletParts[0].trim();
    if (introduction) {
      segments.push(introduction);
    }

    // Format remaining bullet parts with a leading bullet symbol
    for (let i = 1; i < bulletParts.length; i++) {
      const bullet = bulletParts[i].trim();
      if (bullet) {
        segments.push(`• ${bullet}`);
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

export const normalizeShopifyGID = (id: string): string => {
  const shopifyGidTypeRegex = /gid:\/\/shopify\/([a-z]+)/i;

  return id.replace(shopifyGidTypeRegex, (_, type: string) => {
    if (type.toLowerCase() === 'productvariant') {
      return 'gid://shopify/ProductVariant';
    }

    return `gid://shopify/${type.charAt(0).toUpperCase()}${type.slice(1)}`;
  });
};