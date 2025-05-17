const BACKEND_URL = "https://fastapi.formpilot.org";

export const API = {
    BACKEND_URL,
    SAVE_STORE_IMAGE: `${BACKEND_URL}/shop-admin/save-shop-image`,
    SAVE_COLOR_PREFERENCE: `${BACKEND_URL}/shop-admin/save-color-preference`,
    SAVE_SUPPORT_INFO: `${BACKEND_URL}/shop-admin/save-support-info`,
    CREATE_PRODUCTS : `${BACKEND_URL}/products_router/create`,
    TEXT_TRAIN : `${BACKEND_URL}/text_training/train    `
} 

export const CLOUDINARY = {
    URL : "https://api.cloudinary.com/v1_1/de9unppfa/image/upload",
    UPLOAD_PRESET : "ALLOWED_PRESET"
}