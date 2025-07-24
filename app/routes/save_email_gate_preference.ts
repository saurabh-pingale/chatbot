import { SaveEmailGatePreferencePayload } from "../common/types";
import { API } from "../constants/api.constants";

export const saveEmailGatePreference = async (
  shopId: string,
  payload: SaveEmailGatePreferencePayload
) => {
  try {
    const response = await fetch(`${API.SAVE_EMAIL_PAGE_PREFERENCE}/?shopId=${encodeURIComponent(shopId)}`, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Failed to save Email Gate preference");
    }

    return result;
  } catch (error) {
    console.error("Error saving Email Gate preference:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    throw new Error(`Failed to save Email Gate preference: ${message}`);
  }
}; 