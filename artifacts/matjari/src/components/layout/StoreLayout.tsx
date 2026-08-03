import React from 'react';
import { Link } from 'wouter';
import { useGetStore, getGetStoreQueryKey } from '@workspace/api-client-react';
import { useCart } from '@/contexts/CartContext';
import { ShoppingBag, ChevronRight } from 'lucide-react';

export default function StoreLayout({ children, slug }: { children: React.ReactNode, slug: string }) {
  const { data: store, isLoading } = useGetStore(slug, { query: { enabled: !!slug, queryKey: getGetStoreQueryKey(slug) } });
  const { itemCount } = useCart();

  if (isLoading) {
    return <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">جاري التحميل...</div>;
  }

  if (!store) {
    return <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">المتجر غير موجود</div>;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-gray-900 font-sans flex flex-col" style={{ '--primary': store.accentColor || '43 74% 49%' } as React.CSSProperties}>
      {/* Banner */}
      {store.bannerUrl && (
        <div className="h-32 md:h-48 w-full bg-gray-200 overflow-hidden">
          <img src={store.bannerUrl} alt="Store Banner" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              {store.logoUrl ? (
                <img src={store.logoUrl} alt={store.storeName} className="w-12 h-12 rounded-full border border-gray-100 object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-xl font-bold font-serif text-gray-900">
                  {store.storeName.charAt(0)}
                </div>
              )}
              <div>
                <Link href={`/store/${slug}`} className="text-xl font-bold font-serif hover:opacity-80 transition-opacity">
                  {store.storeName}
                </Link>
                {store.description && (
                  <p className="text-sm text-gray-500 max-w-md truncate">{store.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href={`/store/${slug}/cart`} className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors">
                <ShoppingBag className="w-6 h-6" />
                {itemCount > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-[hsl(var(--primary))] text-white text-xs font-bold rounded-full flex items-center justify-center transform translate-x-1 -translate-y-1">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm text-gray-500">
          <p>{store.storeName} © {new Date().getFullYear()}</p>
          <p className="mt-2 text-xs flex items-center justify-center gap-1">
            مشغل بواسطة <span className="font-bold text-gray-900 font-serif">متجري</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
