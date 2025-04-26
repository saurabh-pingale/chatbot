import { 
  initCartService,
  addToCart as serviceAddToCart,
  openCartDrawer,
  getCartItems,
  clearCart
} from '../../services/cart.service';
import { extractVariantId } from '../../utils/shopify.utils';
import { trackEvent } from '../user/tracking.module';

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

  const variantId = extractVariantId(product.variant_id);
  if (!variantId) {
    console.error('Invalid variant ID format', product.variant_id);
    return false;
  }

  const cartProduct = {
    ...product,
    variant_id: variantId,
    image: product.image || '',
    title: product.title || '',
    price: product.price || '',
    category: product.category || '',
    quantity: product.quantity,
    source: 'chatbot'
  };
  
  serviceAddToCart(cartProduct);

  trackEvent('products_added_to_cart', {
    cart_items: getCartItems()
  });

  return true;
}

export function getCart() {
  return getCartItems();
}

export function emptyCart() {
  clearCart();
}