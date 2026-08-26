import React from 'react';
import { Link } from 'wouter';
import { useComparison, MAX_COMPARISON } from '@/contexts/ComparisonContext';
import { FragrancePyramid } from '@/components/store/FragrancePyramid';
import { formatPrice, getApiUrl } from '@/lib/utils';
import { useStoreCategoriesCtx } from '@/contexts/StoreCategoriesContext';
import { useStoreProductAttributes } from '@/hooks/useAttributes';
import { X, Scale, Droplet, Leaf, RotateCcw } from 'lucide-react';
import type { Product } from '@workspace/api-client-react';

function isFragrance(category: string) {
  return ['perfume_men', 'perfume_women', 'oud'].includes(category);
}

function isCosmetic(category: string) {
  return ['skincare', 'makeup'].includes(category);
}

function CompareColumn({ product, slug, onRemove }: { product: Product; slug: string; onRemove: (id: number) => void }) {
  const { getCategoryLabel } = useStoreCategoriesCtx();
  const { data: storeAttrs } = useStoreProductAttributes(slug, product.id);
  const basePrice = product.variants?.length ? Math.min(...product.variants.map((v) => v.price)) : 0;
  const hasMultipleVariants = (product.variants?.length ?? 0) > 1;
  const fragrance = isFragrance(product.category);
  const cosmetic = isCosmetic(product.category);
  const hasDynamicAttrs = storeAttrs && storeAttrs.attributes.length > 0;

  return (
    <div className="bg-white dark:bg-zinc-900 flex flex-col" data-testid={`compare-col-${product.id}`}>
      {/* Image */}
      <div className="relative aspect-[3/4] bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800">
        <button
          onClick={() => onRemove(product.id)}
          aria-label={`إزالة ${product.name} من المقارنة`}
          className="absolute top-2 right-2 z-10 w-9 h-9 rounded-full bg-white/90 dark:bg-zinc-900/90 shadow-sm border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-400 hover:text-white hover:bg-zinc-900 dark:hover:bg-white dark:hover:text-zinc-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        {product.imageUrls?.[0] ? (
          <img src={getApiUrl(product.imageUrls[0])} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <span className="text-5xl font-serif text-zinc-300 dark:text-zinc-600 select-none">{product.name.charAt(0)}</span>
            <span className="text-[9px] tracking-widest uppercase text-zinc-300 dark:text-zinc-600">بدون صورة</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex-1 flex flex-col">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[hsl(var(--primary))] mb-1">
          {getCategoryLabel(product.category)}
        </p>
        <Link href={`/store/${slug}/product/${product.id}`} className="font-serif text-lg font-bold text-zinc-900 dark:text-white leading-snug hover:text-primary transition-colors">
          {product.name}
        </Link>
        <div className="mt-2 text-lg font-bold text-zinc-900 dark:text-white">
          {hasMultipleVariants ? 'من ' : ''}{formatPrice(basePrice)}
        </div>

        <div className="mt-5 border-t border-zinc-100 dark:border-zinc-800">
          {hasDynamicAttrs ? (
            <div className="space-y-4 py-5">
              {storeAttrs.attributes.map((attr) => {
                const isNote = ['note_top', 'note_heart', 'note_base'].includes(attr.key);
                const noteLabels: Record<string, string> = { note_top: 'المقدمة', note_heart: 'القلب', note_base: 'القاعدة' };
                return isNote ? null : (
                  <div key={attr.key} className="flex items-start gap-3">
                    <Droplet className="w-5 h-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white block mb-1">{attr.label}</span>
                      <span className="text-gray-600 dark:text-zinc-400 text-sm leading-relaxed">{attr.value}</span>
                    </div>
                  </div>
                );
              })}
              {(() => {
                const notes = storeAttrs.attributes.filter((a) => ['note_top', 'note_heart', 'note_base'].includes(a.key));
                if (notes.length === 0) return null;
                const noteTop = notes.find((a) => a.key === 'note_top')?.value ?? null;
                const noteHeart = notes.find((a) => a.key === 'note_heart')?.value ?? null;
                const noteBase = notes.find((a) => a.key === 'note_base')?.value ?? null;
                return <FragrancePyramid top={noteTop} heart={noteHeart} base={noteBase} />;
              })()}
            </div>
          ) : fragrance && (product.noteTop || product.noteHeart || product.noteBase) ? (
            <FragrancePyramid top={product.noteTop} heart={product.noteHeart} base={product.noteBase} />
          ) : cosmetic ? (
            <div className="space-y-4 py-5">
              <div className="flex items-start gap-3">
                <Droplet className="w-5 h-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-gray-900 dark:text-white block mb-1">نوع البشرة المناسب</span>
                  <span className="text-gray-600 dark:text-zinc-400 text-sm leading-relaxed">{product.skinType || '—'}</span>
                </div>
              </div>
              <div className="flex items-start gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <Leaf className="w-5 h-5 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-gray-900 dark:text-white block mb-1">المكونات الرئيسية</span>
                  <span className="text-gray-600 dark:text-zinc-400 text-sm leading-relaxed">{product.ingredients || '—'}</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="py-5 text-gray-500 dark:text-zinc-400 text-sm">لا توجد تفاصيل إضافية</p>
          )}
        </div>

        {product.description && (
          <p className="mt-4 text-sm text-gray-500 dark:text-zinc-400 leading-relaxed line-clamp-3">{product.description}</p>
        )}
      </div>
    </div>
  );
}

export default function StoreCompare({ slug }: { slug: string }) {
  const { items, removeFromCompare, clearCompare } = useComparison();

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <Link href={`/store/${slug}`} className="text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          ← العودة للمتجر
        </Link>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Scale className="w-6 h-6 text-[hsl(var(--primary))]" />
            <div>
              <h1 className="font-serif text-2xl font-bold text-zinc-900 dark:text-white">مقارنة المنتجات</h1>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                {items.length} من {MAX_COMPARISON} منتجات
              </p>
            </div>
          </div>
          {items.length > 0 && (
            <button
              onClick={clearCompare}
              className="flex items-center gap-2 text-xs tracking-widest uppercase border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-zinc-500 dark:text-zinc-400 hover:border-zinc-900 dark:hover:border-white hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              مسح الكل
            </button>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-32 text-center">
          <Scale className="w-12 h-12 mx-auto text-zinc-200 dark:text-zinc-700 mb-4" />
          <p className="text-sm tracking-widest uppercase text-zinc-300 dark:text-zinc-600 mb-6">لا توجد منتجات للمقارنة</p>
          <Link
            href={`/store/${slug}`}
            className="inline-block text-xs tracking-widest uppercase bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white px-6 py-3 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            تصفح المنتجات
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-100 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800">
          {items.map((product) => (
            <CompareColumn key={product.id} product={product} slug={slug} onRemove={removeFromCompare} />
          ))}
        </div>
      )}
    </div>
  );
}
