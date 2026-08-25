import type { MetadataRoute } from 'next';
import { getAllStores, getStoreProducts } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://matjari.world';
  const entries: MetadataRoute.Sitemap = [];

  try {
    const stores = await getAllStores();
    for (const store of stores) {
      entries.push({
        url: `${siteUrl}/store/${store.slug}`,
        lastModified: new Date(store.createdAt),
        changeFrequency: 'daily',
        priority: 0.9,
      });

      try {
        const products = await getStoreProducts(store.slug);
        for (const product of products) {
          if (!product.isActive || !product.imageUrls?.length) continue;
          entries.push({
            url: `${siteUrl}/store/${store.slug}/product/${product.id}`,
            lastModified: new Date(product.createdAt),
            changeFrequency: 'weekly',
            priority: 0.8,
          });
        }
      } catch {}
    }
  } catch {}

  return entries;
}
