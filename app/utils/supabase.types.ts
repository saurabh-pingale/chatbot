export const FAQ_TABLE = "shop_faqs";

export interface ShopFaqRow {
  id: string;
  shop_id: string;
  question: string;
  answer: string;
  created_at: string;
  updated_at: string;
}
