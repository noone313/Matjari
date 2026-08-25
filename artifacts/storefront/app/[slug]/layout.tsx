import type { Metadata } from 'next';
import { getStore, type StorePublic } from '@/lib/api';
import { StoreShell } from '@/components/StoreShell';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const store = await getStore(slug);
    return {
      title: { default: store.storeName, template: `%s | ${store.storeName}` },
      description: store.description || `تسوق من ${store.storeName}`,
      openGraph: {
        title: store.storeName,
        description: store.description || `تسوق من ${store.storeName}`,
        siteName: store.storeName,
        type: 'website',
        locale: 'ar_IQ',
      },
    };
  } catch {
    return { title: 'المتجر غير موجود' };
  }
}

export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let store: StorePublic | null = null;
  try {
    store = await getStore(slug);
  } catch {}

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold font-serif text-foreground mb-4">المتجر غير موجود</h1>
          <p className="text-muted-foreground">تأكد من رابط المتجر وحاول مرة أخرى</p>
        </div>
      </div>
    );
  }

  return <StoreShell store={store}>{children}</StoreShell>;
}
