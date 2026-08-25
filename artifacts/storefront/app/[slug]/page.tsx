import type { Metadata } from 'next';
import { getStore, getStoreProducts, getStoreBundles, type StorePublic, type StoreProduct, type Bundle } from '@/lib/api';
import { ProductCard } from '@/components/ProductCard';
import { JsonLd } from '@/components/JsonLd';
import { storeJsonLd, organizationJsonLd } from '@/lib/schema';
import { formatPrice } from '@/lib/utils';
import { Gift, Store } from 'lucide-react';

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const store = await getStore(slug);
    const products = await getStoreProducts(slug);
    const productCount = products.filter(p => p.imageUrls?.length).length;

    return {
      title: store.storeName,
      description: store.description || `${store.storeName} — ${productCount} منتج متاح للتسوق`,
      openGraph: {
        title: store.storeName,
        description: store.description || `${store.storeName} — تسوق أحدث العطور والمستحضرات`,
        siteName: store.storeName,
        type: 'website',
        locale: 'ar_IQ',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/store/${slug}`,
        images: store.bannerUrl ? [{ url: store.bannerUrl, width: 1200, height: 630 }] : undefined,
      },
      alternates: { canonical: `/store/${slug}` },
    };
  } catch {
    return { title: 'المتجر غير موجود' };
  }
}

export default async function StoreHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  const allProducts = await getStoreProducts(slug);
  const bundlesData = await getStoreBundles(slug);

  const products = allProducts.filter(p => p.imageUrls?.some(u => u?.trim()));
  const bundles = bundlesData?.bundles ?? [];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || '';

  return (
    <>
      <JsonLd data={storeJsonLd(store)} />
      <JsonLd data={organizationJsonLd(store)} />

      {bundles.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-5">
            <Gift className="w-5 h-5 text-[hsl(var(--primary))]" />
            <h2 className="text-2xl font-bold font-serif text-gray-900 dark:text-white">باقات هدايا جاهزة</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {bundles.map((bundle) => (
              <div key={bundle.id} className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg overflow-hidden shadow-sm flex flex-col">
                <div className="aspect-[4/3] overflow-hidden bg-zinc-50 dark:bg-zinc-800 relative">
                  {bundle.imageUrl ? (
                    <img src={bundle.imageUrl} alt={bundle.name} loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gift className="w-10 h-10 text-zinc-200 dark:text-zinc-700" />
                    </div>
                  )}
                  <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-full bg-[hsl(var(--primary))] text-white flex items-center gap-1">
                    <Gift className="w-3 h-3" /> باقة
                  </span>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="font-bold text-gray-900 dark:text-white font-serif line-clamp-1">{bundle.name}</h3>
                  {bundle.description && (
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1 line-clamp-2">{bundle.description}</p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-2">
                    {bundle.items.map(it => `${it.productName} (${it.variantLabel})`).join('، ')}
                  </p>
                  <div className="mt-auto pt-3">
                    <span className="font-bold text-[hsl(var(--primary))]">{formatPrice(bundle.bundlePrice)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {products.length === 0 ? (
        <div className="py-32 text-center max-w-md mx-auto">
          <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-6">
            <Store className="w-10 h-10 text-gray-300 dark:text-zinc-600" />
          </div>
          <h3 className="text-lg font-bold font-serif text-gray-900 dark:text-white mb-2">هذا المتجر قيد الإعداد</h3>
          <p className="text-gray-500 dark:text-zinc-400 text-sm leading-relaxed">لا توجد منتجات متاحة حالياً</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white dark:bg-zinc-800">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} slug={slug} />
          ))}
        </div>
      )}
    </>
  );
}
