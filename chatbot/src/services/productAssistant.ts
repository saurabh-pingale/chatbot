import { CHATBOT_DEFAULTS } from '../constants/chatbot.defaults';
import {
  getDataClient,
  PRODUCT_TABLE,
  CATEGORY_TABLE,
} from '../utils/data.client';
import type { ProductType, TagItem } from '../types';

export interface CategoryRecord {
  id: string;
  name: string;
}

export interface ProductRecord {
  id: string;
  product_id: string;
  title: string;
  description: string | null;
  url: string | null;
  image_url: string | null;
  variant_quantity: number;
  metadata: Record<string, unknown>;
  category_id: string | null;
}

/** Fetch all categories for a shop from shop_categories */
export async function loadCategories(shopId: string): Promise<CategoryRecord[]> {
  const supabase = await getDataClient();
  if (!supabase) {
    console.warn('[Chatbot] Data client unavailable — cannot load categories');
    return [];
  }

  const { data, error } = await supabase
    .from(CATEGORY_TABLE)
    .select('id, name')
    .eq('shop_id', shopId)
    .order('name', { ascending: true });

  if (error) {
    console.error('[Chatbot] Failed to load categories:', error.message);
    return [];
  }

  return (data ?? []) as CategoryRecord[];
}

/** Fetch products for a specific category from shop_products, joining category name */
export async function loadProductsByCategory(
  shopId: string,
  categoryId: string,
): Promise<ProductType[]> {
  const supabase = await getDataClient();
  if (!supabase) {
    console.warn('[Chatbot] Data client unavailable — cannot load products');
    return [];
  }

  const { data, error } = await supabase
    .from(PRODUCT_TABLE)
    .select(`
      id,
      product_id,
      title,
      description,
      url,
      image_url,
      variant_quantity,
      metadata,
      category_id,
      shop_categories ( name )
    `)
    .eq('shop_id', shopId)
    .eq('category_id', categoryId)
    .order('title', { ascending: true });

  if (error) {
    console.error('[Chatbot] Failed to load products:', error.message);
    return [];
  }

  type ProductRow = ProductRecord & {
    shop_categories?: { name: string } | { name: string }[] | null;
  };

  return ((data ?? []) as unknown as ProductRow[]).map((p) => {
    // Supabase may return the joined relation as an array or a single object
    const cat = Array.isArray(p.shop_categories)
      ? p.shop_categories[0]
      : p.shop_categories;

    return {
      id: p.product_id || p.id,
      name: p.title,
      price: (p.metadata?.price as number | string) ?? 0,
      url: p.url ?? undefined,
      image_url: p.image_url ?? undefined,
      description: p.description ?? undefined,
      variant_quantity: p.variant_quantity,
      category: cat?.name ?? undefined,
    };
  });
}

/** Build the initial greeting tags: Hi / Hello */
export function buildGreetingTags(): TagItem[] {
  return [
    { name: 'Hi 👋', description: 'Say hello', action: 'greeting' },
    { name: 'Hello', description: 'Say hello', action: 'greeting' },
  ];
}

/** Build category tags from loaded categories, excluding the currently active one */
export function buildCategoryTags(
  categories: CategoryRecord[],
  excludeCategoryId?: string,
): TagItem[] {
  const filtered = excludeCategoryId
    ? categories.filter((c) => c.id !== excludeCategoryId)
    : categories;

  const tags: TagItem[] = filtered.map((cat) => ({
    name: cat.name,
    description: `Browse ${cat.name}`,
    categoryId: cat.id,
    action: 'category' as const,
  }));

  tags.push({
    name: CHATBOT_DEFAULTS.browseAllCategoriesLabel,
    description: 'See all categories',
    action: 'browse_all',
  });

  return tags;
}

/** Build all category tags including Browse All — used when "Browse all categories" is clicked */
export function buildAllCategoryTags(categories: CategoryRecord[]): TagItem[] {
  const tags: TagItem[] = categories.map((cat) => ({
    name: cat.name,
    description: `Browse ${cat.name}`,
    categoryId: cat.id,
    action: 'category' as const,
  }));

  return tags;
}
