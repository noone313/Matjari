import React from 'react';
import { useParams, Link } from 'wouter';
import { useGetOrder, useUpdateOrderStatus, getGetOrderQueryKey } from '@workspace/api-client-react';
import { formatPrice, getStatusLabel, getStatusColor } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight, MapPin, Phone, CreditCard, Gift } from 'lucide-react';

export default function OrderDetail() {
  const { id } = useParams();
  const orderId = Number(id);
  const { data: order, isLoading } = useGetOrder(orderId, { query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId) } });
  const updateStatus = useUpdateOrderStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({ id: orderId, data: { status: newStatus } }, {
      onSuccess: (data) => {
        toast({ title: 'تم تحديث حالة الطلب' });
        queryClient.setQueryData(getGetOrderQueryKey(orderId), data);
      }
    });
  };

  if (isLoading) return <div>جاري التحميل...</div>;
  if (!order) return <div>الطلب غير موجود</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/orders">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-gray-200 bg-white">
            <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-gray-900 font-serif">طلب #{order.id}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
          </div>
          <p className="text-gray-500 mt-1">{new Date(order.createdAt).toLocaleString('ar-IQ')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">المنتجات</h3>
            </div>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-100">
                {order.items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.productName}</div>
                      <div className="text-gray-500">{item.variantLabel}</div>
                    </td>
                    <td className="px-6 py-4 text-center">{formatPrice(item.priceAtOrder)} × {item.quantity}</td>
                    <td className="px-6 py-4 text-left font-bold text-gray-900">{formatPrice(item.priceAtOrder * item.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              {order.discountCode && (
                <div className="flex justify-between text-green-600">
                  <span>خصم ({order.discountCode})</span>
                  <span>- {formatPrice(order.subtotal - order.total)}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-200 mt-2">
                <span>الإجمالي</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 border-b pb-2">تحديث الحالة</h3>
            <div className="flex gap-2 flex-wrap">
              <Button variant={order.status === 'new' ? 'default' : 'outline'} onClick={() => handleStatusChange('new')}>جديد</Button>
              <Button variant={order.status === 'processing' ? 'default' : 'outline'} onClick={() => handleStatusChange('processing')}>تجهيز</Button>
              <Button variant={order.status === 'shipped' ? 'default' : 'outline'} onClick={() => handleStatusChange('shipped')}>شحن</Button>
              <Button variant={order.status === 'delivered' ? 'default' : 'outline'} onClick={() => handleStatusChange('delivered')}>تسليم</Button>
              <Button variant={order.status === 'cancelled' ? 'destructive' : 'outline'} onClick={() => handleStatusChange('cancelled')}>إلغاء</Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-900 border-b pb-2">تفاصيل العميل</h3>
            <div>
              <div className="font-medium text-gray-900">{order.customerName}</div>
              <div className="text-gray-500 text-sm flex items-center gap-2 mt-1">
                <Phone className="w-4 h-4" /> {order.customerPhone}
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-sm flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5" /> 
                <span>{order.customerAddress}</span>
              </div>
            </div>
            <div>
              <div className="text-gray-500 text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> 
                <span className="font-medium text-gray-900">{order.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'تحويل بنكي'}</span>
              </div>
            </div>
          </div>

          {order.isGift && (
            <div className="bg-pink-50 rounded-lg border border-pink-200 shadow-sm p-6">
              <div className="flex items-center gap-2 text-pink-800 font-bold mb-2">
                <Gift className="w-5 h-5" />
                هذا الطلب هدية
              </div>
              {order.giftMessage ? (
                <div className="text-pink-900 text-sm bg-white p-3 rounded border border-pink-100 italic">
                  "{order.giftMessage}"
                </div>
              ) : (
                <div className="text-pink-700 text-sm">بدون رسالة إهداء</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
