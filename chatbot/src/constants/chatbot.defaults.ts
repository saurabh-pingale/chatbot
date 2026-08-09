/**
 * Single source of truth for chatbot UI defaults.
 * Components should read these via useConfig(), not hardcode values.
 */
export const CHATBOT_DEFAULTS = {
  primaryColor: '#1A1A1A',
  logoUrl: '',
  headerTitle: 'Assistant',
  greetingMessage: "Hey there, I'm happy to help you today.",
  helloButtonLabel: 'Hello 👋',
  fallbackMessage:
    "Sorry, I couldn't find an answer to that. Please contact our support team for further help.",
  showEmailGate: false,
  setupCompleted: true,
  allowGuestMode: true,
  shopId: 'demo-shop',
  /** Max FAQ question tags shown when no match is found */
  topFaqSuggestionsCount: 3,
  /** Tag-driven catalog browsing */
  greetingTags: ['Hi', 'Hello'] as const,
  browseAllCategoriesLabel: 'Browse all categories',
  /** Fuse.js threshold — lower = stricter match (0.0–1.0) */
  faqSearchThreshold: 0.45,
} as const;

export type ChatbotDefaults = typeof CHATBOT_DEFAULTS;
