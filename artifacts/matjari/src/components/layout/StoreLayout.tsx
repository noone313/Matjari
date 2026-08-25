import React from 'react';
import { Link, useLocation } from 'wouter';
import { useGetStore, getGetStoreQueryKey } from '@workspace/api-client-react';
import { useCart } from '@/contexts/CartContext';
import { useComparison, MAX_COMPARISON } from '@/contexts/ComparisonContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { normalizeWhatsAppNumber } from '@/lib/utils';
import { ShoppingBag, Phone, MessageCircle, Instagram, Scale, Heart, PackageSearch } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import HeroCarousel from '@/components/store/HeroCarousel';
import BottomNav from '@/components/layout/BottomNav';
import { StoreShellSkeleton } from '@/components/skeletons';

export default function StoreLayout({ children, slug }: { children: React.ReactNode; slug: string }) {
  const { data: store, isLoading } = useGetStore(slug, {
    query: { enabled: !!slug, queryKey: getGetStoreQueryKey(slug) },
  });
  const { itemCount } = useCart();
  const { items: comparisonItems } = useComparison();
  const { count: wishlistCount } = useWishlist();
  const [location] = useLocation();

  if (isLoading) {
    return <StoreShellSkeleton />;
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground tracking-widest uppercase">
        store not found
      </div>
    );
  }

  const isHome = location === `/store/${slug}` || location === `/store/${slug}/`;
  const isCheckout = location.includes('/checkout');

  return (
    <div className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* ── Announcement bar ─────────────────── */}
      {store.phone && (
        <div className="bg-zinc-900 dark:bg-zinc-800 text-white text-xs tracking-widest text-center py-2.5 flex items-center justify-center gap-2">
          <Phone className="w-3 h-3" />
          <span>{store.phone}</span>
        </div>
      )}

      {/* ── Navbar ───────────────────────────── */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-screen-xl mx-auto px-3 h-16 flex items-center">
          {/* Left: ThemeToggle on mobile */}
          <div className="w-16 flex-shrink-0 flex items-center justify-center md:hidden">
            <ThemeToggle />
          </div>

          {/* Center: store name */}
          <Link
            href={`/store/${slug}`}
            className="flex-1 min-w-0 text-center px-4 font-serif font-bold text-lg tracking-tight hover:opacity-70 transition-opacity"
          >
            {store.storeName}
          </Link>

          {/* Right: actions */}
          <div className="w-16 md:w-auto flex-shrink-0 flex items-center justify-center md:justify-end gap-2 px-2 md:px-0">
            <span className="hidden md:inline-flex"><ThemeToggle /></span>
            <Link
              href={`/store/${slug}/track`}
              className="hidden md:inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors whitespace-nowrap"
            >
              <PackageSearch className="w-4 h-4" />
              تتبع طلبك
            </Link>
            <Link
              href={`/store/${slug}/track`}
              className="md:hidden p-0.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
              aria-label="تتبع طلبك"
            >
              <PackageSearch className="w-4 h-4" />
            </Link>
            <Link
              href={`/store/${slug}/wishlist`}
              className="relative p-0.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
              aria-label="المفضلة"
            >
              <Heart className="w-4 h-4" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <Link
              href={`/store/${slug}/cart`}
              className="relative p-0.5 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
              aria-label="السلة"
            >
              <ShoppingBag className="w-4 h-4" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -left-1 w-3.5 h-3.5 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Desktop nav pills */}
        <nav className="hidden md:flex border-t border-border max-w-screen-xl mx-auto px-6 gap-8 py-0">
          {[
            { label: 'كل المنتجات', cat: '' },
            { label: 'عطور رجالي', cat: 'perfume_men' },
            { label: 'عطور نسائي', cat: 'perfume_women' },
            { label: 'عود وبخور', cat: 'oud' },
            { label: 'عناية بالبشرة', cat: 'skincare' },
            { label: 'مكياج', cat: 'makeup' },
            { label: 'هدايا', cat: 'gifts' },
          ].map(({ label, cat }) => (
            <Link
              key={cat}
              href={`/store/${slug}${cat ? `?cat=${cat}` : ''}`}
              className="text-xs tracking-widest uppercase py-3 border-b-2 border-transparent hover:border-zinc-900 hover:text-zinc-900 dark:hover:border-white dark:hover:text-white text-zinc-500 dark:text-zinc-400 transition-all whitespace-nowrap"
            >
              {label}
            </Link>
          ))}
          <Link
            href={`/store/${slug}/track`}
            className="text-xs tracking-widest uppercase py-3 border-b-2 border-transparent hover:border-zinc-900 hover:text-zinc-900 dark:hover:border-white dark:hover:text-white text-zinc-500 dark:text-zinc-400 transition-all whitespace-nowrap"
          >
            تتبع طلبك
          </Link>
        </nav>
      </header>

      {/* ── Hero (only on home) ───────────────── */}
      {isHome && store.heroEnabled && store.heroSlides?.length ? (
        <HeroCarousel slides={store.heroSlides} storeName={store.storeName} />
      ) : isHome && store.bannerUrl ? (
        <div className="relative h-[55vh] min-h-[320px] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          <img
            src={store.bannerUrl}
            alt={store.storeName}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent flex flex-col items-center justify-end pb-12 text-white text-center px-4">
            <h1 className="font-serif text-4xl md:text-6xl font-bold tracking-tight mb-3">
              {store.storeName}
            </h1>
            {store.description && (
              <p className="text-white/80 text-base max-w-md leading-relaxed">{store.description}</p>
            )}
          </div>
        </div>
      ) : null}

      {/* ── Page content ─────────────────────── */}
      <main className="flex-1 max-w-screen-xl mx-auto w-full px-4 md:px-6 py-10">
        {children}
      </main>

      {/* ── Footer ───────────────────────────── */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-screen-xl mx-auto px-6 pt-12 pb-28 md:pb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-sm text-zinc-400 dark:text-zinc-500">
          <div>
            <p className="font-serif font-bold text-zinc-900 dark:text-white text-base mb-1">{store.storeName}</p>
            {store.description && (
              <p className="max-w-xs leading-relaxed">{store.description}</p>
            )}
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
                  aria-label="انستقرام"
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
                  aria-label="واتساب"
                  className="flex items-center gap-2 text-zinc-900 dark:text-white hover:text-primary transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
          <p className="text-xs">
            مشغل بواسطة{' '}
            <span className="font-bold text-zinc-900 dark:text-white font-serif">متجري</span>
          </p>
        </div>
      </footer>

      {/* ── Comparison floating indicator ────── */}
      {comparisonItems.length > 0 && (
        <Link
          href={`/store/${slug}/compare`}
          aria-label="عرض المقارنة"
          className="fixed bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white pl-3 pr-5 py-3 shadow-2xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
        >
          <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--primary))] text-white">
            <Scale className="w-4 h-4" />
            <span className="absolute -top-1.5 -left-1.5 min-w-5 h-5 px-1 rounded-full bg-white dark:bg-zinc-900 dark:text-white text-zinc-900 text-[10px] font-bold flex items-center justify-center">
              {comparisonItems.length}
            </span>
          </span>
          <span className="text-xs tracking-widest uppercase">
            مقارنة ({comparisonItems.length}/{MAX_COMPARISON}) — عرض
          </span>
        </Link>
      )}

      {/* ── WhatsApp floating button ─────────── */}
      {store.phone && (() => {
        const waPhone = store.phone.replace(/^0/, '964').replace(/\D/g, '');
        return (
          <a
            href={`https://wa.me/${waPhone}?text=${encodeURIComponent('مرحباً، أريد الاستفسار عن منتجاتكم')}`}
            target="_blank"
            rel="noreferrer"
            aria-label="تواصل عبر واتساب"
            className="fixed bottom-24 md:bottom-6 left-4 md:left-6 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl flex items-center justify-center hover:bg-[#20bc5a] transition-colors group"
          >
            <MessageCircle className="w-7 h-7 fill-white stroke-none" />
            <span className="absolute right-full ml-3 mr-3 whitespace-nowrap bg-zinc-900 dark:bg-zinc-700 text-white text-xs rounded px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              تواصل عبر واتساب
            </span>
          </a>
        );
      })()}
      {/* ── Mobile bottom navigation ─────────── */}
      {!isCheckout && (
        <BottomNav
          slug={slug}
          itemCount={itemCount}
          wishlistCount={wishlistCount}
          onOpenCategories={() => {}}
        />
      )}
    </div>
  );
}
