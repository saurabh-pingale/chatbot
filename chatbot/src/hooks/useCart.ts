import { useState, useCallback, useEffect } from 'react';
import { getCart, syncCartItemsToShopifyStoreCart } from '../services/shopify';
import { removeCheckoutProduct, storeCheckoutProduct } from '../services/checkout-product';
import { CART_STORAGE_KEY, POLL_INTERVAL, SHOPIFY_VARIANT_PREFIX } from '../constants/cart';
import type { CartItem, ProductType } from '../types';
import { getStoredUtmParameters } from '../utils/utm';

export const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Error parsing cart items', err);
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCartSyncing, setIsCartSyncing] = useState(false);
  
  let lastToken: string | null = null;
  let lastCount = 0;

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (err) {
      console.error('Error saving cart to localStorage', err);
    }
  }, [cartItems]);

  const pollCart = async () => {
    try {
      const cart = await getCart();
      if (!cart) return;

      if (cart.token === lastToken && cart.item_count === lastCount) {
        return;
      }

      lastToken = cart.token;
      lastCount = cart.item_count;

      const shopifyItems: CartItem[] = cart.items.map(item => ({
        id: String(item.id),
        variant_id: `${SHOPIFY_VARIANT_PREFIX}${item.id}`,
        name: item.title,
        price: item.price / 100,
        image_url: item.image,
        description: '',
        quantity: item.quantity,
      }));

      setCartItems(shopifyItems);
    } catch (err) {
      console.error('Error polling cart:', err);
    }
  };

  useEffect(() => {
    const intervalId = setInterval(pollCart, POLL_INTERVAL);
    return () => clearInterval(intervalId);
  }, []);

  const addToCart = useCallback(async (product: ProductType) => {
    const productPrice = typeof product?.price === 'string' ? parseFloat(product?.price) : product?.price;

    const newItem: CartItem = {
      ...product,
      price: productPrice,
      quantity: 1,
    };

    //TODO: Do you think, its correct ?
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
        };
      } else {
        updatedProductCount = 1;
        updatedItems = [...prevItems, newItem];
      }

      storeCheckoutProduct({
        product_id: Number(product.id),
        product_count: updatedProductCount,
      });

      setIsCartSyncing(true);
      setTimeout(() => {
        syncCartItemsToShopifyStoreCart(updatedItems)
          .catch(err => console.error('Failed to sync cart with Shopify after add:', err))
          .finally(() => setIsCartSyncing(false));
      }, 0)

      return updatedItems;
    });

    setIsCartOpen(true);
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    //TODO: Here first update the setCartItems once it done, in background do the job of syncing
    setIsCartSyncing(true);
    setCartItems(prev => {
        const updatedItems = prev.filter(item => String(item.id) !== productId);
        //TODO: Handle In background
        syncCartItemsToShopifyStoreCart(updatedItems)
          .catch(err => console.error('Failed to sync after remove:', err))
          .finally(() => setIsCartSyncing(false));

        //TODO: If you remove this below line, what will happen ?
        //TODO: Handle In background and add analytics inside this remove checkout
        removeCheckoutProduct(Number(productId))

        return updatedItems;
    });
    setIsCartOpen(prev => !prev);
  }, []);

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }

    if (quantity > 10) {
      quantity = 10;
    }

    setIsCartSyncing(true);
    setCartItems(prev => {
        let newItems;
        if (quantity < 1) {
            newItems = prev.filter(item => String(item.id) !== productId);
        } else {
            newItems = prev.map(item =>
                String(item.id) === productId
                ? { ...item, quantity: Math.min(quantity, 10) }
                : item
            );
        }
        syncCartItemsToShopifyStoreCart(newItems)
          .catch(err => console.error('Failed to sync after update qty:', err))
          .finally(() => setIsCartSyncing(false));
        return newItems;
    });
  }, [removeFromCart]);

  const toggleCart = useCallback(() => {
    setIsCartOpen(prev => !prev);
  }, []);

  const checkout = async () => {
    try {
      const success = await syncCartItemsToShopifyStoreCart(cartItems);
      if (success) {
        const utmParams = getStoredUtmParameters();
        const checkoutUrl = new URL('/checkout', window.location.origin);
        checkoutUrl.searchParams.set('utm_source', 'chatbot');

        if (utmParams) {
          for (const [key, value] of Object.entries(utmParams)) {
            if (value) {
              checkoutUrl.searchParams.set(key, value);
            }
          }
        }
        
        window.location.href = checkoutUrl.toString();
      } else {
        alert("There was an error syncing your cart. Please try again.");
        console.error("Failed to sync cart with Shopify before checkout.");
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
  },0);

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
    isCartSyncing
  };
}; 