import Fuse from 'fuse.js';
import { CHATBOT_DEFAULTS } from '../constants/chatbot.defaults';
import type { ChatResponse, TagItem } from '../types';
import {
  getDataClient,
  FAQ_TABLE,
  SETTINGS_TABLE,
  MESSAGES_TABLE,
} from '../utils/data.client';
import {
  loadCategories,
  loadProductsByCategory,
  buildGreetingTags,
  buildCategoryTags,
  buildAllCategoryTags,
  type CategoryRecord,
} from './productAssistant';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FaqRecord {
  id: string;
  question: string;
  answer: string;
}

export interface FaqAssistantData {
  faqs: FaqRecord[];
  fallbackMessage: string;
  /** Cached categories — loaded on first use, shared across calls */
  categories?: CategoryRecord[];
}

// ---------------------------------------------------------------------------
// Loaders
// ---------------------------------------------------------------------------

export async function loadFaqAssistantData(
  shopId: string,
): Promise<FaqAssistantData> {
  const supabase = await getDataClient();

  if (!supabase) {
    console.warn('[Chatbot] Using local defaults — data client unavailable');
    return { faqs: [], fallbackMessage: CHATBOT_DEFAULTS.fallbackMessage };
  }

  const [faqsResult, settingsResult, categories] = await Promise.all([
    supabase
      .from(FAQ_TABLE)
      .select('id, question, answer')
      .eq('shop_id', shopId)
      .order('created_at', { ascending: true }),
    supabase
      .from(SETTINGS_TABLE)
      .select('fallback_message')
      .eq('shop_id', shopId)
      .maybeSingle(),
    loadCategories(shopId),
  ]);

  if (faqsResult.error) {
    console.error('[Chatbot] Failed to load FAQs:', faqsResult.error.message);
  }
  if (settingsResult.error) {
    console.error('[Chatbot] Failed to load settings:', settingsResult.error.message);
  }

  return {
    faqs: (faqsResult.data ?? []) as FaqRecord[],
    fallbackMessage:
      settingsResult.data?.fallback_message ?? CHATBOT_DEFAULTS.fallbackMessage,
    categories,
  };
}

// ---------------------------------------------------------------------------
// FAQ search
// ---------------------------------------------------------------------------

export function searchFaqAnswer(
  query: string,
  faqs: FaqRecord[],
  threshold = CHATBOT_DEFAULTS.faqSearchThreshold,
): FaqRecord | null {
  if (!query.trim() || faqs.length === 0) return null;

  const fuse = new Fuse(faqs, {
    keys: ['question'],
    threshold,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  const results = fuse.search(query.trim());
  return results.length === 0 ? null : results[0].item;
}

// ---------------------------------------------------------------------------
// Tag builders
// ---------------------------------------------------------------------------

/** The very first tags shown when the chat opens — Hi / Hello */
export function buildInitialGreetingTags(): TagItem[] {
  return buildGreetingTags();
}

/** @deprecated kept for callers that still reference buildTopFaqTags */
export function buildTopFaqTags(
  faqs: FaqRecord[],
  limit = CHATBOT_DEFAULTS.topFaqSuggestionsCount,
): TagItem[] {
  return faqs.slice(0, limit).map((faq) => ({
    name: faq.question,
    description: faq.question,
    action: 'faq' as const,
  }));
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

export async function saveChatMessage(
  shopId: string,
  sessionId: string,
  role: 'user' | 'bot',
  content: string,
  matchedFaqId?: string | null,
): Promise<void> {
  const supabase = await getDataClient();
  if (!supabase) return;

  const { error } = await supabase.from(MESSAGES_TABLE).insert({
    shop_id: shopId,
    session_id: sessionId,
    role,
    content,
    matched_faq_id: matchedFaqId ?? null,
  });

  if (error) {
    console.error('[Chatbot] Failed to save message:', error.message);
  }
}

// ---------------------------------------------------------------------------
// Main resolver
// ---------------------------------------------------------------------------

/**
 * Resolves a user message to a bot response.
 *
 * Flow:
 *  greeting action  → show category list tags
 *  category action  → load + show products for that category; exclude that
 *                     category from the "other categories" tags
 *  browse_all action → show all categories as tags (no products)
 *  free-text        → FAQ match → show answer
 *                   → no match  → fallback + greeting tags
 */
export async function resolveFaqMessage(
  shopId: string,
  sessionId: string,
  userMessage: string,
  assistantData: FaqAssistantData,
  /** Optional action/categoryId when the message was triggered by a tag click */
  tagMeta?: Pick<TagItem, 'action' | 'categoryId' | 'name'>,
): Promise<ChatResponse> {
  // Persist the user turn
  await saveChatMessage(shopId, sessionId, 'user', userMessage);

  const categories = assistantData.categories ?? [];

  // ── 1. Greeting tag (Hi / Hello) ──────────────────────────────────────────
  if (tagMeta?.action === 'greeting') {
    const answer = `Hello! 👋 What are you looking for today? Here are our categories:`;
    const tags = buildCategoryTags(categories);
    await saveChatMessage(shopId, sessionId, 'bot', answer);
    return { answer, products: [], success: true, tags };
  }

  // ── 2. Browse all categories ───────────────────────────────────────────────
  if (tagMeta?.action === 'browse_all') {
    const answer = `Here are all our categories:`;
    const tags = buildAllCategoryTags(categories);
    await saveChatMessage(shopId, sessionId, 'bot', answer);
    return { answer, products: [], success: true, tags };
  }

  // ── 3. Category tag clicked → show products ────────────────────────────────
  if (tagMeta?.action === 'category' && tagMeta.categoryId) {
    const products = await loadProductsByCategory(shopId, tagMeta.categoryId);

    const categoryName = tagMeta.name;
    const answer =
      products.length > 0
        ? `Here are products in ${categoryName}:`
        : `Sorry, we don't have any products in ${categoryName} right now.`;

    // Tags: all other categories + browse all, but NOT the current one
    const tags = buildCategoryTags(categories, tagMeta.categoryId);

    await saveChatMessage(shopId, sessionId, 'bot', answer);
    return { answer, products, success: true, tags };
  }

  // ── 4. Free-text → FAQ match ───────────────────────────────────────────────
  const match = searchFaqAnswer(userMessage, assistantData.faqs);

  if (match) {
    await saveChatMessage(shopId, sessionId, 'bot', match.answer, match.id);
    // After FAQ answer, show greeting tags so user can navigate to products
    const tags = buildCategoryTags(categories);
    return { answer: match.answer, products: [], success: true, tags };
  }

  // ── 5. Fallback ────────────────────────────────────────────────────────────
  const fallbackAnswer = assistantData.fallbackMessage;
  await saveChatMessage(shopId, sessionId, 'bot', fallbackAnswer);

  // After fallback, offer category navigation
  const fallbackTags = buildCategoryTags(categories);
  return {
    answer: fallbackAnswer,
    products: [],
    success: true,
    tags: fallbackTags,
  };
}
