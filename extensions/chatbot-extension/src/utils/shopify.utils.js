export function getShopId() {
    return window.Shopify?.shop || 'default-shop-id';
  }
  
  export function getShopDomain() {
    return window.Shopify?.shop?.split('.')[0] || null;
  }