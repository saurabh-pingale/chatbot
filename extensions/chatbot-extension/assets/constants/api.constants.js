export const API = {
    IP_ADDRESS: 'https://api.ipify.org?format=json',
    USER_LOCATION: 'https://ipapi.co',
    CHAT_ENDPOINT: '/apps/chatbot-api/agent_conversation',
    ANALYTICS_ENDPOINT: '/apps/chatbot-api/analytics',
    STORE_IMAGE_ENDPOINT: '/apps/chatbot-api/get_image',
    COLOR_ENDPOINT: '/apps/chatbot-api/color-preference',
    STORE_CHECKOUT_PRODUCT_ENDPOINT: '/apps/chatbot-api/store_checkout_product',
    REMOVE_CHECKOUT_PRODUCT_ENDPOINT: '/apps/chatbot-api/remove_checkout_product'
};

export const SHOPIFY_API = {
  CLEAR_CART: '/cart/clear.js',
  ADD_TO_CART: '/cart/add.js',
  GET_CART: '/cart.js',
  UPDATE_CART: '/cart/update.js'
};

export const SHOPIFY_PRODUCT_VARIANT_PREFIX = "gid://shopify/ProductVariant/";