import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getStore,
  getStoreProduct,
  getRelatedProducts,
  getProductReviews,
  type StorePublic,
  type StoreProduct,
  type Review,
} from '@/lib/api';
import { formatPrice, getCategoryLabel, getApiUrl } from '@/lib/utils';
import { productJsonLd, breadcrumbJsonLd } from '@/lib/schema';
import { JsonLd } from '@/components/JsonLd';
import Link from 'next/link';
import { ChevronRight, Star } from 'lucide-react';

export const revalidate = 60;

type PageProps = { params: Promise<{ slug: string; id: string }> };

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const productId = Number(id);
  if (isNaN(productId)) return { title: 'منتج غير موجود' };

  try {
    const [store, product] = await Promise.all([
      getStore(slug),
      getStoreProduct(slug, productId),
    ]);

    const minPrice = product.variants?.length ? Math.min(...product.variants.map(v => v.price)) : 0;
    const description = product.description?.slice(0, 160) || `${product.name} — ${getCategoryLabel(product.category)} من ${store.storeName}`;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
    const imageUrl = product.imageUrls?.[0]
      ? product.imageUrls[0].startsWith('http')
        ? product.imageUrls[0]
        : `${siteUrl}${product.imageUrls[0]}`
      : undefined;

    return {
      title: product.name,
      description,
      openGraph: {
        title: product.name,
        description,
        type: 'website',
        locale: 'ar_IQ',
        siteName: store.storeName,
        url: `${siteUrl}/store/${slug}/product/${id}`,
        images: imageUrl ? [{ url: imageUrl, width: 800, height: 800, alt: product.name }] : undefined,
      },
      twitter: {
        card: 'summary_large_image',
        title: product.name,
        description,
        images: imageUrl ? [imageUrl] : undefined,
      },
      alternates: { canonical: `/store/${slug}/product/${id}` },
    };
  } catch {
    return { title: 'منتج غير موجود' };
  }
}

export default async function ProductPage({ params }: PageProps) {
  const { slug, id } = await params;
  const productId = Number(id);
  if (isNaN(productId)) notFound();

  let store: StorePublic, product: StoreProduct;
  try {
    [store, product] = await Promise.all([getStore(slug), getStoreProduct(slug, productId)]);
  } catch {
    notFound();
  }

  const [related, reviewsData] = await Promise.all([
    getRelatedProducts(slug, productId).catch(() => []),
    getProductReviews(slug, productId).catch(() => ({ reviews: [] as Review[], averageRating: 0 })),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';
  const canonicalUrl = `${siteUrl}/store/${slug}/product/${id}`;
  const minPrice = product.variants?.length ? Math.min(...product.variants.map(v => v.price)) : 0;
  const mainImage = product.imageUrls?.[0];
  const mainImageUrl = mainImage
    ? mainImage.startsWith('http') ? mainImage : `${siteUrl}${mainImage}`
    : undefined;

  return (
    <>
      <JsonLd data={productJsonLd(product, store, canonicalUrl, reviewsData.reviews, reviewsData.averageRating)} />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: store.storeName, url: `${siteUrl}/store/${slug}` },
          { name: getCategoryLabel(product.category), url: `${siteUrl}/store/${slug}?cat=${product.category}` },
          { name: product.name, url: canonicalUrl },
        ])}
      />

      <article className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-zinc-800">
          <Link href={`/store/${slug}`} className="inline-flex items-center text-sm text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white transition-colors">
            <ChevronRight className="w-4 h-4 ml-1" /> العودة للمتجر
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="p-6 md:border-l border-gray-100 dark:border-zinc-800 flex flex-col items-center">
            <div className="aspect-square w-full max-w-md bg-gray-50 dark:bg-zinc-800 rounded-lg overflow-hidden border border-gray-100 dark:border-zinc-700">
              {mainImage ? (
                <img src={getApiUrl(mainImage)} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-zinc-600">بدون صورة</div>
              )}
            </div>
            {product.imageUrls && product.imageUrls.length > 1 && (
              <div className="flex gap-2 overflow-x-auto w-full max-w-md justify-center mt-4">
                {product.imageUrls.map((img, i) => (
                  <img key={i} src={getApiUrl(img)} alt="" className="w-20 h-20 rounded-md object-cover border border-gray-200 dark:border-zinc-700" loading="lazy" />
                ))}
              </div>
            )}
          </div>

          <div className="p-8 lg:p-12 flex flex-col justify-center">
            <span className="text-sm text-[hsl(var(--primary))] font-medium tracking-wide mb-2">
              {getCategoryLabel(product.category)}
            </span>

            {reviewsData.averageRating > 0 && (
              <div className="flex items-center gap-1.5 mb-4">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(reviewsData.averageRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-zinc-600'}`} />
                  ))}
                </div>
                <span className="text-xs text-gray-500 dark:text-zinc-400">{reviewsData.averageRating} ({reviewsData.reviews.length})</span>
              </div>
            )}

            <h1 className="text-4xl font-bold font-serif text-gray-900 dark:text-white mb-4 leading-tight">{product.name}</h1>

            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
              {formatPrice(minPrice)}
            </div>

            {product.description && (
              <p className="text-gray-600 dark:text-zinc-400 leading-relaxed mb-8">{product.description}</p>
            )}

            {(product.noteTop || product.noteHeart || product.noteBase) && (
              <div className="mb-8 space-y-3">
                {product.noteTop && (
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-zinc-400 mt-1">العمود</span>
                    <span className="text-sm text-gray-700 dark:text-zinc-300">{product.noteTop}</span>
                  </div>
                )}
                {product.noteHeart && (
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-zinc-400 mt-1">القلب</span>
                    <span className="text-sm text-gray-700 dark:text-zinc-300">{product.noteHeart}</span>
                  </div>
                )}
                {product.noteBase && (
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-bold text-zinc-400 mt-1">القاعدة</span>
                    <span className="text-sm text-gray-700 dark:text-zinc-300">{product.noteBase}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {reviewsData.reviews.length > 0 && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 px-6 py-10">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">تقييمات العملاء</h2>
            <div className="space-y-4">
              {reviewsData.reviews.map(r => (
                <div key={r.id} className="border border-gray-100 dark:border-zinc-800 rounded-lg p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-gray-500 dark:text-zinc-400">
                      {r.customerName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{r.customerName}</p>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map(i => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i <= r.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-zinc-600'}`} />
                        ))}
                      </div>
                    </div>
                  </div>
                  {r.comment && <p className="text-gray-600 dark:text-zinc-400 leading-relaxed">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-10 px-6 pb-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 text-center mb-6">منتجات مشابهة</p>
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none">
              {related.map(p => {
                const minP = p.variants?.length ? Math.min(...p.variants.map(v => v.price)) : 0;
                return (
                  <Link key={p.id} href={`/store/${slug}/product/${p.id}`} className="shrink-0 w-40 sm:w-44">
                    <div className="bg-white dark:bg-zinc-900 group border border-zinc-100 dark:border-zinc-800">
                      <div className="aspect-[3/4] overflow-hidden bg-zinc-50 dark:bg-zinc-800">
                        {p.imageUrls?.[0] ? (
                          <img src={getApiUrl(p.imageUrls[0])} alt={p.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl font-serif text-zinc-200 dark:text-zinc-700">
                            {p.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-serif text-zinc-900 dark:text-white line-clamp-1">{p.name}</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">{formatPrice(minP)}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </article>
    </>
  );
}
