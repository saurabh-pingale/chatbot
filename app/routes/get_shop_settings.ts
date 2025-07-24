import { API } from "../constants/api.constants";

export const getShopSettings = async (shopId: string) => {
  try {
    const response = await fetch(`${API.BACKEND_URL}/shop_config_router/config?shop_id=${shopId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Failed to get shop settings");
    }
    return result;
  } catch (error) {
    console.error("Error getting shop settings:", error);
    throw new Error(`Failed to get shop settings`);
  }
}; 