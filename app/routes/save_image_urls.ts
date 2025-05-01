import { API } from "app/constants/api.constants";

export const saveImageURLs = async (shopId: string, imageUrl: string) => {
  try {
    const response = await fetch(`${API.BACKEND_URL}/store-admin/save-store-image?shopId=${shopId}`, {
        method: "POST",
        body: JSON.stringify({ imageUrl }),
        headers: {
          "Content-Type": "application/json",
        },
      });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Failed to save image URLs");
    }

    return result;
  } catch (error) {
    console.error("Error saving image URLs:", error);
    throw new Error("Failed to save image URLs");
  }
};
