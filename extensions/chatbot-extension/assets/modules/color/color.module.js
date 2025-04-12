import { COLORS } from '../../constants/colors.constants';
import { getShopId } from '../../utils/shopify.utils';

export async function fetchColorPreference() {
  const shopId = getShopId();
  if (!shopId) return COLORS.PRIMARY;

  try {
    const response = await fetch(`/apps/chatbot-api/supabase?shopId=${encodeURIComponent(shopId)}`);
    if (!response.ok) throw new Error('Failed to fetch color');
    const data = await response.json();
    return data.color || COLORS.PRIMARY;
  } catch (error) {
    console.error("Color fetch error:", error);
    return COLORS.PRIMARY;
  }
}

export function applyColorTheme(color) {
  document.documentElement.style.setProperty('--primary-color', color);
  
  const elementsToColor = [
    '.chatbot-toggle-button',
    '.chatbot-header',
    '.send-button',
    '.start-chat-button',
    '.add-to-cart-button'
  ];
  
  elementsToColor.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.style.backgroundColor = color;
    });
  });

  document.querySelectorAll('.chatbot-window, .email-collection-screen').forEach(el => {
    el.style.borderColor = color;
  });
}

export async function initColorTheme() {
  const color = await fetchColorPreference();
  applyColorTheme(color);
  return color;
}