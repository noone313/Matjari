import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useGetMe, useGetDashboardStats, getGetDashboardStatsQueryKey } from '@workspace/api-client-react';
import { LayoutDashboard, Package, ShoppingBag, Tags, Settings, LogOut, Store, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { logout, merchant } = useAuth();
  
  const { data: stats } = useGetDashboardStats({ query: { enabled: !!merchant, queryKey: getGetDashboardStatsQueryKey() } });

  const navItems = [
    { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { href: '/dashboard/products', label: 'المنتجات', icon: Package },
    { href: '/dashboard/orders', label: 'الطلبات', icon: ShoppingBag },
    { href: '/dashboard/discounts', label: 'الخصومات', icon: Tags },
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
            const isActive = location === item.href || (location.startsWith(item.href) && item.href !== '/dashboard');
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start text-right font-medium transition-colors h-11",
                    isActive 
                      ? "bg-gray-100 text-gray-900" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon className={cn("w-5 h-5 ml-3", isActive ? "text-primary" : "text-gray-400")} />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="mb-4 px-2">
            <p className="text-sm font-medium text-gray-900 truncate">{merchant?.email}</p>
            <p className="text-xs text-gray-500">عضو منذ {merchant?.createdAt ? new Date(merchant.createdAt).getFullYear() : ''}</p>
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
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
