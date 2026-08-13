import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useGetStore, getGetStoreQueryKey } from '@workspace/api-client-react';
import { useCart } from '@/contexts/CartContext';
import { useComparison, MAX_COMPARISON } from '@/contexts/ComparisonContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { normalizeWhatsAppNumber } from '@/lib/utils';
import { ShoppingBag, Menu, X, Phone, MessageCircle, Instagram, Scale, Heart, PackageSearch } from 'lucide-react';
import HeroCarousel from '@/components/store/HeroCarousel';

export default function StoreLayout({ children, slug }: { children: React.ReactNode; slug: string }) {
  const { data: store, isLoading } = useGetStore(slug, {
    query: { enabled: !!slug, queryKey: getGetStoreQueryKey(slug) },
  });
  const { itemCount } = useCart();
  const { items: comparisonItems } = useComparison();
  const { count: wishlistCount } = useWishlist();
  const [menuOpen, setMenuOpen] = useState(false);
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center text-sm text-zinc-400 tracking-widest uppercase">
        store not found
      </div>
    );
  }

  const isHome = location === `/store/${slug}` || location === `/store/${slug}/`;

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-sans flex flex-col">
      {/* ── Announcement bar ─────────────────── */}
      {store.phone && (
        <div className="bg-zinc-900 text-white text-xs tracking-widest text-center py-2.5 flex items-center justify-center gap-2">
          <Phone className="w-3 h-3" />
          <span>{store.phone}</span>
        </div>
      )}

      {/* ── Navbar ───────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-zinc-100">
        <div className="max-w-screen-xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Left: hamburger (mobile) */}
          <button
            onClick={() => setMenuOpen(true)}
            className="md:hidden p-1 text-zinc-500 hover:text-zinc-900 transition-colors"
            aria-label="القائمة"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Center: store name */}
          <Link
            href={`/store/${slug}`}
            className="absolute right-1/2 translate-x-1/2 font-serif font-bold text-xl tracking-tight hover:opacity-70 transition-opacity whitespace-nowrap"
          >
            {store.storeName}
          </Link>

          {/* Right: actions */}
          <div className="flex items-center gap-4 mr-auto">
            <Link
              href={`/store/${slug}/track`}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              <PackageSearch className="w-4 h-4" />
              تتبع طلبك
            </Link>
            <Link
              href={`/store/${slug}/track`}
              className="sm:hidden relative p-1 text-zinc-600 hover:text-zinc-900 transition-colors"
              aria-label="تتبع طلبك"
            >
              <PackageSearch className="w-5 h-5" />
            </Link>
            <Link
              href={`/store/${slug}/wishlist`}
              className="relative p-1 text-zinc-600 hover:text-zinc-900 transition-colors"
              aria-label="المفضلة"
            >
              <Heart className="w-5 h-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -left-1 w-4 h-4 bg-zinc-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <Link
              href={`/store/${slug}/cart`}
              className="relative p-1 text-zinc-600 hover:text-zinc-900 transition-colors"
              aria-label="السلة"
            >
              <ShoppingBag className="w-5 h-5" />
              {itemCount > 0 && (
                <span className="absolute -top-1 -left-1 w-4 h-4 bg-zinc-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Desktop nav pills */}
        <nav className="hidden md:flex border-t border-zinc-100 max-w-screen-xl mx-auto px-6 gap-8 py-0">
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
              className="text-xs tracking-widest uppercase py-3 border-b-2 border-transparent hover:border-zinc-900 hover:text-zinc-900 text-zinc-500 transition-all whitespace-nowrap"
            >
              {label}
            </Link>
          ))}
          <Link
            href={`/store/${slug}/track`}
            className="text-xs tracking-widest uppercase py-3 border-b-2 border-transparent hover:border-zinc-900 hover:text-zinc-900 text-zinc-500 transition-all whitespace-nowrap"
          >
            تتبع طلبك
          </Link>
        </nav>
      </header>

      {/* ── Mobile drawer ────────────────────── */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="flex-1 bg-black/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="w-72 bg-white h-full shadow-2xl flex flex-col p-8 gap-6 overflow-y-auto">
            <button
              onClick={() => setMenuOpen(false)}
              className="self-start p-1 text-zinc-400 hover:text-zinc-900"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="font-serif font-bold text-2xl">{store.storeName}</div>
            {store.description && (
              <p className="text-sm text-zinc-500 leading-relaxed">{store.description}</p>
            )}
            <nav className="flex flex-col gap-4 mt-4">
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
                  onClick={() => setMenuOpen(false)}
                  className="text-sm tracking-widest uppercase text-zinc-700 hover:text-zinc-900 transition-colors py-1 border-b border-zinc-100"
                >
                  {label}
                </Link>
              ))}
              <Link
                href={`/store/${slug}/track`}
                onClick={() => setMenuOpen(false)}
                className="text-sm tracking-widest uppercase text-zinc-700 hover:text-zinc-900 transition-colors py-1 border-b border-zinc-100"
              >
                تتبع طلبك
              </Link>
            </nav>
          </div>
        </div>
      )}

      {/* ── Hero (only on home) ───────────────── */}
      {isHome && store.heroEnabled && store.heroSlides?.length ? (
        <HeroCarousel slides={store.heroSlides} storeName={store.storeName} description={store.description} />
      ) : isHome && store.bannerUrl ? (
        <div className="relative h-[55vh] min-h-[320px] w-full overflow-hidden bg-zinc-100">
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
      <footer className="border-t border-zinc-100 mt-16">
        <div className="max-w-screen-xl mx-auto px-6 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-sm text-zinc-400">
          <div>
            <p className="font-serif font-bold text-zinc-900 text-base mb-1">{store.storeName}</p>
            {store.description && (
              <p className="max-w-xs leading-relaxed">{store.description}</p>
            )}
          </div>
          {store.phone && (
            <a href={`tel:${store.phone}`} className="flex items-center gap-2 hover:text-zinc-900 transition-colors">
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
                  className="flex items-center gap-2 text-zinc-900 hover:text-primary transition-colors"
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
                  className="flex items-center gap-2 text-zinc-900 hover:text-primary transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
          <p className="text-xs">
            مشغل بواسطة{' '}
            <span className="font-bold text-zinc-900 font-serif">متجري</span>
          </p>
        </div>
      </footer>

      {/* ── Comparison floating indicator ────── */}
      {comparisonItems.length > 0 && (
        <Link
          href={`/store/${slug}/compare`}
          aria-label="عرض المقارنة"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-zinc-900 text-white pl-3 pr-5 py-3 shadow-2xl hover:bg-zinc-800 transition-colors"
        >
          <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-[hsl(var(--primary))] text-white">
            <Scale className="w-4 h-4" />
            <span className="absolute -top-1.5 -left-1.5 min-w-5 h-5 px-1 rounded-full bg-white text-zinc-900 text-[10px] font-bold flex items-center justify-center">
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
            className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-[#25D366] text-white shadow-xl flex items-center justify-center hover:bg-[#20bc5a] transition-colors group"
          >
            <MessageCircle className="w-7 h-7 fill-white stroke-none" />
            <span className="absolute right-full ml-3 mr-3 whitespace-nowrap bg-zinc-900 text-white text-xs rounded px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              تواصل عبر واتساب
            </span>
          </a>
        );
      })()}
    </div>
  );
}
