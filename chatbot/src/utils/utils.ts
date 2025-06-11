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

export const formatMessage = (text: string): string => {
  const lines = text.replace(/â€¢/g, "•").split("\n");
  let formattedHtml = "";
  let inList = false;
  let currentParagraph = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line === "" && i > 0 && i < lines.length - 1) {
      const prevLine = lines[i - 1].trim();
      const nextLine = lines[i + 1].trim();
      if (prevLine.startsWith("•") && nextLine.startsWith("•")) {
        continue;
      }
    }

    if (line.startsWith("•")) {
      if (currentParagraph && !inList) {
        formattedHtml += `<p>${currentParagraph}</p>`;
        currentParagraph = "";
      }
      if (!inList) {
        formattedHtml += '<ul class="message-list-items">';
        inList = true;
      }
      formattedHtml += `<li>${line.substring(1).trim()}</li>`;
    } else {
      if (inList) {
        formattedHtml += "</ul>";
        inList = false;
      }
      if (line) {
        currentParagraph = currentParagraph 
          ? currentParagraph + " " + line 
          : line;
      } else if (currentParagraph) {
        formattedHtml += `<p>${currentParagraph}</p>`;
        currentParagraph = "";
      }
    }
  }

  if (inList) {
    formattedHtml += "</ul>";
  }
  if (currentParagraph) {
    formattedHtml += `<p>${currentParagraph}</p>`;
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
  }
}
