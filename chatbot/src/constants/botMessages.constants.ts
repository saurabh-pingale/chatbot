import type { TagItem } from "../types";

export const STATIC_BOT_GREETING = "Hi! I'm store faq assistant. How can I help you? 😊";
  
export const TAG_DICTIONARY: Record<string, string> = {
    'Hi 👋': "Say hello to the assistant",
    'Browse Products': "Get me available product collections in store"
};

export const DEFAULT_TAGS: TagItem[] = Object.entries(TAG_DICTIONARY).map(([name, description]) => ({
  name,
  description,
}));