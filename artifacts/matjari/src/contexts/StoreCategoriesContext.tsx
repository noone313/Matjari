import React, { createContext, useContext, useState, useCallback } from 'react';
import { useStoreCategories, type Category } from '@/hooks/useCategories';

interface StoreCategoriesCtx {
  categories: Category[];
  getCategoryLabel: (slug: string) => string;
  isLoading: boolean;
  activeCategory: string;
  setActiveCategory: (cat: string) => void;
}

const StoreCategoriesContext = createContext<StoreCategoriesCtx>({
  categories: [],
  getCategoryLabel: (slug) => slug,
  isLoading: false,
  activeCategory: '',
  setActiveCategory: () => {},
});

export function StoreCategoriesProvider({ slug, children }: { slug: string; children: React.ReactNode }) {
  const { data: categories = [], isLoading } = useStoreCategories(slug);
  const [activeCategory, setActiveCategory] = useState('');

  const getCategoryLabel = (slug: string) => {
    return categories.find((c) => c.slug === slug)?.label || slug;
  };

  return (
    <StoreCategoriesContext.Provider value={{ categories, getCategoryLabel, isLoading, activeCategory, setActiveCategory }}>
      {children}
    </StoreCategoriesContext.Provider>
  );
}

export function useStoreCategoriesCtx() {
  return useContext(StoreCategoriesContext);
}
