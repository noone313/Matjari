import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://matjari.world';
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/api/', '/dashboard', '/login', '/register'] },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
