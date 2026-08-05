import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Product } from '@workspace/api-client-react';

export const MAX_COMPARISON = 3;

export type AddCompareResult = 'added' | 'already' | 'full';

interface ComparisonContextType {
  items: Product[];
  addToCompare: (product: Product) => AddCompareResult;
  removeFromCompare: (id: number) => void;
  clearCompare: () => void;
  isInCompare: (id: number) => boolean;
  canAdd: boolean;
}

const ComparisonContext = createContext<ComparisonContextType | undefined>(undefined);

export function ComparisonProvider({ children, storeSlug }: { children: ReactNode; storeSlug: string }) {
  const storageKey = `matjari_compare_${storeSlug}`;
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch {
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items, storageKey]);

  const addToCompare = (product: Product): AddCompareResult => {
    if (items.some((p) => p.id === product.id)) return 'already';
    if (items.length >= MAX_COMPARISON) return 'full';
    setItems((prev) =>
      prev.some((p) => p.id === product.id) || prev.length >= MAX_COMPARISON
        ? prev
        : [...prev, product],
    );
    return 'added';
  };

  const removeFromCompare = (id: number) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  const clearCompare = () => setItems([]);

  const isInCompare = (id: number) => items.some((p) => p.id === id);
  const canAdd = items.length < MAX_COMPARISON;

  return (
    <ComparisonContext.Provider
      value={{ items, addToCompare, removeFromCompare, clearCompare, isInCompare, canAdd }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  const context = useContext(ComparisonContext);
  if (context === undefined) {
    throw new Error('useComparison must be used within a ComparisonProvider');
  }
  return context;
}
