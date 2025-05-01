import { createCartDrawer } from '../components/cart/CartDrawer/cartDrawer';
import { createCartItem } from '../components/cart/CartItem/CartItem';
import { LOCAL_STORAGE } from '../constants/storage.constants';
import { arraysEqual, extractVariantId } from '../utils/shopify.utils';
import { clearStoreCart, addItemsToStoreCart, getStoreCart } from '../modules/api/cart.module';
import { createLoader } from '../components/ui/Loader/Loader';
import { SHOPIFY_PRODUCT_VARIANT_PREFIX } from '../constants/api.constants';
import { removeCartItemFromBackend, sendCartDataToBackend } from '../modules/api/api.module';

let drawerInstance = null;
let currentChatPage = null;
let isStoreCartUpdating = false;

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

      const loader = createLoader();
      button.innerHTML = '';
      button.appendChild(loader);
      button.disabled = true;

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
        button.removeChild(loader);
        button.textContent = originalText;
        button.disabled = false;
      }
    });
  }
}

export function initCartService() {
  ensureCartDrawerExists();
  loadCartFromStorage();
  setupCartListeners();
}

export function openCartDrawer() {
  ensureCartDrawerExists();
  
  drawerInstance.style.display = 'block';
  drawerInstance.classList.add('open');
  drawerInstance.classList.remove('auto-close');
}

export function closeCartDrawer() {
  if (!drawerInstance) return;
  drawerInstance.classList.remove('open');
  drawerInstance.classList.add('auto-close');
}

function setupCartItemEventListeners(cartItemElement, item) {
  cartItemElement.querySelector('.minus').addEventListener('click', () => {
    addToCart(item, -1);

    trackEvent('products_added_to_cart', {
      cart_items: getCartItems()
    });
  });
  
  cartItemElement.querySelector('.plus').addEventListener('click', () => {
    addToCart(item, 1);

    trackEvent('products_added_to_cart', {
      cart_items: getCartItems()
    });
  });
}

export function updateCartDrawer(items) {
  ensureCartDrawerExists();
  
  const content = drawerInstance.querySelector('.cart-drawer-content');
  content.innerHTML = '';

  if (items?.length === 0 || !items?.length) {
    content.innerHTML = '<p>Your cart is empty</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  items.forEach(item => {
    const cartItemElement = createCartItem(item);
    setupCartItemEventListeners(cartItemElement, item);
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
        variant_id: variantId
      };
    });
  } catch (e) {
    console.error('Error parsing cart items', e);
    return [];
  }
}

export async function addToCart(product, quantityChange = 1) {
  if (!product.variant_id) {
    alert('Cannot add to cart, due to some technical issues');
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
    existing.quantity += quantityChange;
    if (existing.quantity > 10) {
      existing.quantity = 10;
    }

    if (existing.quantity <= 0) {
      items.splice(items.indexOf(existing), 1);
      await removeCartItemFromBackend(existing);
    }
  } else if(quantityChange > 0){
    items.push({
      ...product,
      quantity: Math.min(quantityChange, 10),
      variant_id: variantId,
      id: product.id,
      properties: product.properties || { chatbot_added: true }
    });

    sendCartDataToBackend({
      ...product,
      id: product.id,
      quantity: quantityChange,
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
  if (isStoreCartUpdating) return true;
  isStoreCartUpdating = true;

  const cartIcons = document.querySelectorAll('.chatbot-cart-icon');
  cartIcons.forEach(icon => {
    icon.classList.add('cart-icon-hidden');
  });

  try {
    const storeCart = await getStoreCart();
    const storeItems = storeCart?.items || [];

    const needsSync = !arraysEqual(
      items.map(i => ({ id: i.variant_id, qty: i.quantity })),
      storeItems.map(i => ({ id: i.id, qty: i.quantity }))
    );

    if (!needsSync) return true;

    const clearSuccess = await clearStoreCart();
    if (!clearSuccess) {
      return false;
    }

    if (items.length === 0) return true;
    
    const addSuccess = await addItemsToStoreCart(items);
    return addSuccess;
  } catch (error) {
    console.error('Error syncing cart:', error);
    return false;
  } finally {
    cartIcons.forEach(icon => {
      icon.classList.remove('cart-icon-hidden');
    });
    isStoreCartUpdating = false;
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

function loadCartFromStorage() {
  updateCartDrawer(getCartItems());
  updateCartCount();
}

function setupCartListeners() {
  document.addEventListener('cart:requestComplete', (event) => handleCartUpdate(event));
  document.addEventListener('cart:updated', (event) => handleCartUpdate(event));
  document.addEventListener('cart:change', (event) => handleCartUpdate(event));
  let lastCartToken = null;
  let lastItemCount = 0;

  setInterval(async () => {
    try {
      const storeCart = await getStoreCart();
 
      const currentItemCount = storeCart?.item_count || 0;
      
      if (storeCart?.token !== lastCartToken || currentItemCount !== lastItemCount) {
        lastCartToken = storeCart?.token;
        lastItemCount = currentItemCount;

        handleCartUpdate({ detail: { response: storeCart } });
      }
    } catch (error) {
      console.error('Error polling cart:', error);
    }
  }, 8000);  
};

async function handleCartUpdate(event) {
  try {
    const storeCart = event.detail?.response || await getStoreCart();
    
    if (storeCart) {
      await handleStoreCartUpdate(storeCart);
    }
  } catch (error) {
    console.error('Error handling cart update:', error);
  }
}

async function handleStoreCartUpdate(storeCart) {
  if (isStoreCartUpdating) return;

  const items = storeCart.items.map(item => ({
    id: item.id,
    variant_id: `${SHOPIFY_PRODUCT_VARIANT_PREFIX}${item.id}`,
    title: item.title,
    price: item.price,
    image: item.image,
    quantity: item.quantity,
    properties: item.properties || {}
  }));

  const currentItems = getCartItems();

  const currentItemsSimplified = currentItems.map(i => ({ id: i.id, qty: i.quantity }));
  const storeItemsSimplified = items.map(i => ({ id: i.id, qty: i.quantity }));

   if (!arraysEqual(storeItemsSimplified, currentItemsSimplified)) {
    persistCart(items);
  }
}