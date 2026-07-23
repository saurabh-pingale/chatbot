import type { SupabaseClient } from '@supabase/supabase-js';

const FAQ_TABLE = 'shop_faqs';
const SETTINGS_TABLE = 'shop_faq_settings';
const MESSAGES_TABLE = 'shop_chat_messages';

let client: SupabaseClient | null = null;

function getConfig() {
  return {
    url: import.meta.env.VITE_SUPABASE_URL || '',
    key: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  };
}

export function isDataClientConfigured(): boolean {
  const { url, key } = getConfig();
  return Boolean(url && key);
}

export async function getDataClient(): Promise<SupabaseClient | null> {
  const { url, key } = getConfig();
  if (!url || !key) {
    console.warn('[Chatbot] Data client not configured');
    return null;
  }

  if (!client) {
    const { createBrowserSupabaseClient } = await import('./supabase.browser');
    client = createBrowserSupabaseClient(url, key);
  }

  return client;
}

export { FAQ_TABLE, SETTINGS_TABLE, MESSAGES_TABLE };
