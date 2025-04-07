import { createCartDrawer } from '../components/cart/CartDrawer/cartDrawer';
import { createCartItem } from '../components/cart/CartItem/CartItem';
import { LOCAL_STORAGE } from '../constants/storage.constants';
import { extractVariantId } from '../utils/shopify.utils';
import { clearStoreCart, addItemsToStoreCart } from '../modules/api/cartSync.module';

let autoCloseTimer = null;
let drawerInstance = null;
let currentChatPage = null;

function ensureCartDrawerExists() {
  if (!drawerInstance) {
    drawerInstance = createCartDrawer();
  }

  const chatPage = document.querySelector('.chat-page');
  if (chatPage && chatPage !== currentChatPage) {
    if (drawerInstance.parentNode) {
      drawerInstance.parentNode.removeChild(drawerInstance);
    }

    chatPage.appendChild(drawerInstance);
    currentChatPage = chatPage
    
    drawerInstance.querySelector('.cart-drawer-close')
      .addEventListener('click', closeCartDrawer);

    drawerInstance.querySelector('.checkout-button')
    .addEventListener('click', async (e) => {
      e.preventDefault();
      const button = e.target;
      const originalText = button.textContent;

      button.disabled = true;
      button.textContent = 'Processing...';

      try {
        const items = getCartItems();
        const syncSuccess = await syncWithStoreCart(items);

        if (syncSuccess) {
            window.location.href = '/cart';
        } else {
          alert('Failed to sync cart. Please try again.');
        }
      } catch (error) {
        console.error('Checkout error:', error);
        alert('An error occurred during checkout.');
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    });
  }
}

export function initCartService() {
  ensureCartDrawerExists();
  loadCartFromStorage();
}

export function openCartDrawer() {
  ensureCartDrawerExists();
  
  drawerInstance.style.display = 'block';
  drawerInstance.classList.add('open');
  drawerInstance.classList.remove('auto-close');
  
  resetAutoCloseTimer();
}

export function closeCartDrawer() {
  if (!drawerInstance) return;
  drawerInstance.classList.remove('open');
  drawerInstance.classList.add('auto-close');
}

export function updateCartDrawer(items) {
  ensureCartDrawerExists();
  
  const content = drawerInstance.querySelector('.cart-drawer-content');
  content.innerHTML = '';

  if (items.length === 0) {
    content.innerHTML = '<p>Your cart is empty</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach(item => {
    const cartItemElement = createCartItem(item);
    fragment.appendChild(cartItemElement);
  });

  content.appendChild(fragment);
}

export function updateCartCount() {
  const items = getCartItems();
  const total = items.reduce((sum, item) => sum + item.quantity, 0);
  
  document.querySelectorAll('.cart-count').forEach(el => {
    el.textContent = total;
    el.style.display = total > 0 ? 'flex' : 'none';
  });
}

export function getCartItems() {
  try {
    const items = JSON.parse(localStorage.getItem(LOCAL_STORAGE.CART_ITEMS)) || [];

    return items.map(item => {
      const variantId = extractVariantId(item.variant_id);
      return {
        ...item,
        variant_id: variantId,
        id: variantId
      };
    });
  } catch (e) {
    console.error('Error parsing cart items', e);
    return [];
  }
}

export async function addToCart(product) {
  if (!product.variant_id) {
    console.error('Cannot add to cart - product missing variant_id', product);
    return;
  }

  const variantId = extractVariantId(product.variant_id);
  if (!variantId) {
    console.error('Invalid variant ID format', product.variant_id);
    return;
  }

  const items = getCartItems();
  const existing = items.find(item => {
    const existingId = extractVariantId(item.variant_id);
    return existingId === variantId;
  });
  
  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({
      ...product,
      quantity: 1,
      variant_id: variantId,
      id: variantId
    });
  }
  
  await persistCart(items);
  await syncWithStoreCart(items);
  openCartDrawer();
}

export function clearCart() {
  persistCart([]);
}

async function syncWithStoreCart(items) {
  try {
    const clearSuccess = await clearStoreCart();
    if (!clearSuccess) {
      return false;
    }

    if (items.length === 0) {
      return true;
    }

    const addSuccess = await addItemsToStoreCart(items);
    return addSuccess;
  } catch (error) {
    console.error('Error syncing cart:', error);
    return false;
  }
}

function persistCart(items) {
  try {
    localStorage.setItem(LOCAL_STORAGE.CART_ITEMS, JSON.stringify(items));
    updateCartDrawer(items);
    updateCartCount();
  } catch (e) {
    console.error('Error saving cart to localStorage', e);
  }
}

function resetAutoCloseTimer() {
  if (autoCloseTimer) clearTimeout(autoCloseTimer);
  autoCloseTimer = setTimeout(closeCartDrawer, 5000);
}

function loadCartFromStorage() {
  updateCartDrawer(getCartItems());
  updateCartCount();
}