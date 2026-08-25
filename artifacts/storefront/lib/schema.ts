import type { StorePublic, StoreProduct, Review } from './api';

export function productJsonLd(product: StoreProduct, store: StorePublic, url: string, reviews?: Review[], avgRating?: number) {
  const offer = product.variants[0];
  const images = product.imageUrls
    ?.filter(Boolean)
    .map((u) => (u.startsWith('http') ? u : `${process.env.NEXT_PUBLIC_SITE_URL || ''}${u}`));

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || undefined,
    image: images,
    brand: { '@type': 'Brand', name: store.storeName },
    category: product.category,
    url,
    offers: offer
      ? {
          '@type': 'Offer',
          priceCurrency: 'IQD',
          price: offer.price,
          availability: (offer.stock ?? 0) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
          url,
        }
      : undefined,
  };

  if (reviews && reviews.length > 0 && avgRating && avgRating > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: avgRating,
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    };
    jsonLd.review = reviews.map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.customerName },
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 },
      reviewBody: r.comment || undefined,
      datePublished: r.createdAt?.slice(0, 10),
    }));
  }

  return jsonLd;
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function organizationJsonLd(store: StorePublic) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: store.storeName,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/store/${store.slug}`,
    logo: store.logoUrl || undefined,
    description: store.description || undefined,
    contactPoint: store.phone
      ? { '@type': 'ContactPoint', telephone: store.phone, contactType: 'customer service' }
      : undefined,
  };
}

export function storeJsonLd(store: StorePublic) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: store.storeName,
    description: store.description || undefined,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/store/${store.slug}`,
    image: store.bannerUrl || store.logoUrl || undefined,
    telephone: store.phone || undefined,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'IQ',
    },
  };
}
