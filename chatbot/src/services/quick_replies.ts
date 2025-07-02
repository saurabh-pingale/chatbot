import { API_ENDPOINTS } from "../constants/api";

export const getQuickReplies = async (shopId: string): Promise<string[]> => {
  try {
    const response = await fetch(`${API_ENDPOINTS.QUICK_REPLIES}?shopId=${shopId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch quick replies');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching quick replies:', error);
    return [];
  }
};