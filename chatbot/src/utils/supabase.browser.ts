import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function createBrowserSupabaseClient(
  url: string,
  publishableKey: string,
): SupabaseClient {
  return createClient(url, publishableKey);
}
