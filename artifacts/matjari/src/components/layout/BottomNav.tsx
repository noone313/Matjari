import { Link, useLocation } from 'wouter';
import { Home, LayoutGrid, Heart, ShoppingBag, PackageSearch } from 'lucide-react';

interface BottomNavProps {
  slug: string;
  itemCount: number;
  wishlistCount: number;
  onOpenCategories: () => void;
}

// شريط تنقل سفلي للموبايل فقط — يختفي على الشاشات المتوسطة فأعلى
export default function BottomNav({ slug, itemCount, wishlistCount, onOpenCategories }: BottomNavProps) {
  const [location] = useLocation();
  const base = `/store/${slug}`;

  const isActive = (href: string) =>
    href === base ? location === base || location === `${base}/` : location.startsWith(href);

  interface NavItem {
    key: string;
    label: string;
    icon: typeof Home;
    href?: string;
    action?: () => void;
    badge?: number;
  }

  const items: NavItem[] = [
    { key: 'home', label: 'الرئيسية', icon: Home, href: base },
    { key: 'cats', label: 'الأقسام', icon: LayoutGrid, action: onOpenCategories },
    { key: 'wishlist', label: 'المفضلة', icon: Heart, href: `${base}/wishlist`, badge: wishlistCount },
    { key: 'cart', label: 'السلة', icon: ShoppingBag, href: `${base}/cart`, badge: itemCount },
    { key: 'track', label: 'طلبي', icon: PackageSearch, href: `${base}/track` },
  ];

  return (
    <nav
      aria-label="تنقل سريع"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200 dark:border-zinc-700"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-5">
        {items.map(({ key, label, icon: Icon, href, action, badge }) => {
          const active = href ? isActive(href) : false;
          const cls = `relative flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
            active ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200'
          }`;

          const content = (
            <>
              <span className="relative">
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.4]' : ''}`} />
                {!!badge && badge > 0 && (
                  <span className="absolute -top-1.5 -left-2 min-w-[15px] h-[15px] px-1 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </span>
              <span className="text-[10px] leading-none tracking-wide">{label}</span>
              {active && <span className="absolute top-0 inset-x-5 h-0.5 bg-zinc-900 dark:bg-white rounded-full" />}
            </>
          );

          return href ? (
            <Link key={key} href={href} className={cls} aria-current={active ? 'page' : undefined}>
              {content}
            </Link>
          ) : (
            <button key={key} onClick={action} className={cls}>
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
