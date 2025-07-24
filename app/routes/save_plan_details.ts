import { API } from "../constants/api.constants";

export async function savePlanDetails(
    shopId: string,
    details: {
        owner_name: string;
        owner_email: string;
        owner_location: string;
        plan: string;
    }
) {
    const response = await fetch(`${API.SAVE_PLAN_DETAILS}?shopId=${shopId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(details),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to save plan details");
    }

    return response.json();
} 