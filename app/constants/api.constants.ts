const BACKEND_URL = "https://shopify-chatbot-fastapi-578494102556.us-central1.run.app";

export const API = {
    BACKEND_URL,
    SHOP_CONFIG: `${BACKEND_URL}/shop_config_router/config`,
    STORE_ACCESS_TOKEN: `${BACKEND_URL}/shop_config_router/store-access-token`,
    SAVE_STORE_IMAGE: `${BACKEND_URL}/shop-admin/save-shop-image`,
    SAVE_COLOR_PREFERENCE: `${BACKEND_URL}/shop-admin/save-color-preference`,
    SAVE_SUPPORT_INFO: `${BACKEND_URL}/shop-admin/save-support-info`,
    CREATE_PRODUCTS : `${BACKEND_URL}/products_router/create`,
    GET_PRODUCTS_STATUS: `${BACKEND_URL}/products_router/create/status`,
    TEXT_TRAIN : `${BACKEND_URL}/text_training/train`,
    GET_ANALYTICS: `${BACKEND_URL}/analytics_router/analytics`,
    GET_DAILY_ANALYTICS: `${BACKEND_URL}/analytics_router/daily_analytics`,
    SAVE_EMAIL_PAGE_PREFERENCE:`${BACKEND_URL}/shop-admin/save-email-gate-preference`,
    SAVE_PLAN_DETAILS: `${BACKEND_URL}/shop-admin/save-plan-details`,
    TRACK_OPENED_CHATBOT: `${BACKEND_URL}/analytics_router/track_opened_chatbot`,
    TRACK_ADDED_TO_CART: `${BACKEND_URL}/analytics_router/track_added_to_cart`,
    COUNTRY_CODES: `${BACKEND_URL}/country_code`,
    SAVE_INTEGRATIONS: `${BACKEND_URL}/shop-admin/integration`,
    SAVE_QUICK_REPLIES: `${BACKEND_URL}/shop-admin/save-quick-replies`
} 

export const CLOUDINARY = {
    URL : "https://api.cloudinary.com/v1_1/de9unppfa/image/upload",
    UPLOAD_PRESET : "ALLOWED_PRESET"
}