import Link from 'next/link';
import type { StorePublic } from '@/lib/api';
import { normalizeWhatsAppNumber } from '@/lib/utils';
import { Phone, MessageCircle, Instagram, ShoppingBag, Heart, PackageSearch } from 'lucide-react';

export function StoreShell({ children, store }: { children: React.ReactNode; store: StorePublic }) {
  const categories = [
    { label: 'كل المنتجات', cat: '' },
    { label: 'عطور رجالي', cat: 'perfume_men' },
    { label: 'عطور نسائي', cat: 'perfume_women' },
    { label: 'عود وبخور', cat: 'oud' },
    { label: 'عناية بالبشرة', cat: 'skincare' },
    { label: 'مكياج', cat: 'makeup' },
    { label: 'هدايا', cat: 'gifts' },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {store.phone && (
        <div className="bg-zinc-900 text-white text-xs tracking-widest text-center py-2.5 flex items-center justify-center gap-2">
          <Phone className="w-3 h-3" />
          <span>{store.phone}</span>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-screen-xl mx-auto px-3 h-16 flex items-center justify-center">
          <Link href={`/store/${store.slug}`} className="font-serif font-bold text-lg tracking-tight hover:opacity-70 transition-opacity">
            {store.storeName}
          </Link>
        </div>

        <nav className="hidden md:flex border-t border-border max-w-screen-xl mx-auto px-6 gap-8">
          {categories.map(({ label, cat }) => (
            <Link
              key={cat}
              href={`/store/${store.slug}${cat ? `?cat=${cat}` : ''}`}
              className="text-xs tracking-widest uppercase py-3 border-b-2 border-transparent hover:border-zinc-900 hover:text-zinc-900 dark:hover:border-white dark:hover:text-white text-zinc-500 dark:text-zinc-400 transition-all whitespace-nowrap"
            >
              {label}
            </Link>
          ))}
          <Link
            href={`/store/${store.slug}/track`}
            className="text-xs tracking-widest uppercase py-3 border-b-2 border-transparent hover:border-zinc-900 hover:text-zinc-900 dark:hover:border-white dark:hover:text-white text-zinc-500 dark:text-zinc-400 transition-all whitespace-nowrap"
          >
            تتبع طلبك
          </Link>
        </nav>
      </header>

      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 md:px-6 py-10">
        {children}
      </main>

      <footer className="border-t border-border mt-16">
        <div className="max-w-screen-xl mx-auto px-6 pt-12 pb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-sm text-zinc-400 dark:text-zinc-500">
          <div>
            <p className="font-serif font-bold text-zinc-900 dark:text-white text-base mb-1">{store.storeName}</p>
            {store.description && <p className="max-w-xs leading-relaxed">{store.description}</p>}
          </div>
          {store.phone && (
            <a href={`tel:${store.phone}`} className="flex items-center gap-2 hover:text-zinc-900 dark:hover:text-white transition-colors">
              <Phone className="w-4 h-4" />
              {store.phone}
            </a>
          )}
          {(store.instagramHandle || store.whatsappNumber) && (
            <div className="flex items-center gap-4">
              {store.instagramHandle && (
                <a
                  href={`https://instagram.com/${store.instagramHandle.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-zinc-900 dark:text-white hover:text-primary transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {store.whatsappNumber && (
                <a
                  href={`https://wa.me/${normalizeWhatsAppNumber(store.whatsappNumber)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 text-zinc-900 dark:text-white hover:text-primary transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
          <p className="text-xs">
            مشغل بواسطة <span className="font-bold text-zinc-900 dark:text-white font-serif">متجري</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
