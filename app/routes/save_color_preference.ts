import { API } from "app/constants/api.constants";

export const saveColorPreference = async (shopId: string, color: string) => {
  try {
    const response = await fetch(`${API.SAVE_COLOR_PREFERENCE}?shopId=${shopId}`, {
      method: "POST",
      body: JSON.stringify({ color }),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Failed to save color preference");
    }

    return result;
  } catch (error) {
    console.error("Error saving color preference:", error);
    throw new Error(`Failed to save color preference:`);
  }
};
