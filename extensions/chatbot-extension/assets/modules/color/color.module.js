import { API } from '../../constants/api.constants';
import { COLORS } from '../../constants/colors.constants';
import { getShopId } from '../../utils/shopify.utils';

export async function fetchColorPreference() {
  const shopId = getShopId();
  if (!shopId) return COLORS.ORANGE_450;

  try {
    const response = await fetch(`${API.COLOR_ENDPOINT}?shopId=${encodeURIComponent(shopId)}`);
    if (!response.ok) throw new Error('Failed to fetch color');
    const data = await response.json();
    return data.color || COLORS.ORANGE_450;
  } catch (error) {
    console.error("Color fetch error:", error);
    return COLORS.ORANGE_450;
  }
}

export function applyColorTheme(color) {
  document.documentElement.style.setProperty('--primary-color', color);
  
  const elementsToColor = [
    '.chatbot-toggle-button',
    '.chatbot-header',
    '.send-button',
    '.start-chat-button',
    '.add-to-cart-button',
    '.user-message'
  ];
  
  elementsToColor.forEach(selector => {
    document.querySelectorAll(selector).forEach(el => {
      el.style.backgroundColor = color;
    });
  });

  document.querySelectorAll('.chat-window, .chat-page, .email-gate-page').forEach(el => {
    el.style.borderColor = color;
  });
}

export async function initColorTheme() {
  const color = await fetchColorPreference();
  applyColorTheme(color);
  return color;
}