import { useState, useCallback, useEffect, useRef } from 'react';
import { getCart, syncCartItemsToShopifyStoreCart } from '../services/shopify';
import { getLatestInventory, removeCheckoutProduct, storeCheckoutProduct } from '../services/checkout-product';
import { fetchCartFromDB, addToCartDB, removeFromCartDB, clearCartDB } from '../services/cart';
import { useDebounce } from './useDebounce';
import { trackAddedToCart } from '../services/analytics';
import { POLL_INTERVAL, SHOPIFY_VARIANT_PREFIX, CART_STORAGE_KEY } from '../constants/cart';
import type { CartItem, ProductType } from '../types';
import { getShopId } from '../utils/utils';

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoadingCart, setIsLoadingCart] = useState(true);
  const debouncedCartItems = useDebounce(cartItems, 500);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const isInitialMount = useRef(true);
  const syncLock = useRef(false);
  
  let lastToken: string | null = null;
  let lastCount = 0;

  const loadCart = async () => {
    try {
      const dbCart = await fetchCartFromDB();
      setCartItems(dbCart);
    } catch (err) {
      console.error('Failed to load cart from DB, falling back to localStorage', err);
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      if (stored) setCartItems(JSON.parse(stored));
    } finally {
      setIsLoadingCart(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const saveCart = async () => {
    try {
      localStorage.removeItem(CART_STORAGE_KEY);
    } catch (err) {
      console.error('Failed to save cart to DB', err);
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    }
  };

  useEffect(() => {
    if (!isInitialMount.current) saveCart();
  }, [debouncedCartItems]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (syncLock.current) {
      syncLock.current = false;
      return;
    }
    syncCartItemsToShopifyStoreCart(debouncedCartItems).catch(err => console.error('Background sync failed:', err));
  }, [debouncedCartItems]);

  const pollCart = async () => {
    if (JSON.stringify(cartItems) !== JSON.stringify(debouncedCartItems)) return;
    try {
      const cart = await getCart();
      if (!cart) return;
      if (cart.token === lastToken && cart.item_count === lastCount) return;
      lastToken = cart.token;
      lastCount = cart.item_count;
      
      const shopifyItems: CartItem[] = cart.items.map((item) => ({
        id: String(item.id),
        variant_id: `${SHOPIFY_VARIANT_PREFIX}${item.id}`,
        name: item.title,
        price: item.price / 100,
        image_url: item.image,
        description: '',
        quantity: item.quantity,
        variant_quantity: cartItems.find(localItem => localItem.variant_id === `${SHOPIFY_VARIANT_PREFIX}${item.id}`)?.variant_quantity ?? 10,
      }));

      syncLock.current = true;
      setCartItems(shopifyItems); 
    } catch (err) {
      console.error('Error polling cart:', err);
    }
  };

  useEffect(() => {
    const intervalId = setInterval(pollCart, POLL_INTERVAL);
    return () => clearInterval(intervalId);
  }, [cartItems, debouncedCartItems]);

  const addToCart = useCallback(async (product: ProductType) => {
    const availableQty = product.variant_quantity ?? 10;
    const existingItem = cartItems.find(item => item.variant_id === product.variant_id);
    const currentQty = existingItem?.quantity ?? 0;

    if (currentQty >= availableQty) {
      setCartError("No more product available in the store");
      return;
    }

    let newQuantity = currentQty + 1;
    newQuantity = Math.min(newQuantity, availableQty, 10);
    if (newQuantity === currentQty) {
      setCartError("No more product available in the store");
      return;
    }

    const productPrice = typeof product?.price === 'string' ? parseFloat(product?.price) : product?.price;
    const variantId = Number(product.id);
    const shopId = getShopId();

    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => 
        (item.variant_id && product.variant_id && item.variant_id === product.variant_id) || 
        (!item.variant_id && !product.variant_id && item.id === product.id)
      );

      let updatedItems: CartItem[];
      let updatedProductCount: number;

      if (existingItemIndex > -1) {
        updatedItems = [...prevItems];
        const currentQty = updatedItems[existingItemIndex]?.quantity;
        updatedProductCount = Math.min(currentQty + 1, 10);
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedProductCount,
          variant_quantity: availableQty ?? 10,
        };
      } else {
        updatedProductCount = 1;
        const newItem: CartItem = {
          ...product,
          price: productPrice,
          quantity: updatedProductCount,
          variant_quantity: availableQty ?? 10
        };
        updatedItems = [...prevItems, newItem];
      }

      (async () => {
        try {
          await addToCartDB(variantId, updatedProductCount);

          storeCheckoutProduct({ product_id: variantId, product_count: updatedProductCount });
          trackAddedToCart();

          getLatestInventory(variantId, shopId);
        } catch (err) {
          console.error('DB sync failed for add:', err);
          setCartError('Failed to save cart. Please try again.');
        }
      })();

      return updatedItems;
    });

    setIsCartOpen(true);
  }, [cartItems]);

  const removeFromCart = useCallback((productId: string) => {
    const variantId = Number(productId);

    setCartItems(prev => {
      const updatedItems = prev.filter(item => String(item.id) !== productId);
      return updatedItems;
    });

    (async () => {
      try {
        await removeFromCartDB(variantId);
        removeCheckoutProduct({ product_id: variantId });
      } catch (err) {
        console.error('DB sync failed for remove:', err);
      }
    })();

    setIsCartOpen(prev => !prev);
  }, []);

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }

    const cappedQuantity = Math.min(quantity, 10);
    const currentItem = cartItems.find(item => String(item.id) === productId);
    const oldQuantity = currentItem ? currentItem.quantity : 0;
    const isIncreasing = cappedQuantity > oldQuantity;
    const availableQuantity = currentItem?.variant_quantity ?? 10;
    const finalQuantity = Math.min(cappedQuantity, availableQuantity);

    if (finalQuantity <= oldQuantity && isIncreasing) {
      setCartError("No more product available in the store");
      return;
    }

    const variantId = Number(productId);
    const shopId = getShopId();

    setCartItems(prev => {
      const updatedItems = prev.map(item =>
        String(item.id) === productId
          ? { ...item, quantity: finalQuantity, variant_quantity: availableQuantity }
          : item
      );

      (async () => {
        try {
          await addToCartDB(variantId, finalQuantity);
          storeCheckoutProduct({ product_id: variantId, product_count: cappedQuantity });
          if (isIncreasing) {
            trackAddedToCart();
            getLatestInventory(variantId, shopId);
          }
        } catch (err) {
          console.error('DB sync failed for update:', err);
          setCartError('Failed to update cart. Please try again.');
        }
      })();

      return updatedItems;
    });
  }, [cartItems, removeFromCart]);

  const toggleCart = useCallback(() => setIsCartOpen(prev => !prev), []);

  const checkout = async () => {
    try {
      const success = await syncCartItemsToShopifyStoreCart(cartItems);
      if (success) {
        await clearCartDB();
        const checkoutUrl = new URL('/checkout', window.location.origin);
        checkoutUrl.searchParams.set('utm_source', 'chatbot');
        window.location.href = checkoutUrl.toString();
      } else {
        alert("There was an error syncing your cart. Please try again.");
      }
    } catch (err) {
      alert("An unexpected error occurred during checkout. Please try again.");
      console.error("Error during checkout:", err);
    }
  };

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => {
    const price = typeof item.price === 'string' ? parseFloat(item.price) : item.price;
    return sum + (price * item.quantity);
  }, 0);

  return {
    cartItems,
    isCartOpen,
    totalItems,
    totalPrice,
    addToCart,
    removeFromCart,
    updateQuantity,
    toggleCart,
    checkout,
    cartError,
    setCartError,
    isLoadingCart,
  };
};