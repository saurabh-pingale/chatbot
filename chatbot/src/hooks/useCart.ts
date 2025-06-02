import { useState, useCallback, useEffect } from 'react';
import { trackEvent } from '../services/chat';
import { getCart, syncCartWithShopify } from '../services/shopify';
import { CART_STORAGE_KEY, POLL_INTERVAL, SHOPIFY_VARIANT_PREFIX } from '../constants/cart';
import type { CartItem, Product } from '../types';

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
  const [isSyncing, setIsSyncing] = useState(false);
  
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

      const shopifyItems = cart.items.map(item => ({
        id: String(item.id),
        variant_id: `${SHOPIFY_VARIANT_PREFIX}${item.id}`,
        title: item.title,
        price: item.price,
        image: item.image,
        description: '',
        quantity: item.quantity,
        properties: item.properties || {}
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

  const addToCart = useCallback(async (product: Product) => {
    const newItem: CartItem = {
      ...product,
      quantity: 1
    };

    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === product.id);
      if (existingItem) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, 10) }
            : item
        );
      }
      return [...prev, newItem];
    });

    setIsCartOpen(true);
    trackEvent('products_added_to_cart', { cart_items: cartItems });

    setIsSyncing(true);
    try {
      await syncCartWithShopify(cartItems);
    } catch (err) {
      console.error('Failed to sync cart with Shopify:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [cartItems]);

  const removeFromCart = useCallback((productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  }, []);

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }

    if (quantity > 10) {
      quantity = 10;
    }

    setCartItems(prev =>
      prev.map(item =>
        item.id === productId
          ? { ...item, quantity }
          : item
      )
    );

    setIsSyncing(true);
    try {
      await syncCartWithShopify(cartItems);
    } catch (err) {
      console.error('Failed to sync cart with Shopify:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [cartItems, removeFromCart]);

  const toggleCart = useCallback(() => {
    setIsCartOpen(prev => !prev);
  }, []);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return {
    cartItems,
    isCartOpen,
    isSyncing,
    totalItems,
    totalPrice,
    addToCart,
    removeFromCart,
    updateQuantity,
    toggleCart,
  };
}; 