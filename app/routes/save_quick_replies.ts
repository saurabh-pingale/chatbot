import { API } from "../constants/api.constants";

export const saveQuickReplies = async (shopId: string, quickReplies: string[]): Promise<boolean> => {
  try {
    const response = await fetch(`${API.SAVE_QUICK_REPLIES}?shopId=${shopId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quick_replies: quickReplies }),
    });
    return response.ok;
  } catch (error) {
    console.error('Error saving quick replies:', error);
    return false;
  }
};