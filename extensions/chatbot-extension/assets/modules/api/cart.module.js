import { extractVariantId } from '../../utils/shopify.utils';
import { SHOPIFY_API } from '../../constants/api.constants';

export async function clearStoreCart() {
  const response = await fetch(SHOPIFY_API.CLEAR_CART, {
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
}

export async function addItemsToStoreCart(items) {
  const lineItems = items.map(item => {
    const variantId = extractVariantId(item.variant_id);

    return {
      id: variantId,
      quantity: item.quantity,
      properties: {
        chatbot_added: true
      }
    }
  });

  const validItems = lineItems.filter(item => item.id);
  
  if (validItems?.length === 0 || !validItems?.length) {
    console.error('No valid items to add after filtering');
    return false;
  }
  
  const response = await fetch(SHOPIFY_API.ADD_TO_CART, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify({ items: validItems }),
    credentials: 'same-origin'
  });

  if (!response.ok) {
    console.error('Failed to add items to cart', response.status, await response.text());
    return false;
  }

  await response.json();
  return true;
}

export async function getStoreCart() {
  const response = await fetch(SHOPIFY_API.GET_CART, {
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
}

export async function updateStoreCartItems(items) {
  const updates = items.map(item => ({
    id: item.id,
    quantity: item.quantity,
    properties: item.properties || { chatbot_added: true }
  }));

  const response = await fetch(SHOPIFY_API.UPDATE_CART, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    },
    body: JSON.stringify({ updates }),
    credentials: 'same-origin'
  });

  if (!response.ok) {
    console.error('Failed to update cart items', response.status, await response.text());
    return false;
  }

  await response.json();
  return true;
}