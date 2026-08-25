import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useBrowseStoreProducts, getBrowseStoreProductsQueryKey } from '@workspace/api-client-react';
import type { Product } from '@workspace/api-client-react';
import { formatPrice, getApiUrl } from '@/lib/utils';
import { useStoreCategoriesCtx } from '@/contexts/StoreCategoriesContext';
import { Search, X, ArrowLeft } from 'lucide-react';
import { BlurImage } from '@/components/BlurImage';
import { useLocation } from 'wouter';

const MAX_SUGGESTIONS = 6;
const DEBOUNCE_MS = 250;

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

interface ProductSearchProps {
  slug: string;
  value: string;
  onChange: (value: string) => void;
  onSearch: (value: string) => void;
  className?: string;
}

export default function ProductSearch({ slug, value, onChange, onSearch, className }: ProductSearchProps) {
  const { getCategoryLabel } = useStoreCategoriesCtx();
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  const debouncedSearch = useDebounced(value, DEBOUNCE_MS);

  const { data: allProducts, isLoading } = useBrowseStoreProducts(
    slug,
    { search: debouncedSearch || undefined },
    {
      query: {
        enabled: !!slug && debouncedSearch.trim().length >= 2,
        queryKey: getBrowseStoreProductsQueryKey(slug, { search: debouncedSearch || undefined }),
      },
    },
  );

  const products = (allProducts ?? [])
    .filter((p) => p.imageUrls?.length && p.imageUrls.some((u) => u?.trim()))
    .slice(0, MAX_SUGGESTIONS);

  const showDropdown = isOpen && debouncedSearch.trim().length >= 2;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(-1);
  }, [products.length, debouncedSearch]);

  const selectProduct = useCallback(
    (product: Product) => {
      setIsOpen(false);
      inputRef.current?.blur();
      setLocation(`/store/${slug}/product/${product.id}`);
    },
    [slug, setLocation],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setIsOpen(false);
      onSearch(value);
      inputRef.current?.blur();
    },
    [value, onSearch],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < products.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : products.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && products[activeIndex]) {
      e.preventDefault();
      selectProduct(products[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const minPrice = (p: Product) =>
    p.variants?.length ? Math.min(...p.variants.map((v) => v.price)) : 0;

  return (
    <div ref={containerRef} className={`relative ${className ?? ''}`}>
      <form onSubmit={handleSubmit} className="relative">
        <Search className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder="بحث عن منتج..."
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (debouncedSearch.trim().length >= 2) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="w-full text-sm bg-transparent border-b border-zinc-200 dark:border-zinc-700 focus:border-primary outline-none py-2 pl-6 pr-7 placeholder:text-zinc-300 dark:placeholder:text-zinc-600 transition-colors dark:text-zinc-300"
          dir="rtl"
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setIsOpen(false);
              inputRef.current?.focus();
            }}
            className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-primary"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </form>

      {/* Autocomplete dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-xl rounded-lg overflow-hidden z-50 max-h-[400px] overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center text-sm text-zinc-400 dark:text-zinc-500">
              <div className="inline-block w-4 h-4 border-2 border-zinc-200 dark:border-zinc-700 border-t-primary rounded-full animate-spin" />
            </div>
          ) : products.length > 0 ? (
            <>
              {products.map((product, i) => (
                <button
                  key={product.id}
                  onClick={() => selectProduct(product)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-right transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-b-0 ${
                    i === activeIndex
                      ? 'bg-zinc-50 dark:bg-zinc-800/50'
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="w-12 h-12 shrink-0 rounded overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                    {product.imageUrls?.[0] ? (
                      <BlurImage
                        src={getApiUrl(product.imageUrls[0])}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-lg font-serif text-zinc-300 dark:text-zinc-600">
                          {product.name.charAt(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-900 dark:text-white truncate font-serif">
                      {highlightMatch(product.name, debouncedSearch)}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                        {getCategoryLabel(product.category)}
                      </span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="shrink-0 text-left">
                    <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {formatPrice(minPrice(product))}
                    </span>
                  </div>

                  {/* Arrow */}
                  <ArrowLeft className="w-3.5 h-3.5 text-zinc-300 dark:text-zinc-600 shrink-0" />
                </button>
              ))}

              {/* "View all results" footer */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onSearch(value);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold tracking-widest uppercase text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors border-t border-zinc-100 dark:border-zinc-800"
              >
                عرض كل النتائج
                <ArrowLeft className="w-3 h-3" />
              </button>
            </>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm text-zinc-400 dark:text-zinc-500">
                لا توجد منتجات تطابق "{debouncedSearch}"
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Highlight matching substring in product name */
function highlightMatch(name: string, query: string): React.ReactNode {
  if (!query.trim()) return name;
  const idx = name.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return name;
  return (
    <>
      {name.slice(0, idx)}
      <span className="font-bold text-primary">{name.slice(idx, idx + query.length)}</span>
      {name.slice(idx + query.length)}
    </>
  );
}
