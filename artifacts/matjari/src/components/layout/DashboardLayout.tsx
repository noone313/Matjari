import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useGetMe, useGetDashboardStats, getGetDashboardStatsQueryKey, getGetVapidPublicKeyQueryOptions, useSubscribeToPush } from '@workspace/api-client-react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { LayoutDashboard, Package, ShoppingBag, Tags, Star as StarIcon, Settings, LogOut, Store, ExternalLink, Copy, Check, Gift, Menu, X, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';

/** Play a short two-tone chime using the Web Audio API. Fails silently if unavailable. */
function playNewOrderSound() {
  try {
    const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const frequencies = [880, 1100];
    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      osc.start(start);
      osc.stop(start + 0.25);
    });
  } catch {
    // Audio unavailable — skip silently
  }
}

const seenKey = (merchantId: number) => `matjari_seen_new_orders_${merchantId}`;

// ─── Push notification helpers ────────────────────────────────────────────────

/** Convert a base64url string to a Uint8Array (required by pushManager.subscribe). */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const out = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    out[i] = rawData.charCodeAt(i);
  }
  return out;
}

/** Fetch the VAPID public key through the generated query options (routes via the
 *  QueryCache, so an expired session 401 is handled centrally). */
async function fetchVapidPublicKey(queryClient: QueryClient): Promise<string> {
  const data = await queryClient.fetchQuery(getGetVapidPublicKeyQueryOptions());
  return data.publicKey;
}

/** POST a PushSubscription through the generated mutation hook (routes via the
 *  MutationCache, so an expired session 401 is handled centrally). */
async function savePushSubscription(
  sub: PushSubscription,
  send: (endpoint: string, keys: { p256dh: string; auth: string }) => Promise<unknown>,
): Promise<void> {
  const json = sub.toJSON();
  await send(json.endpoint ?? '', {
    p256dh: json.keys?.p256dh ?? '',
    auth: json.keys?.auth ?? '',
  });
}

/** Register the service worker and subscribe to push notifications.
 *  Returns true on success, false if push is unsupported or permission denied. */
async function subscribeToPush(
  queryClient: QueryClient,
  send: (endpoint: string, keys: { p256dh: string; auth: string }) => Promise<unknown>,
): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const vapidKey = await fetchVapidPublicKey(queryClient);

    // Check whether we already have a subscription
    let sub = await registration.pushManager.getSubscription();

    // If no existing subscription, create one
    if (!sub) {
      sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });
    }

    await savePushSubscription(sub, send);
    return true;
  } catch {
    return false;
  }
}

// ─── usePushNotifications ─────────────────────────────────────────────────────

const PUSH_ASKED_KEY = (merchantId: number) => `matjari_push_asked_${merchantId}`;

