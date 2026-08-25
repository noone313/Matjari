// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { CartProvider, useCart, cartItemKey } from './CartContext';
import type { CartItem } from './CartContext';

// ─── cartItemKey (pure) ─────────────────────────────────────────────────────
describe('cartItemKey', () => {
  const make = (o: Partial<CartItem> = {}): CartItem => ({
    productId: 1, variantId: 10, productName: 'X', variantLabel: 'Y', price: 5000, quantity: 1, category: 'perfume_men', ...o,
  });

  it('product عادي → v{id}', () => {
    expect(cartItemKey(make({ variantId: 42 }))).toBe('v42');
  });

  it('bundle → b{id}', () => {
    expect(cartItemKey(make({ bundleId: 99, variantId: 0 }))).toBe('b99');
  });
});

// ─── useCart hook ───────────────────────────────────────────────────────────
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <CartProvider storeSlug="test-store">{children}</CartProvider>
);

function mockLocalStorage() {
  const store: Record<string, string> = {};
  return {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
    _store: store,
  };
}

beforeEach(() => {
  const ls = mockLocalStorage();
  vi.stubGlobal('localStorage', ls);
});

describe('useCart', () => {
  it('يبدأ بسلة فارغة', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.itemCount).toBe(0);
  });

  it('يضيف منتج للسلة', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const item: CartItem = { productId: 1, variantId: 10, productName: 'عطر', variantLabel: '100ml', price: 50000, quantity: 1, category: 'perfume_men' };
    act(() => result.current.addToCart(item));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.subtotal).toBe(50000);
    expect(result.current.itemCount).toBe(1);
  });

  it('يجمع الكمية عند إضافة منتج موجود', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    const item: CartItem = { productId: 1, variantId: 10, productName: 'عطر', variantLabel: '100ml', price: 50000, quantity: 1, category: 'perfume_men' };
    act(() => { result.current.addToCart(item); result.current.addToCart(item); });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].quantity).toBe(2);
    expect(result.current.subtotal).toBe(100000);
    expect(result.current.itemCount).toBe(2);
  });

  it('يحذف منتج من السلة', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart({ productId: 1, variantId: 10, productName: 'X', variantLabel: 'Y', price: 5000, quantity: 1, category: 'a' }));
    act(() => result.current.removeFromCart('v10'));
    expect(result.current.items).toHaveLength(0);
  });

  it('يغيّر الكمية', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart({ productId: 1, variantId: 10, productName: 'X', variantLabel: 'Y', price: 5000, quantity: 1, category: 'a' }));
    act(() => result.current.updateQuantity('v10', 5));
    expect(result.current.items[0].quantity).toBe(5);
    expect(result.current.subtotal).toBe(25000);
  });

  it('يحذف عند الكمية < 1', () => {
    const { result } = renderHook(() => useCart(), { wrapper });
    act(() => result.current.addToCart({ productId: 1, variantId: 10, productName: 'X', variantLabel: 'Y', price: 5000, quantity: 1, category: 'a' }));
    act(() => result.current.updateQuantity('v10', 0));
    expect(result.current.items).toHaveLength(0);
  });

  it('يرجع خطأ خارج CartProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useCart())).toThrow('useCart must be used within a CartProvider');
    consoleSpy.mockRestore();
  });
});
