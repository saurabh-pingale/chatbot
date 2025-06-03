import { useState, useCallback, useEffect } from 'react';
import { trackEvent } from '../services/chat';
import { getCart, syncCartWithShopify } from '../services/shopify';
import { CART_STORAGE_KEY, POLL_INTERVAL, SHOPIFY_VARIANT_PREFIX } from '../constants/cart';
import type { CartItem, ProductType } from '../types';

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
    const productPrice = typeof product.price === 'string' ? parseFloat(product.price) : product.price;

    const newItem: CartItem = {
      ...product,
      price: productPrice,
      quantity: 1,
    };

    setCartItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => 
        (item.variant_id && product.variant_id && item.variant_id === product.variant_id) || 
        (!item.variant_id && !product.variant_id && item.id === product.id)
      );

      let updatedItems;
      if (existingItemIndex > -1) {
        updatedItems = [...prevItems];
        const currentItem = updatedItems[existingItemIndex];
        updatedItems[existingItemIndex] = {
          ...currentItem,
          quantity: Math.min(currentItem.quantity + 1, 10),
        };
      } else {
        updatedItems = [...prevItems, newItem];
      }
      
      syncCartWithShopify(updatedItems).catch(err => {
        console.error('Failed to sync cart with Shopify after add:', err);
      });
      return updatedItems;
    });

    setIsCartOpen(true);
    trackEvent('products_added_to_cart', { cart_items: newItem });

  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCartItems(prev => {
        const updatedItems = prev.filter(item => String(item.id) !== productId);
        syncCartWithShopify(updatedItems).catch(err => console.error('Failed to sync after remove:', err));
        return updatedItems;
    });
  }, []);

  const updateQuantity = useCallback(async (productId: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }

    if (quantity > 10) {
      quantity = 10;
    }

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
        syncCartWithShopify(newItems).catch(err => console.error('Failed to sync after update qty:', err));
        return newItems;
    });
  }, [removeFromCart]);

  const toggleCart = useCallback(() => {
    setIsCartOpen(prev => !prev);
  }, []);

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
  };
}; 