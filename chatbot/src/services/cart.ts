import { API_ENDPOINTS } from '../constants/api';
import { getAuthToken } from '../utils/auth';
import { getOrCreateGuestId } from '../utils/guest';
import { getShopId } from '../utils/utils';
import type { CartItem } from '../types';

export const fetchCartFromDB = async (): Promise<CartItem[]> => {
  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const shopId = getShopId();
    let url = `${API_ENDPOINTS.GET_CART}?shop_id=${shopId}`;

    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      const guestId = getOrCreateGuestId();
      url += `&guest_id=${guestId}`;
    }

    const response = await fetch(url, { method: 'GET', headers });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Failed to fetch cart');
    return result;
  } catch (err) {
    console.error('Error fetching cart from DB:', err);
    return [];
  }
};

export const addToCartDB = async (variantId: number, quantity: number): Promise<CartItem> => {
  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const shopId = getShopId();
    let url = `${API_ENDPOINTS.ADD_TO_CART}?shop_id=${shopId}`;

    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      const guestId = getOrCreateGuestId();
      url += `&guest_id=${guestId}`;
    }

    const body = { variant_id: variantId, quantity };
    const response = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Failed to add to cart');
    return result;
  } catch (err) {
    console.error('Error adding to cart DB:', err);
    throw err;
  }
};

export const removeFromCartDB = async (variantId: number): Promise<boolean> => {
  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const shopId = getShopId();
    let url = `${API_ENDPOINTS.REMOVE_FROM_CART}/${variantId}?shop_id=${shopId}`;

    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      const guestId = getOrCreateGuestId();
      url += `&guest_id=${guestId}`;
    }

    const response = await fetch(url, { method: 'DELETE', headers });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Failed to remove from cart');
    return result.success;
  } catch (err) {
    console.error('Error removing from cart DB:', err);
    return false;
  }
};

export const clearCartDB = async (): Promise<boolean> => {
  try {
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    const shopId = getShopId();
    let url = `${API_ENDPOINTS.CLEAR_CART}?shop_id=${shopId}`;

    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    } else {
      const guestId = getOrCreateGuestId();
      url += `&guest_id=${guestId}`;
    }

    const response = await fetch(url, { method: 'POST', headers });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Failed to clear cart');
    return result.success;
  } catch (err) {
    console.error('Error clearing cart DB:', err);
    return false;
  }
};