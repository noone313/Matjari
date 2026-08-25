// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { WishlistProvider, useWishlist } from './WishlistContext';

beforeEach(() => {
  const ls = { data: {} as Record<string, string>, getItem(k: string) { return this.data[k] ?? null; }, setItem(k: string, v: string) { this.data[k] = v; }, removeItem(k: string) { delete this.data[k]; } };
  vi.stubGlobal('localStorage', ls);
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WishlistProvider storeSlug="test">{children}</WishlistProvider>
);

describe('useWishlist', () => {
  it('يبدأ بقائمة فارغة', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.count).toBe(0);
  });

  it('يضيف للقائمة', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });
    act(() => result.current.addToWishlist(1));
    expect(result.current.count).toBe(1);
    expect(result.current.isWishlisted(1)).toBe(true);
  });

  it('لا يكرر الإضافة', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });
    act(() => { result.current.addToWishlist(1); result.current.addToWishlist(1); });
    expect(result.current.count).toBe(1);
  });

  it('يحذف من القائمة', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });
    act(() => result.current.addToWishlist(1));
    act(() => result.current.removeFromWishlist(1));
    expect(result.current.count).toBe(0);
  });

  it('toggle يضيف ثم يحذف', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });
    act(() => result.current.toggleWishlist(1));
    expect(result.current.isWishlisted(1)).toBe(true);
    act(() => result.current.toggleWishlist(1));
    expect(result.current.isWishlisted(1)).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it('isWishlisted يرجع false لغير موجود', () => {
    const { result } = renderHook(() => useWishlist(), { wrapper });
    expect(result.current.isWishlisted(999)).toBe(false);
  });
});