function usePushNotifications(merchantId: number | undefined) {
  const queryClient = useQueryClient();
  const subscribeMutation = useSubscribeToPush();
  const send = (endpoint: string, keys: { p256dh: string; auth: string }) =>
    subscribeMutation.mutateAsync({ data: { endpoint, keys } });

  React.useEffect(() => {
    if (!merchantId) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    // If already granted, silently re-register SW and save subscription
    if (Notification.permission === 'granted') {
      subscribeToPush(queryClient, send).catch(() => undefined);
      return;
    }

    // Only ask once per merchant
    if (Notification.permission === 'denied') return;
    if (localStorage.getItem(PUSH_ASKED_KEY(merchantId))) return;

    // Small delay so the page renders before the permission prompt
    const timer = setTimeout(() => {
      localStorage.setItem(PUSH_ASKED_KEY(merchantId), '1');
      subscribeToPush(queryClient, send)
        .then((granted) => {
          if (granted) {
            toast({
              title: '🔔 تم تفعيل الإشعارات',
              description: 'ستصلك تنبيهات فورية عند وصول طلبات جديدة.',
            });
          }
        })
        .catch(() => undefined);
    }, 3000);

    return () => clearTimeout(timer);
  }, [merchantId, queryClient, send]);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { logout, merchant } = useAuth();
  const [copied, setCopied] = React.useState(false);

  const handleCopyLink = () => {
    if (!merchant?.slug) return;
    const url = `${window.location.origin}/store/${merchant.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const { data: stats } = useGetDashboardStats({
    query: {
      enabled: !!merchant,
      queryKey: getGetDashboardStatsQueryKey(),
      refetchInterval: 30_000,
    },
  });

  // ─── Push notifications ───────────────────────────────────────────────────
  usePushNotifications(merchant?.id);

  // ─── New-order badge ─────────────────────────────────────────────────────
  // `seenNewOrdersCount` is the value of `newOrdersCount` the last time the
  // merchant visited the orders page. null = not yet read from localStorage.
  const [seenNewOrdersCount, setSeenNewOrdersCount] = React.useState<number | null>(null);

  // Read persisted baseline once the merchant identity is known
  React.useEffect(() => {
    if (!merchant) return;
    const stored = localStorage.getItem(seenKey(merchant.id));
    if (stored !== null) {
      setSeenNewOrdersCount(Number(stored));
    }
    // else: leave null until first stats arrive (see initializer effect below)
  }, [merchant?.id]);

  // On first stats load with no stored baseline: initialize to current value
  // so historical "new" orders don't trigger a badge the merchant never caused.
  React.useEffect(() => {
    if (!merchant || !stats || seenNewOrdersCount !== null) return;
    const key = seenKey(merchant.id);
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, String(stats.newOrdersCount));
      setSeenNewOrdersCount(stats.newOrdersCount);
    }
  }, [stats?.newOrdersCount, merchant?.id, seenNewOrdersCount]);

  const isOnOrdersPage =
    location === '/dashboard/orders' || location.startsWith('/dashboard/orders/');

  // When the merchant is on the orders page, mark the current count as seen
  React.useEffect(() => {
    if (!isOnOrdersPage || !merchant || !stats) return;
    localStorage.setItem(seenKey(merchant.id), String(stats.newOrdersCount));
    setSeenNewOrdersCount(stats.newOrdersCount);
  }, [isOnOrdersPage, merchant?.id, stats?.newOrdersCount]);

  const newOrdersBadge =
    !isOnOrdersPage && seenNewOrdersCount !== null && stats
      ? Math.max(0, stats.newOrdersCount - seenNewOrdersCount)
      : 0;

  // ─── New-order toast + sound ──────────────────────────────────────────────
  // prevBadgeRef tracks the last known badge count so we can detect an increase
  // caused by genuine polling (not the initial render).
  const prevBadgeRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (prevBadgeRef.current === null) {
      // First time we have a stable value — record it without alerting
      prevBadgeRef.current = newOrdersBadge;
      return;
    }
    if (newOrdersBadge > prevBadgeRef.current) {
      playNewOrderSound();
      toast({
        title: '🛍️ طلب جديد وصل!',
        description: 'لديك طلب جديد في انتظار المراجعة.',
        action: (
          <ToastAction altText="عرض الطلبات" asChild>
            <Link href="/dashboard/orders">عرض الطلبات</Link>
          </ToastAction>
        ),
      });
    }
    prevBadgeRef.current = newOrdersBadge;
  }, [newOrdersBadge]);
  // ─────────────────────────────────────────────────────────────────────────

  const navItems = [
    { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { href: '/dashboard/products', label: 'المنتجات', icon: Package },
    { href: '/dashboard/orders', label: 'الطلبات', icon: ShoppingBag, badge: newOrdersBadge },
    { href: '/dashboard/discounts', label: 'الخصومات', icon: Tags },
    { href: '/dashboard/reviews', label: 'التقييمات', icon: StarIcon },
    { href: '/dashboard/bundles', label: 'باقات الهدايا', icon: Gift },
    { href: '/dashboard/settings', label: 'الإعدادات', icon: Settings },
  ];

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-l border-gray-200 flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 font-serif mb-1">
            {merchant?.storeName || 'متجري'}
          </h1>
          {merchant?.slug && (
            <div className="flex items-center justify-between mt-1">
              <a
                href={`/store/${merchant.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center text-sm text-gray-500 hover:text-primary transition-colors gap-1.5 group"
              >
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {merchant.slug}.matjari.iq
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </a>
              <button
                onClick={handleCopyLink}
                title="نسخ رابط المتجر"
                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {stats && (
          <div className="px-6 py-4 border-b border-gray-100 flex gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-gray-500">المنتجات</span>
              <span className="font-semibold text-gray-900">{stats.topProducts?.length || 0}</span>
            </div>
            <div className="w-px bg-gray-200"></div>
            <div className="flex flex-col">
              <span className="text-gray-500">الطلبات</span>
              <span className="font-semibold text-gray-900">{stats.totalOrders || 0}</span>
            </div>
          </div>
        )}

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive =
              location === item.href ||
              (location.startsWith(item.href) && item.href !== '/dashboard');
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    'w-full justify-start text-right font-medium transition-colors h-11',
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )}
                >
                  <span className="relative ml-3">
                    <item.icon
                      className={cn('w-5 h-5', isActive ? 'text-primary' : 'text-gray-400')}
                    />
                    {item.badge && item.badge > 0 ? (
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-0.5 text-[10px] font-bold leading-none text-white">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
                    ) : null}
                  </span>
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium text-gray-900 truncate">{merchant?.email}</p>
            <p className="text-xs text-gray-500">
              عضو منذ{' '}
              {merchant?.createdAt ? new Date(merchant.createdAt).getFullYear() : ''}
            </p>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 h-11"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5 ml-3" />
            تسجيل الخروج
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
