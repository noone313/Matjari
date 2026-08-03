import React, { useState, useEffect } from 'react';
import { useBrowseStoreProducts, getBrowseStoreProductsQueryKey } from '@workspace/api-client-react';
import { formatPrice, getCategoryLabel } from '@/lib/utils';
import { Link, useLocation } from 'wouter';
import { SlidersHorizontal, X } from 'lucide-react';

const CATEGORIES = [
  { value: '', label: 'الكل' },
  { value: 'perfume_men', label: 'عطور رجالي' },
  { value: 'perfume_women', label: 'عطور نسائي' },
  { value: 'oud', label: 'عود وبخور' },
  { value: 'skincare', label: 'عناية بالبشرة' },
  { value: 'makeup', label: 'مكياج' },
  { value: 'gifts', label: 'هدايا' },
];

export default function StoreHome({ slug }: { slug: string }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc'>('default');
  const [filterOpen, setFilterOpen] = useState(false);
  const [location] = useLocation();

  // Sync category from URL ?cat= param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get('cat') || '';
    setActiveCategory(cat);
  }, [location]);

  const { data: allProducts, isLoading } = useBrowseStoreProducts(slug, {
    query: {
      enabled: !!slug,
      queryKey: getBrowseStoreProductsQueryKey(slug),
    },
  });

  let products = allProducts?.filter((p) => {
    const matchCat = !activeCategory || p.category === activeCategory;
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  }) ?? [];

  if (sortBy === 'price_asc') {
    products = [...products].sort((a, b) => {
      const aMin = a.variants?.length ? Math.min(...a.variants.map((v) => v.price)) : 0;
      const bMin = b.variants?.length ? Math.min(...b.variants.map((v) => v.price)) : 0;
      return aMin - bMin;
    });
  } else if (sortBy === 'price_desc') {
    products = [...products].sort((a, b) => {
      const aMin = a.variants?.length ? Math.min(...a.variants.map((v) => v.price)) : 0;
      const bMin = b.variants?.length ? Math.min(...b.variants.map((v) => v.price)) : 0;
      return bMin - aMin;
    });
  }

  const totalCount = products.length;

  return (
    <div className="flex gap-10">
      {/* ── Sidebar filter (desktop) ────────── */}
      <aside className="hidden lg:flex flex-col w-52 shrink-0 gap-8 pt-1">
        {/* Categories */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-4 font-medium">التصنيف</p>
          <ul className="flex flex-col gap-1">
            {CATEGORIES.map(({ value, label }) => (
              <li key={value}>
                <button
                  onClick={() => setActiveCategory(value)}
                  className={`text-sm w-full text-right py-1.5 transition-colors ${
                    activeCategory === value
                      ? 'text-zinc-900 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-700'
                  }`}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* Sort */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-4 font-medium">الترتيب</p>
          <ul className="flex flex-col gap-1">
            {[
              { value: 'default', label: 'الافتراضي' },
              { value: 'price_asc', label: 'السعر: الأقل أولاً' },
              { value: 'price_desc', label: 'السعر: الأعلى أولاً' },
            ].map(({ value, label }) => (
              <li key={value}>
                <button
                  onClick={() => setSortBy(value as typeof sortBy)}
                  className={`text-sm w-full text-right py-1.5 transition-colors ${
                    sortBy === value
                      ? 'text-zinc-900 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-700'
                  }`}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── Main content ─────────────────────── */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-8 gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <input
              type="text"
              placeholder="بحث..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm bg-transparent border-b border-zinc-200 focus:border-zinc-900 outline-none py-2 pr-0 pl-6 placeholder:text-zinc-300 transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-xs text-zinc-400 tracking-wide">
              {isLoading ? '...' : `${totalCount} منتج`}
            </span>
            {/* Mobile filter button */}
            <button
              onClick={() => setFilterOpen(true)}
              className="lg:hidden flex items-center gap-2 text-xs tracking-widest uppercase border border-zinc-200 px-4 py-2 hover:bg-zinc-900 hover:text-white transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              تصفية
            </button>
          </div>
        </div>

        {/* Active category badge */}
        {activeCategory && (
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs tracking-widest uppercase text-zinc-500 border border-zinc-200 px-3 py-1.5 flex items-center gap-2">
              {getCategoryLabel(activeCategory)}
              <button onClick={() => setActiveCategory('')} className="text-zinc-400 hover:text-zinc-900">
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-zinc-100">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white">
                <div className="aspect-[3/4] bg-zinc-50 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-zinc-100 rounded w-3/4 animate-pulse" />
                  <div className="h-3 bg-zinc-100 rounded w-1/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="py-32 text-center">
            <p className="text-sm tracking-widest uppercase text-zinc-300">لا توجد منتجات</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-zinc-100">
            {products.map((product) => {
              const minPrice =
                product.variants?.length
                  ? Math.min(...product.variants.map((v) => v.price))
                  : 0;
              const hasMultipleVariants = (product.variants?.length ?? 0) > 1;

              return (
                <Link
                  key={product.id}
                  href={`/store/${slug}/product/${product.id}`}
                  data-testid={`card-product-${product.id}`}
                >
                  <div className="bg-white group cursor-pointer">
                    {/* Image */}
                    <div className="aspect-[3/4] overflow-hidden bg-zinc-50 relative">
                      {product.imageUrls?.[0] ? (
                        <img
                          src={product.imageUrls[0]}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-zinc-100">
                          <span className="text-5xl font-serif text-zinc-300 select-none">
                            {product.name.charAt(0)}
                          </span>
                          <span className="text-[9px] tracking-widest uppercase text-zinc-300">بدون صورة</span>
                        </div>
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                      {/* New badge */}
                      {product.createdAt && (Date.now() - new Date(product.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000 && (
                        <div className="absolute top-2 left-2 bg-white text-zinc-900 text-[9px] tracking-widest uppercase px-2 py-1 shadow-sm">
                          جديد
                        </div>
                      )}
                      {/* Low stock badge */}
                      {(() => {
                        const totalStock = product.variants?.reduce((s, v) => s + (v.stock ?? 0), 0) ?? 0;
                        return totalStock > 0 && totalStock <= 5 ? (
                          <div className="absolute top-2 right-2 bg-black text-white text-[9px] tracking-widest uppercase px-2 py-1">
                            متبقي {totalStock} فقط
                          </div>
                        ) : null;
                      })()}
                    </div>

                    {/* Info */}
                    <div className="p-4 pb-5">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400 mb-1">
                        {getCategoryLabel(product.category)}
                      </p>
                      <h3 className="text-sm font-medium text-zinc-900 leading-snug line-clamp-1 font-serif">
                        {product.name}
                      </h3>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-sm text-zinc-700">
                          {hasMultipleVariants ? 'من ' : ''}{formatPrice(minPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Mobile filter drawer ─────────────── */}
      {filterOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="flex-1 bg-black/40" onClick={() => setFilterOpen(false)} />
          <div className="w-72 bg-white h-full shadow-2xl flex flex-col p-8 gap-8 overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest font-medium text-zinc-500">التصفية</p>
              <button onClick={() => setFilterOpen(false)} className="text-zinc-400 hover:text-zinc-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-4">التصنيف</p>
              <ul className="flex flex-col gap-1">
                {CATEGORIES.map(({ value, label }) => (
                  <li key={value}>
                    <button
                      onClick={() => { setActiveCategory(value); setFilterOpen(false); }}
                      className={`text-sm w-full text-right py-2 border-b border-zinc-50 transition-colors ${
                        activeCategory === value ? 'text-zinc-900 font-semibold' : 'text-zinc-400'
                      }`}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-4">الترتيب</p>
              <ul className="flex flex-col gap-1">
                {[
                  { value: 'default', label: 'الافتراضي' },
                  { value: 'price_asc', label: 'السعر: الأقل أولاً' },
                  { value: 'price_desc', label: 'السعر: الأعلى أولاً' },
                ].map(({ value, label }) => (
                  <li key={value}>
                    <button
                      onClick={() => { setSortBy(value as typeof sortBy); setFilterOpen(false); }}
                      className={`text-sm w-full text-right py-2 border-b border-zinc-50 transition-colors ${
                        sortBy === value ? 'text-zinc-900 font-semibold' : 'text-zinc-400'
                      }`}
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
