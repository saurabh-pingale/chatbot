import { API_ENDPOINTS } from '../constants/api';
import { getAuthToken } from '../utils/auth';
import { getOrCreateGuestId } from '../utils/guest';

export const getLatestInventory = async (variantId: number, shopId: string) => {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    let url = `${API_ENDPOINTS.GET_LATEST_INVENTORY}?shop_id=${shopId}&variant_id=${variantId}`;

    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      const guestId = getOrCreateGuestId();
      url += `&guest_id=${guestId}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Failed to fetch latest inventory');
    return result.quantity;
  } catch (err) {
    console.error('Error fetching latest inventory:', err);
    throw err;
  }
};