import type { SupabaseClient } from "@supabase/supabase-js";
import type { FaqItem } from "../utils/faq.utils";
import { FAQ_TABLE, type ShopFaqRow } from "../utils/supabase.types";

function mapRowToFaq(row: ShopFaqRow): FaqItem {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
  };
}

export async function fetchFaqs(
  supabase: SupabaseClient,
  shopId: string,
): Promise<FaqItem[]> {
  const { data, error } = await supabase
    .from(FAQ_TABLE)
    .select("id, shop_id, question, answer, created_at, updated_at")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as ShopFaqRow[]).map(mapRowToFaq);
}

export async function createFaq(
  supabase: SupabaseClient,
  shopId: string,
  question: string,
  answer: string,
): Promise<FaqItem> {
  const { data, error } = await supabase
    .from(FAQ_TABLE)
    .insert({ shop_id: shopId, question, answer })
    .select("id, shop_id, question, answer, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRowToFaq(data as ShopFaqRow);
}

export async function updateFaq(
  supabase: SupabaseClient,
  id: string,
  question: string,
  answer: string,
): Promise<FaqItem> {
  const { data, error } = await supabase
    .from(FAQ_TABLE)
    .update({ question, answer })
    .eq("id", id)
    .select("id, shop_id, question, answer, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapRowToFaq(data as ShopFaqRow);
}

export async function deleteFaq(
  supabase: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from(FAQ_TABLE).delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function bulkCreateFaqs(
  supabase: SupabaseClient,
  shopId: string,
  rows: { question: string; answer: string }[],
): Promise<FaqItem[]> {
  const payload = rows.map((row) => ({
    shop_id: shopId,
    question: row.question,
    answer: row.answer,
  }));

  const { data, error } = await supabase
    .from(FAQ_TABLE)
    .insert(payload)
    .select("id, shop_id, question, answer, created_at, updated_at");

  if (error) {
    throw new Error(error.message);
  }

  return (data as ShopFaqRow[]).map(mapRowToFaq);
}
