import { API } from "app/constants/api.constants";

export const saveSupportInfo = async (shopId: string, supportEmail: string, supportPhone: string) => {
  try {
    const response = await fetch(
      `${API.BACKEND_URL}/store-admin/save-support-info?shopId=${shopId}`,
      {
        method: "POST",
        body: JSON.stringify({ supportEmail, supportPhone }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Failed to save support info");
    }

    return result;
  } catch (error) {
    console.error("Error saving support info:", error);
    throw new Error("Failed to save support info");
  }
};