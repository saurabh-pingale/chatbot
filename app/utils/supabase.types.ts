export const FAQ_TABLE = "shop_faqs";
export const PRODUCT_TABLE = "shop_products";
export const CATEGORY_TABLE = "shop_categories";

export interface ShopFaqRow {
  id: string;
  shop_id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
}

export interface ShopCategoryRow {
  id: string;
  shop_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ShopProductRow {
  id: string;
  shop_id: string;
  product_id: string;
  category_id: string | null;
  title: string;
  description: string;
  url: string | null;
  image_url: string | null;
  variant_quantity: number;
  metadata?: Record<string, unknown>;
  price: number;
  currency_code: string;
  created_at: string;
  updated_at: string;
  shop_categories?: Pick<ShopCategoryRow, "id" | "name"> | null;
}

export interface ShopProductWithCategory extends ShopProductRow {
  category_name: string | null;
}
