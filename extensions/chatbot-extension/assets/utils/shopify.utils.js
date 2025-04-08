export function getShopId() {
    return window.Shopify?.shop || 'default-shop-id';
  }
export function getShopDomain() {
  return window.Shopify?.shop?.split('.')[0] || null;
}
export function extractVariantId(variantId) {
  if (!variantId) return null;

  if (typeof variantId === 'string' && variantId.startsWith('gid://shopify/ProductVariant/')) {
    return parseInt(variantId.split('/').pop(), 10);
  }
 
  return parseInt(variantId, 10) || null;
}

export function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  return a.every((item, index) => 
    item.id === b[index].id && item.qty === b[index].qty
  );
}
