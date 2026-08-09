export interface ProductRecord {
  product_id: string;
  title: string;
  description: string;
  url: string | null;
  image_url: string | null;
  category_id: string | null;
  category_name: string | null;
  variant_quantity: number;
  metadata?: Record<string, unknown>;
}

export interface ShopifyProductNode {
  id: string;
  title: string;
  description: string | null;
  onlineStoreUrl: string | null;
  featuredImageUrl: string | null;
  productType: string | null;
  category: string | null;
  variantQuantity: number;
}

const DEFAULT_CATEGORY = "Miscellaneous ";

export function resolveCategoryName(category: string | null | undefined): string {
  const trimmed = category?.trim();
  return trimmed ? trimmed : DEFAULT_CATEGORY;
}

export function normalizeShopifyProduct(product: ShopifyProductNode): Omit<ProductRecord, "category_id"> {
  return {
    product_id: product.id,
    title: product.title,
    description: product.description ?? "",
    url: product.onlineStoreUrl,
    image_url: product.featuredImageUrl,
    category_name: resolveCategoryName(product.category ?? product.productType),
    variant_quantity: product.variantQuantity ?? 0,
    metadata: {},
  };
}

export function toDisplayProduct(row: {
  product_id: string;
  title: string;
  description: string;
  url: string | null;
  image_url: string | null;
  variant_quantity: number;
  category_id?: string | null;
  category_name?: string | null;
  shop_categories?: { name: string } | null;
}): ProductRecord {
  return {
    product_id: row.product_id,
    title: row.title,
    description: row.description,
    url: row.url,
    image_url: row.image_url,
    category_id: row.category_id ?? null,
    category_name: row.category_name ?? row.shop_categories?.name ?? null,
    variant_quantity: row.variant_quantity,
  };
}
