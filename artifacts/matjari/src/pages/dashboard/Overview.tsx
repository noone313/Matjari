import React from 'react';
import { useGetDashboardStats } from '@workspace/api-client-react';
import { formatPrice, getStatusLabel, getStatusColor } from '@/lib/utils';
import { Package, TrendingUp, ShoppingBag, DollarSign } from 'lucide-react';
import { Link } from 'wouter';

export default function Overview() {
  const { data: stats, isLoading } = useGetDashboardStats();

  if (isLoading) return <div className="animate-pulse space-y-8"><div className="h-32 bg-gray-200 rounded-lg"></div></div>;
  if (!stats) return null;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 font-serif">نظرة عامة</h2>
        <p className="text-gray-500 mt-1">أداء متجرك خلال هذا الشهر</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium">مبيعات الشهر</h3>
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatPrice(stats.revenueThisMonth)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium">طلبات الشهر</h3>
            <ShoppingBag className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.ordersThisMonth}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium">إجمالي المبيعات</h3>
            <TrendingUp className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatPrice(stats.totalRevenue)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-gray-500 font-medium">إجمالي الطلبات</h3>
            <Package className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.totalOrders}</p>
        </div>
      </div>

      {/* ── Revenue sparkline (last 7 days) ── */}
      {stats.recentOrders.length > 0 && (() => {
        const days: { label: string; total: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          const label = d.toLocaleDateString('ar-IQ', { weekday: 'short' });
          const total = stats.recentOrders
            .filter(o => new Date(o.createdAt).toISOString().slice(0, 10) === key)
            .reduce((s, o) => s + o.total, 0);
          days.push({ label, total });
        }
        const maxVal = Math.max(...days.map(d => d.total), 1);
        return (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">المبيعات — آخر ٧ أيام</h3>
            <div className="flex items-end gap-2 h-20">
              {days.map((day, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-gray-900 transition-all duration-700"
                    style={{ height: `${Math.max((day.total / maxVal) * 64, day.total > 0 ? 4 : 1)}px` }}
                    title={formatPrice(day.total)}
                  />
                  <span className="text-[9px] text-gray-400 whitespace-nowrap">{day.label}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-900">أحدث الطلبات</h3>
            <Link href="/dashboard/orders" className="text-sm text-primary hover:underline">عرض الكل</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">رقم الطلب</th>
                  <th className="px-6 py-3">العميل</th>
                  <th className="px-6 py-3">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentOrders.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-gray-500">لا توجد طلبات حديثة</td>
                  </tr>
                ) : stats.recentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium"><Link href={`/dashboard/orders/${order.id}`}>#{order.id}</Link></td>
                    <td className="px-6 py-4">{order.customerName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">المنتجات الأكثر مبيعاً</h3>
          </div>
          <div className="p-0">
            {stats.topProducts.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">لا توجد مبيعات بعد</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.topProducts.map(tp => (
                  <li key={tp.productId} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <Link href={`/dashboard/products/${tp.productId}/edit`} className="font-medium text-gray-900 hover:text-primary transition-colors">
                        {tp.productName}
                      </Link>
                      <p className="text-sm text-gray-500 mt-1">{tp.totalSold} وحدة مباعة</p>
                    </div>
                    <div className="text-right font-medium text-gray-900">
                      {formatPrice(tp.totalRevenue)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
