import { API_ENDPOINTS } from '../constants/api';
import { getAuthToken } from '../utils/auth';
import { getOrCreateGuestId } from '../utils/guest';
import { getShopId } from '../utils/utils';

export const storeCheckoutProduct = async (originalBody: object = {}) => {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const shopId = getShopId();  
    const token = getAuthToken() 
    const body = { ...originalBody } 

    let url = `${API_ENDPOINTS.STORE_CHECKOUT_PRODUCT}?shop_id=${shopId}`;

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    } else {
        const guestId = getOrCreateGuestId();
        url += `&guest_id=${guestId}`;   
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Failed to store checkout product');
    return true;
  } catch (err) {
    console.error('Error storing checkout product:', err);
    return false;
  }
};

export const removeCheckoutProduct = async (originalBody: object = {}) => {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const shopId = getShopId();  
    const token = getAuthToken() 
    const body = { ...originalBody } 

    let url = `${API_ENDPOINTS.REMOVE_CHECKOUT_PRODUCT}?shop_id=${shopId}`;

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    } else {
        const guestId = getOrCreateGuestId();
        url += `&guest_id=${guestId}`; 
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
      body: JSON.stringify(body),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Failed to remove checkout product');
    return true;
  } catch (err) {
    console.error('Error removing checkout product:', err);
    return false;
  }
};

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