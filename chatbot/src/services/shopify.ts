import { CART } from '../constants/cart';
import { parseVariantId } from '../utils/utils';
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
 
export const addToCart = async (
  items: CartItem[],
  sections?: string[]
): Promise<ShopifyCartResponse | boolean> => {
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

    const body: any = { items: shopifyItems };
    if (sections && sections.length > 0) {
      body.sections = sections.join(',');
      body.sections_url = '/cart';
    }

    const response = await fetch(CART.ADD, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(body),
      credentials: 'same-origin'
    });

    if (!response.ok) {
      console.error('Failed to add items to cart', response.status, await response.text());
      return false;
    }

    const data = await response.json();
    injectSectionsAndUpdateUI(data);
    return data;
  } catch (err) {
    console.error('Error adding items to cart:', err);
    return false;
  }
};

export const updateCart = async (
  updates: { [key: string]: number },
  sections?: string[],
): Promise<ShopifyCartResponse | null> => {
  try {
    const body: any = { updates };
    if (sections && sections.length > 0) {
      body.sections = sections.join(',');
      body.sections_url = '/cart';
    }

    const response = await fetch(CART.UPDATE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      body: JSON.stringify(body),
      credentials: 'same-origin'
    });

    if (!response.ok) {
      console.error('Failed to update cart', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    injectSectionsAndUpdateUI(data);
    return data;
  } catch (err) {
    console.error('Error updating cart:', err);
    return null;
  }
};

const injectSectionsAndUpdateUI = async (data: any) => {
  const doc = document;
  try {
    const badgeResponse = await fetch('/cart?sections=cart-icon-bubble');
    if (badgeResponse.ok) {
      const badgeData = await badgeResponse.json();
      const badgeHtml = badgeData['cart-icon-bubble'];
      if (badgeHtml && typeof badgeHtml === 'string' && badgeHtml.trim()) {
        const cartIcon = doc.querySelector('cart-icon') || doc.querySelector('[data-testid="cart-icon"]') || doc.querySelector('.header__icon--cart');
        if (cartIcon) {
          cartIcon.innerHTML = badgeHtml;
        }
      } else {
        updateBadgeManually(data.item_count, doc);
      }
    }
  } catch (err) {
    console.error('injectSectionsAndUpdateUI: Badge fetch failed, manual update:', err);
    updateBadgeManually(data.item_count, doc);
  }

  try {
    const drawerResponse = await fetch('/cart?sections=cart-drawer');
    if (drawerResponse.ok) {
      const drawerData = await drawerResponse.json();
      const drawerHtml = drawerData['cart-drawer'];
      if (drawerHtml && typeof drawerHtml === 'string' && drawerHtml.trim()) {
        const drawerEl = doc.querySelector('cart-drawer-component') || doc.querySelector('#cart-drawer') || doc.querySelector('.cart-drawer');
        if (drawerEl) {
          drawerEl.innerHTML = drawerHtml;
        }
      }
    }
  } catch (err) {
    console.error('injectSectionsAndUpdateUI: Drawer fetch failed:', err);
  }

  if (typeof window !== 'undefined') {
    const detail = {
      item_count: data.item_count,
      items: data.items || [],
      total_price: data.total_price || 0
    };
    window.dispatchEvent(new CustomEvent('cart:updated', { bubbles: true, detail }));
    if ((window as any).publish) {
      (window as any).publish('cart:updated', detail);
    }
  }
};

const updateBadgeManually = (count: number, doc: Document) => {
  const textEl = doc.querySelector('.cart-bubble__text') || doc.querySelector('.cart-bubble__text-count') || doc.querySelector('[class*="bubble__text"]');
  if (textEl) {
    textEl.textContent = count.toString();
  }

  const bubbleEl = doc.querySelector('.cart-bubble') || doc.querySelector('[class*="cart-bubble"]');
  if (bubbleEl) {
    if (count === 0) {
      bubbleEl.classList.add('hidden', 'visually-hidden');
    } else {
      bubbleEl.classList.remove('hidden', 'visually-hidden');
    }
    bubbleEl.setAttribute('data-cart-count', count.toString());
  }
};

export const syncCartItemsToShopifyStoreCart = async (localCart: CartItem[]): Promise<boolean> => {
  try {
    const currentShopifyCart = await getCart();
    if (!currentShopifyCart) {
      console.error('Sync failed: Could not get current Shopify cart.');
      return false;
    }

    const updates: { [key: string]: number } = {};

    localCart.forEach(item => {
      const parsedId = parseVariantId(item?.variant_id || item?.id);
      if (parsedId) {
        updates[parsedId] = item.quantity;
      }
    });

    currentShopifyCart?.items.forEach(shopifyItem => {
      const variantId = String(shopifyItem.id);
      if (!updates.hasOwnProperty(variantId)) {
        updates[variantId] = 0;
      }
    });

    if (Object.keys(updates).length === 0) {
      return true;
    }

    const sections = ['cart-icon-bubble', 'cart-items', 'cart-live-region-text', 'cart-drawer'];
    const result = await updateCart(updates, sections);

    if (result) {
      return true;
    } else {
      console.error('Sync failed during the update call.');
      return false;
    }
  } catch (err) {
    console.error('An error occurred during the full cart sync:', err);
    return false;
  }
};