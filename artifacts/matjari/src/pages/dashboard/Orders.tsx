import React, { useState } from 'react';
import { useListOrders } from '@workspace/api-client-react';
import { formatPrice, getStatusLabel, getStatusColor, buildWhatsAppUrl, buildOrderStatusWhatsAppMessage } from '@/lib/utils';
import { Link } from 'wouter';
import { Eye, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { TableRowsSkeleton } from '@/components/skeletons';

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const { merchant } = useAuth();

  const { data, isLoading } = useListOrders({ status: statusFilter || undefined, page });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 font-serif">الطلبات</h2>
          <p className="text-gray-500 mt-1">تتبع وإدارة طلبات العملاء</p>
        </div>
        <select 
          className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
        >
          <option value="">جميع الحالات</option>
          <option value="new">جديد</option>
          <option value="processing">قيد التجهيز</option>
          <option value="shipped">تم الشحن</option>
          <option value="delivered">تم التسليم</option>
          <option value="cancelled">ملغي</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">رقم الطلب</th>
                <th className="px-6 py-4">التاريخ</th>
                <th className="px-6 py-4">العميل</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4">الإجمالي</th>
                <th className="px-6 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <TableRowsSkeleton rows={5} cols={6} />
              ) : data?.orders.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">لا توجد طلبات تطابق بحثك</td></tr>
              ) : (
                data?.orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">#{order.id}</td>
                    <td className="px-6 py-4 text-gray-500">{new Date(order.createdAt).toLocaleString('ar-IQ')}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{order.customerName}</div>
                      <div className="text-xs text-gray-500">{order.customerPhone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                      {order.isGift && <span className="mr-2 px-2 py-0.5 rounded-full bg-pink-100 text-pink-800 text-xs border border-pink-200">هدية</span>}
                    </td>
                    <td className="px-6 py-4 font-bold">{formatPrice(order.total)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <a
                          href={buildWhatsAppUrl(order.customerPhone, buildOrderStatusWhatsAppMessage(order.id, order.status, merchant?.storeName ?? 'متجري', order.customerName))}
                          target="_blank"
                          rel="noreferrer"
                          title="إشعار واتساب للعميل"
                        >
                          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-green-600">
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </a>
                        <Link href={`/dashboard/orders/${order.id}`}>
                          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-primary">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {data && data.total > data.pageSize && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <span className="text-sm text-gray-500">
              إجمالي {data.total} طلب
            </span>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                السابق
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setPage(p => p + 1)}
                disabled={page * data.pageSize >= data.total}
              >
                التالي
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
