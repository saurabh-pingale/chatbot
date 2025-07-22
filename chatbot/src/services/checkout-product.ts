import { API_ENDPOINTS } from '../constants/api';
import { getAuthToken } from '../utils/auth';
import { getGuestId } from '../utils/guest';
import { getShopId } from '../utils/utils';

export const storeCheckoutProduct = async (originalBody: object = {}) => {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const shopId = getShopId();  
    const token = getAuthToken() 
    const body = { ...originalBody } 

    if (token) {
        headers['Authorization'] = `Bearer ${token}`
    } else {
        (body as any).guest_id = getGuestId();
    }

    const url = `${API_ENDPOINTS.STORE_CHECKOUT_PRODUCT}?shop_id=${shopId}`;
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

export const removeCheckoutProduct = async (productId: number) => {
  try {
    const response = await fetch(API_ENDPOINTS.REMOVE_CHECKOUT_PRODUCT, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Failed to remove checkout product');
    return true;
  } catch (err) {
    console.error('Error removing checkout product:', err);
    return false;
  }
};