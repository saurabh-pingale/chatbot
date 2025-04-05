import { createCartDrawer } from '../components/cart/CartDrawer/cartDrawer';
import { createCartItem } from '../components/cart/CartItem/CartItem';
import { LOCAL_STORAGE } from '../constants/storage.constants';

let autoCloseTimer = null;
let drawerInstance = null;

function ensureCartDrawerExists() {
  if (!drawerInstance) {
    drawerInstance = createCartDrawer();
    document.body.appendChild(drawerInstance);
   
    drawerInstance.querySelector('.cart-drawer-close')
      .addEventListener('click', closeCartDrawer);
  }
}

export function initCartService() {
  ensureCartDrawerExists();
  loadCartFromStorage();
}

export function openCartDrawer() {
  ensureCartDrawerExists();
  
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
  content.innerHTML = items.length === 0 
    ? '<p>Your cart is empty</p>'
    : items.map(item => createCartItem(item)).join('');
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
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE.CART_ITEMS)) || [];
  } catch (e) {
    console.error('Error parsing cart items', e);
    return [];
  }
}

export function addToCart(product) {
  if (!product.variant_id) {
    console.error('Cannot add to cart - product missing variant_id', product);
    return;
  }

  const items = getCartItems();
  const existing = items.find(item => item.variant_id === product.variant_id);
  
  if (existing) {
    existing.quantity += 1;
  } else {
    items.push({
      ...product,
      quantity: 1,
      variant_id: product.variant_id,
      id: product.variant_id
    });
  }
  
  persistCart(items);
  openCartDrawer();
}

export function clearCart() {
  persistCart([]);
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