import type { Metadata } from 'next';
import './globals.css';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://matjari.world';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'متجري — متجر عطور ومستحضرات تجميل', template: '%s | متجري' },
  description: 'تسوق أحدث العطور ومستحضرات العناية بالبشرة والمكياج من أفضل الماركات العراقية',
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    locale: 'ar_IQ',
    siteName: 'متجري',
    images: [{ url: '/og.svg', width: 1200, height: 630, alt: 'متجري' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        {children}
      </body>
    </html>
  );
}
