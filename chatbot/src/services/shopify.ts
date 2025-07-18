import { CART } from '../constants/cart';
import { parseVariantId } from '../utils/utils';
import { trackAddedToCart } from './analytics';
import type { CartItem, ShopifyCartResponse } from '../types';

export const getCart = async (): Promise<ShopifyCartResponse | null> => {
  try {
    const response = await fetch(CART.GET, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin'
    });

    if (!response.ok) {
      console.error('Failed to get cart', response.status, await response.text());
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error('Error getting cart:', err);
    return null;
  }
};

export const clearCart = async (): Promise<boolean> => {
  try {
    const response = await fetch(CART.CLEAR, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin'
    });

    if (!response.ok) {
      console.error('Failed to clear cart', response.status, await response.text());
      return false;
    }

    await response.json();
    return true;
  } catch (err) {
    console.error('Error clearing cart:', err);
    return false;
  }
};

export const addToCart = async (items: CartItem[]): Promise<boolean> => {
  try {
    const shopifyItems = items.map(item => {
        const parsedId = parseVariantId(item?.variant_id || item?.id);
        
        return {
            id: parsedId,
            quantity: item.quantity,
            properties: { chatbot_added: true }
          };
    }).filter(item => item?.id);

    if (!shopifyItems?.length) {
      console.error('No valid items to add after filtering');
      return false;
    }

    const response = await fetch(CART.ADD, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify({ items: shopifyItems }),
      credentials: 'same-origin'
    });

    if (!response.ok) {
      console.error('Failed to add items to cart', response.status, await response.text());
      return false;
    }

    await response.json();
    trackAddedToCart();
    return true;
  } catch (err) {
    console.error('Error adding items to cart:', err);
    return false;
  }
};

export const syncCartItemsToShopifyStoreCart = async (localCart: CartItem[]): Promise<boolean> => {
  if (!await clearCart()) return false;

  if (localCart.length === 0) return true;

  return await addToCart(localCart);
}; 