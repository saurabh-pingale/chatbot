import { getAuthToken } from '../utils/auth';
import { getOrCreateGuestId } from '../utils/guest';

export const getConversationKey = (shopId: string): string | null => {
  if (!shopId) {
    console.error("Shop ID is required to create a conversation key.");
    return null;
  }
    
  const token = getAuthToken();
  let userId: string;

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return `auth_user_${payload.sub || payload.user_id}`;
    } catch (e) {
      console.error("Invalid JWT found, falling back to guest ID.", e);
      userId = getOrCreateGuestId();
    }
  } else {
    userId = getOrCreateGuestId();
  }

  return `${shopId}_${userId}`;
};