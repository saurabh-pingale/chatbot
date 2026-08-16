import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORY_TABLE, type ShopCategoryRow } from "../utils/supabase.types";

export async function fetchShopCategories(
  supabase: SupabaseClient,
  shopId: string,
): Promise<ShopCategoryRow[]> {
  const { data, error } = await supabase
    .from(CATEGORY_TABLE)
    .select("id, shop_id, name, created_at, updated_at")
    .eq("shop_id", shopId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ShopCategoryRow[];
}

export async function upsertShopCategories(
  supabase: SupabaseClient,
  shopId: string,
  categoryNames: string[],
): Promise<ShopCategoryRow[]> {
  if (!categoryNames.length) {
    return [];
  }

  const payload = categoryNames.map((name) => ({
    shop_id: shopId,
    name,
  }));

  const { data, error } = await supabase
    .from(CATEGORY_TABLE)
    .upsert(payload, { onConflict: "shop_id,name" })
    .select("id, shop_id, name, created_at, updated_at");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ShopCategoryRow[];
}
