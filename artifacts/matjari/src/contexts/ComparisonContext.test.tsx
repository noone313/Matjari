// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ComparisonProvider, useComparison, MAX_COMPARISON } from './ComparisonContext';
import type { Product } from '@workspace/api-client-react';

describe('MAX_COMPARISON', () => {
  it('يساوي 3', () => {
    expect(MAX_COMPARISON).toBe(3);
  });
});

const makeProduct = (id: number): Product => ({
  id,
  merchantId: 1,
  name: `Product ${id}`,
  description: '',
  category: 'perfume_men',
  isActive: true,
  createdAt: new Date().toISOString(),
  variants: [],
  imageUrls: [],
}) as unknown as Product;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ComparisonProvider storeSlug="test">{children}</ComparisonProvider>
);

beforeEach(() => {
  const store: Record<string, string> = {};
  vi.stubGlobal('localStorage', {
    getItem: vi.fn((k: string) => store[k] ?? null),
    setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
  });
});

describe('useComparison', () => {
  it('يبدأ بقائمة فارغة', () => {
    const { result } = renderHook(() => useComparison(), { wrapper });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.canAdd).toBe(true);
  });

  it('يضيف منتج للمقارنة', () => {
    const { result } = renderHook(() => useComparison(), { wrapper });
    let r: string = '';
    act(() => { r = result.current.addToCompare(makeProduct(1)); });
    expect(r).toBe('added');
    expect(result.current.items).toHaveLength(1);
    expect(result.current.isInCompare(1)).toBe(true);
  });

  it('يرفض إضافة منتج مكرر', () => {
    const { result } = renderHook(() => useComparison(), { wrapper });
    act(() => { result.current.addToCompare(makeProduct(1)); });
    let r: string = '';
    act(() => { r = result.current.addToCompare(makeProduct(1)); });
    expect(r).toBe('already');
    expect(result.current.items).toHaveLength(1);
  });

  it('يرفض عند الوصول للحد الأقصى', () => {
    const { result } = renderHook(() => useComparison(), { wrapper });
    act(() => { result.current.addToCompare(makeProduct(1)); result.current.addToCompare(makeProduct(2)); result.current.addToCompare(makeProduct(3)); });
    expect(result.current.canAdd).toBe(false);
    let r: string = '';
    act(() => { r = result.current.addToCompare(makeProduct(4)); });
    expect(r).toBe('full');
    expect(result.current.items).toHaveLength(3);
  });

  it('يحذف منتج من المقارنة', () => {
    const { result } = renderHook(() => useComparison(), { wrapper });
    act(() => { result.current.addToCompare(makeProduct(1)); });
    act(() => { result.current.removeFromCompare(1); });
    expect(result.current.items).toHaveLength(0);
    expect(result.current.isInCompare(1)).toBe(false);
  });

  it('يمسح كل المقارنة', () => {
    const { result } = renderHook(() => useComparison(), { wrapper });
    act(() => { result.current.addToCompare(makeProduct(1)); result.current.addToCompare(makeProduct(2)); });
    act(() => { result.current.clearCompare(); });
    expect(result.current.items).toHaveLength(0);
  });
});
