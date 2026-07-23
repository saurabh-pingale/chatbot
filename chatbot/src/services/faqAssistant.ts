import Fuse from 'fuse.js';
import { CHATBOT_DEFAULTS } from '../constants/chatbot.defaults';
import type { ChatResponse, TagItem } from '../types';
import {
  getDataClient,
  FAQ_TABLE,
  SETTINGS_TABLE,
  MESSAGES_TABLE,
} from '../utils/data.client';

export interface FaqRecord {
  id: string;
  question: string;
  answer: string;
}

export interface FaqAssistantData {
  faqs: FaqRecord[];
  fallbackMessage: string;
}

export async function loadFaqAssistantData(
  shopId: string,
): Promise<FaqAssistantData> {
  const supabase = await getDataClient();

  if (!supabase) {
    console.warn('[Chatbot] Using local defaults — data client unavailable');
    return { faqs: [], fallbackMessage: CHATBOT_DEFAULTS.fallbackMessage };
  }

  const [faqsResult, settingsResult] = await Promise.all([
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
  };
}

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
  if (results.length === 0) return null;

  return results[0].item;
}

export function buildTopFaqTags(
  faqs: FaqRecord[],
  limit = CHATBOT_DEFAULTS.topFaqSuggestionsCount,
): TagItem[] {
  return faqs.slice(0, limit).map((faq) => ({
    name: faq.question,
    description: faq.question,
  }));
}

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

export async function resolveFaqMessage(
  shopId: string,
  sessionId: string,
  userMessage: string,
  assistantData: FaqAssistantData,
): Promise<ChatResponse> {
  await saveChatMessage(shopId, sessionId, 'user', userMessage);

  const match = searchFaqAnswer(userMessage, assistantData.faqs);

  if (match) {
    const answer = match.answer;
    await saveChatMessage(shopId, sessionId, 'bot', answer, match.id);
    return {
      answer,
      products: [],
      success: true,
      tags: [],
    };
  }

  const fallbackAnswer = assistantData.fallbackMessage;
  const suggestionTags = buildTopFaqTags(assistantData.faqs);

  await saveChatMessage(shopId, sessionId, 'bot', fallbackAnswer);

  console.log('[Chatbot] No FAQ match — using fallback message');

  return {
    answer: fallbackAnswer,
    products: [],
    success: true,
    tags: suggestionTags,
  };
}
