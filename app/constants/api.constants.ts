const BACKEND_URL = "http://127.0.0.1:8000";

export const API = {
    BACKEND_URL,
    SAVE_STORE_IMAGE: `${BACKEND_URL}/shop-admin/save-shop-image`,
    SAVE_COLOR_PREFERENCE: `${BACKEND_URL}/shop-admin/save-color-preference`,
    SAVE_SUPPORT_INFO: `${BACKEND_URL}/shop-admin/save-support-info`,
    CREATE_PRODUCTS : `${BACKEND_URL}/products_router/create`,
    TEXT_TRAIN : `${BACKEND_URL}/text_training/train`,
    GET_ANALYTICS: `${BACKEND_URL}/analytics_router/analytics`,
    GET_DAILY_ANALYTICS: `${BACKEND_URL}/analytics_router/daily_analytics`,
    SAVE_EMAIL_PAGE_PREFERENCE:`${BACKEND_URL}/shop-admin/save-email-gate-preference`,
    SAVE_PLAN_DETAILS: `${BACKEND_URL}/shop-admin/save-plan-details`,
    TRACK_OPENED_CHATBOT: `${BACKEND_URL}/analytics_router/track_opened_chatbot`,
    TRACK_ADDED_TO_CART: `${BACKEND_URL}/analytics_router/track_added_to_cart`,
    TRACK_PURCHASE: `${BACKEND_URL}/analytics_router/track_purchase`,
} 

export const CLOUDINARY = {
    URL : "https://api.cloudinary.com/v1_1/de9unppfa/image/upload",
    UPLOAD_PRESET : "ALLOWED_PRESET"
}