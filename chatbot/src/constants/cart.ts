export const CART = {
    GET: '/cart.js',
    CLEAR: '/cart/clear.js',
    ADD: '/cart/add.js',
    UPDATE: '/cart/update.js'
}

export const SHOPIFY_VARIANT_PREFIX = 'gid://shopify/productvariant/';
export const CART_STORAGE_KEY = 'chatbotCartItems';
export const POLL_INTERVAL = 8000;

export const storefrontAccessToken = import.meta.env.VITE_STOREFRONT_ACCESS_TOKEN || "";