import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface CartItem {
  productId: number;
  variantId: number;
  productName: string;
  variantLabel: string;
  price: number;
  quantity: number;
  image?: string;
  category: string;
  bundleId?: number;
}

export const cartItemKey = (item: CartItem) =>
  item.bundleId !== undefined ? `b${item.bundleId}` : `v${item.variantId}`;

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children, storeSlug }: { children: ReactNode; storeSlug: string }) {
  const cartKey = `matjari_cart_${storeSlug}`;
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(cartKey);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse cart", e);
      }
    }
  }, [cartKey]);

  useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(items));
  }, [items, cartKey]);

  const addToCart = (newItem: CartItem) => {
    setItems(prev => {
      const key = cartItemKey(newItem);
      const existing = prev.find(item => cartItemKey(item) === key);
      if (existing) {
        return prev.map(item =>
          cartItemKey(item) === key
            ? { ...item, quantity: item.quantity + newItem.quantity }
            : item
        );
      }
      return [...prev, newItem];
    });
  };

  const removeFromCart = (key: string) => {
    setItems(prev => prev.filter(item => cartItemKey(item) !== key));
  };

  const updateQuantity = (key: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(key);
      return;
    }
    setItems(prev => prev.map(item =>
      cartItemKey(item) === key ? { ...item, quantity } : item
    ));
  };

  const clearCart = () => setItems([]);

  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, subtotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}