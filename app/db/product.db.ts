import type { SupabaseClient } from "@supabase/supabase-js";
import { PRODUCT_TABLE, type ShopProductRow } from "../utils/supabase.types";
import type { ProductRecord } from "../utils/product.utils";

const PRODUCT_SELECT =
  "id, shop_id, product_id, category_id, title, description, url, image_url, variant_quantity, metadata, price, currency_code, created_at, updated_at, shop_categories(id, name)";

function normalizeProductRows(data: unknown): ShopProductRow[] {
  return (Array.isArray(data) ? data : []).map((row) => {
    const shopCategories = row.shop_categories;
    const normalizedCategory = Array.isArray(shopCategories)
      ? shopCategories[0] ?? null
      : shopCategories ?? null;

    return {
      ...row,
      shop_categories: normalizedCategory,
    } as ShopProductRow;
  });
}

export async function fetchShopProducts(
  supabase: SupabaseClient,
  shopId: string,
): Promise<ShopProductRow[]> {
  const { data, error } = await supabase
    .from(PRODUCT_TABLE)
    .select(PRODUCT_SELECT)
    .eq("shop_id", shopId)
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return normalizeProductRows(data);
}

export async function fetchProductsByCategoryId(
  supabase: SupabaseClient,
  shopId: string,
  categoryId: string,
): Promise<ShopProductRow[]> {
  const { data, error } = await supabase
    .from(PRODUCT_TABLE)
    .select(PRODUCT_SELECT)
    .eq("shop_id", shopId)
    .eq("category_id", categoryId)
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return normalizeProductRows(data);
}

export async function upsertShopProducts(
  supabase: SupabaseClient,
  shopId: string,
  products: ProductRecord[],
): Promise<ShopProductRow[]> {
  const payload = products.map((product) => ({
    shop_id: shopId,
    product_id: product.product_id,
    category_id: product.category_id,
    title: product.title,
    description: product.description,
    url: product.url,
    image_url: product.image_url,
    variant_quantity: product.variant_quantity,
    metadata: (product as any).metadata ?? {},
    price: product.price,
    currency_code: product.currency_code,
  }));

  const { data, error } = await supabase
    .from(PRODUCT_TABLE)
    .upsert(payload, { onConflict: "shop_id,product_id" })
    .select(PRODUCT_SELECT);

  if (error) {
    console.error("Failed to upsert products into Supabase:", error);
    throw new Error(error.message);
  }

  return normalizeProductRows(data);
}
