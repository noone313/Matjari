import React, { useState } from 'react';
import { useBrowseStoreProducts } from '@workspace/api-client-react';
import { CATEGORIES, formatPrice, getCategoryLabel } from '@/lib/utils';
import { Link } from 'wouter';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function StoreHome({ slug }: { slug: string }) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');

  const { data: allProducts, isLoading } = useBrowseStoreProducts(slug, {
    query: { enabled: !!slug, queryKey: ['browse-store-products', slug] as const }
  });

  const products = allProducts?.filter(p => {
    const matchCat = !activeCategory || p.category === activeCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.description ?? '').toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-8">
      {/* Filters */}
      <div className="flex flex-col gap-6">
        <div className="relative max-w-xl mx-auto w-full">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input 
            placeholder="البحث في المتجر..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 pr-12 rounded-full border-gray-300 shadow-sm text-lg"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide justify-center flex-wrap">
          <button
            onClick={() => setActiveCategory('')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeCategory === '' 
                ? 'bg-[hsl(var(--primary))] text-white' 
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            الكل
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeCategory === cat.value 
                  ? 'bg-[hsl(var(--primary))] text-white' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-lg aspect-[3/4] animate-pulse"></div>
          ))}
        </div>
      ) : products?.length === 0 ? (
        <div className="text-center py-24 text-gray-500">
          <p className="text-xl">لا توجد منتجات تطابق بحثك</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {products?.map(product => {
            const minPrice = product.variants && product.variants.length > 0 
              ? Math.min(...product.variants.map(v => v.price)) 
              : 0;

            return (
              <Link key={product.id} href={`/store/${slug}/product/${product.id}`}>
                <div className="bg-white group cursor-pointer border border-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square bg-gray-50 relative overflow-hidden">
                    {product.imageUrls?.[0] ? (
                      <img 
                        src={product.imageUrls[0]} 
                        alt={product.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        بدون صورة
                      </div>
                    )}
                  </div>
                  <div className="p-4 text-center">
                    <p className="text-xs text-gray-500 mb-1">{getCategoryLabel(product.category)}</p>
                    <h3 className="font-bold text-gray-900 font-serif line-clamp-1 group-hover:text-[hsl(var(--primary))] transition-colors">{product.name}</h3>
                    <p className="mt-2 text-sm font-medium text-gray-900">{formatPrice(minPrice)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
