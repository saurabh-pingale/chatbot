import type { CartItem } from '../types';

const SHOPIFY_VARIANT_PREFIX = 'gid://shopify/ProductVariant/';

interface ShopifyCartResponse {
  token: string;
  items: Array<{
    id: number;
    quantity: number;
    title: string;
    price: number;
    image: string;
    properties: Record<string, any>;
  }>;
  item_count: number;
}

export const getShopId = (): string => {
  return window.Shopify?.shop || '';
};

export const parseVariantId = (variantId: string | number): number | null => {
  if (!variantId) return null;

  if (typeof variantId === 'string' && variantId.startsWith(SHOPIFY_VARIANT_PREFIX)) {
    return parseInt(variantId.split('/').pop() || '', 10) || null;
  }

  return parseInt(String(variantId), 10) || null;
};

export const formatVariantId = (id: number): string => {
  return `${SHOPIFY_VARIANT_PREFIX}${id}`;
};

export const getCart = async (): Promise<ShopifyCartResponse | null> => {
  try {
    const response = await fetch('/cart.js', {
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
    const response = await fetch('/cart/clear.js', {
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
    const shopifyItems = items
      .map(item => ({
        id: parseVariantId(item.variant_id || item.id),
        quantity: item.quantity,
        properties: { chatbot_added: true }
      }))
      .filter(item => item.id);

    if (!shopifyItems.length) {
      console.error('No valid items to add after filtering');
      return false;
    }

    const response = await fetch('/cart/add.js', {
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
    return true;
  } catch (err) {
    console.error('Error adding items to cart:', err);
    return false;
  }
};

export const syncCartWithShopify = async (localCart: CartItem[]): Promise<boolean> => {
  // First clear the cart
  if (!await clearCart()) return false;

  // If local cart is empty, we're done
  if (localCart.length === 0) return true;

  // Add all items from local cart
  return await addToCart(localCart);
}; 