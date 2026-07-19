import type { SupabaseClient } from "@supabase/supabase-js";

const SETTINGS_TABLE = "shop_faq_settings";

export const DEFAULT_FALLBACK_MESSAGE =
  "Sorry, I couldn't find an answer to that. Please contact our support team for further help.";

export interface ShopFaqSettings {
  shop_id: string;
  fallback_message: string;
  updated_at: string;
}

export async function fetchFaqSettings(
  supabase: SupabaseClient,
  shopId: string,
): Promise<string> {
  const { data, error } = await supabase
    .from(SETTINGS_TABLE)
    .select("fallback_message")
    .eq("shop_id", shopId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.fallback_message ?? "";
}

export async function saveFaqSettings(
  supabase: SupabaseClient,
  shopId: string,
  fallbackMessage: string,
): Promise<void> {
  const { error } = await supabase.from(SETTINGS_TABLE).upsert(
    {
      shop_id: shopId,
      fallback_message: fallbackMessage,
    },
    { onConflict: "shop_id" },
  );

  if (error) {
    throw new Error(error.message);
  }
}
