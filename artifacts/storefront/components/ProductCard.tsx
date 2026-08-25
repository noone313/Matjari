import Link from 'next/link';
import type { StoreProduct } from '@/lib/api';
import { formatPrice, getCategoryLabel, getApiUrl } from '@/lib/utils';

export function ProductCard({ product, slug }: { product: StoreProduct; slug: string }) {
  const minPrice = product.variants?.length
    ? Math.min(...product.variants.map((v) => v.price))
    : 0;

  const totalStock = product.variants?.reduce((s, v) => s + (v.stock ?? 0), 0) ?? 0;
  const isNew = product.createdAt && Date.now() - new Date(product.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;

  return (
    <Link href={`/store/${slug}/product/${product.id}`} className="group">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800">
        <div className="aspect-[3/4] overflow-hidden bg-zinc-50 dark:bg-zinc-800 relative">
          {product.imageUrls?.[0] ? (
            <img
              src={getApiUrl(product.imageUrls[0])}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700 ease-out"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-zinc-100 dark:bg-zinc-800">
              <span className="text-5xl font-serif text-zinc-300 dark:text-zinc-600 select-none">
                {product.name.charAt(0)}
              </span>
            </div>
          )}
          {isNew && (
            <div className="absolute top-2 left-2 bg-white dark:bg-zinc-900 text-zinc-900 text-[9px] tracking-widest uppercase px-2 py-1 shadow-sm">
              جديد
            </div>
          )}
          {totalStock > 0 && totalStock <= 5 && (
            <div className="absolute top-2 right-2 bg-black dark:bg-white dark:text-zinc-900 text-white text-[9px] tracking-widest uppercase px-2 py-1">
              متبقي {totalStock} فقط
            </div>
          )}
        </div>
        <div className="p-4 pb-5">
          <p className="text-[10px] uppercase tracking-[0.18em] text-zinc-400 dark:text-zinc-500 mb-1">
            {getCategoryLabel(product.category)}
          </p>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-white leading-snug line-clamp-1 font-serif">
            {product.name}
          </h3>
          <div className="mt-2">
            <span className="text-sm text-zinc-700 dark:text-zinc-300">
              {(product.variants?.length ?? 0) > 1 ? 'من ' : ''}
              {formatPrice(minPrice)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
