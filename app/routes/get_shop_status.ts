import { API } from "../constants/api.constants";

export async function getShopStatus(shopId: string) {
    const response = await fetch(`${API.BACKEND_URL}/shop-admin/shop-status?shopId=${shopId}`);
    
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to fetch shop status");
    }

    return response.json();
} 