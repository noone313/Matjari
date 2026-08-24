import React from 'react';
import { useBrowseStoreProducts, getBrowseStoreProductsQueryKey } from '@workspace/api-client-react';
import { useWishlist } from '@/contexts/WishlistContext';
import { formatPrice, getCategoryLabel, getApiUrl } from '@/lib/utils';
import { Link } from 'wouter';
import { Heart } from 'lucide-react';
import { ProductGridSkeleton } from '@/components/skeletons';

export default function StoreWishlist({ slug }: { slug: string }) {
  const { items, removeFromWishlist } = useWishlist();

  const { data: products, isLoading } = useBrowseStoreProducts(slug, undefined, {
    query: {
      enabled: !!slug,
      queryKey: getBrowseStoreProductsQueryKey(slug, undefined),
    },
  });

  const byId = React.useMemo(() => {
    const map = new Map<number, NonNullable<typeof products>[number]>();
    for (const p of products ?? []) map.set(p.id, p);
    return map;
  }, [products]);

  const wishlistProducts = items
    .map((id) => byId.get(id))
    .filter((p): p is NonNullable<typeof products>[number] => Boolean(p));

  if (isLoading) {
    return <ProductGridSkeleton count={6} />;
  }

  if (wishlistProducts.length === 0) {
    return (
      <div className="py-32 text-center">
        <Heart className="w-12 h-12 text-zinc-200 dark:text-zinc-700 mx-auto mb-4" />
        <p className="text-sm tracking-widest uppercase text-zinc-300 dark:text-zinc-600 mb-6">لا توجد منتجات في المفضلة بعد</p>
        <Link
          href={`/store/${slug}`}
          className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase px-6 py-3 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
        >
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif font-bold text-3xl text-gray-900 dark:text-white flex items-center gap-3">
          <Heart className="w-6 h-6 fill-[hsl(var(--primary))] text-[hsl(var(--primary))]" />
          المفضلة
          <span className="text-sm font-normal text-zinc-400 dark:text-zinc-500">({wishlistProducts.length})</span>
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white dark:bg-zinc-800">
        {wishlistProducts.map((product) => {
          const minPrice =
            product.variants?.length
              ? Math.min(...product.variants.map((v) => v.price))
              : 0;

          return (
            <div key={product.id} className="bg-white dark:bg-zinc-900 group">
              <Link href={`/store/${slug}/product/${product.id}`} data-testid={`card-product-${product.id}`}>
                <div className="aspect-[3/4] overflow-hidden bg-zinc-50 dark:bg-zinc-800 relative">
                  {product.imageUrls?.[0] ? (
                    <img
                      src={getApiUrl(product.imageUrls[0])}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800">
                      <span className="text-5xl font-serif text-zinc-300 dark:text-zinc-600 select-none">
                        {product.name.charAt(0)}
                      </span>
                      <span className="text-[9px] tracking-widest uppercase text-zinc-300 dark:text-zinc-600">بدون صورة</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300" />
                </div>
              </Link>

              <button
                type="button"
                onClick={() => removeFromWishlist(product.id)}
                aria-label="إزالة من المفضلة"
                className="absolute -mt-20 mr-3 z-10 flex items-center gap-1.5 text-[10px] tracking-widest uppercase px-3 py-1.5 shadow-sm transition-colors bg-white dark:bg-zinc-900 dark:text-white text-zinc-900 hover:bg-[hsl(var(--primary))] hover:text-white"
              >
                <Heart className="w-3 h-3 fill-current" />
                أزل
              </button>

              <div className="p-4 pb-5">
                <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500 mb-1">
                  {getCategoryLabel(product.category)}
                </p>
                <Link href={`/store/${slug}/product/${product.id}`}>
                  <h3 className="text-sm font-medium text-zinc-900 dark:text-white leading-snug line-clamp-1 font-serif hover:text-[hsl(var(--primary))] transition-colors">
                    {product.name}
                  </h3>
                </Link>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">{formatPrice(minPrice)}</span>
                  <Link
                    href={`/store/${slug}/product/${product.id}`}
                    className="text-[10px] font-bold tracking-widest uppercase text-[hsl(var(--primary))] hover:underline"
                  >
                    عرض
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
