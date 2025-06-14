import type { UtmParams } from "../types";

const UTM_STORAGE_KEY = 'chatbot_utm_params';

export const captureUtmParameters = (): void => {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm: UtmParams = {};

    const source = params.get('utm_source');
    const medium = params.get('utm_medium');
    const campaign = params.get('utm_campaign');
    const term = params.get('utm_term');
    const content = params.get('utm_content');

    if (source) utm.utm_source = source;
    if (medium) utm.utm_medium = medium;
    if (campaign) utm.utm_campaign = campaign;
    if (term) utm.utm_term = term;
    if (content) utm.utm_content = content;

    if (Object.keys(utm).length > 0) {
      localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utm));
    }
  } catch (error) {
    console.error("Error capturing UTM parameters:", error);
  }
};

export const getStoredUtmParameters = (): UtmParams | null => {
  try {
    const stored = localStorage.getItem(UTM_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return null;
  } catch (error) {
    console.error("Error retrieving UTM parameters:", error);
    return null;
  }
}; 