import { 
  initCartService,
  addToCart as serviceAddToCart,
  openCartDrawer,
  getCartItems,
  clearCart
} from '../../services/cart.service';

let cartInitialized = false;

export function initCartModule() {
  if (cartInitialized) return;
  
  initCartService();
  
  document.querySelectorAll('.chatbot-cart-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      openCartDrawer();
    });
  });
  
  cartInitialized = true;
}

export function addToCart(product) {
  if (!product.variant_id) {
    console.error('Product missing required variant_id', product);
    return false;
  }
  
  serviceAddToCart({
    ...product,
    variant_id: product.variant_id.toString()
  });
  return true;
}

export function getCart() {
  return getCartItems();
}

export function emptyCart() {
  clearCart();
}