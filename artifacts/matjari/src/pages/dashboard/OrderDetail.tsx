import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import { useGetOrder, useUpdateOrderStatus, getGetOrderQueryKey } from '@workspace/api-client-react';
import { formatPrice, getStatusLabel, getStatusColor, buildWhatsAppUrl, buildOrderStatusWhatsAppMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { DetailPanelSkeleton } from '@/components/skeletons';
import { ArrowRight, MapPin, Phone, CreditCard, Gift, Printer, MessageCircle } from 'lucide-react';

export default function OrderDetail() {
  const { id } = useParams();
  const orderId = Number(id);
  const { data: order, isLoading } = useGetOrder(orderId, { query: { enabled: !!orderId, queryKey: getGetOrderQueryKey(orderId) } });
  const updateStatus = useUpdateOrderStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { merchant } = useAuth();
  const [lastNotified, setLastNotified] = useState<string | null>(null);

  const handleStatusChange = (newStatus: string) => {
    updateStatus.mutate({ id: orderId, data: { status: newStatus } }, {
      onSuccess: () => {
        toast({ title: 'تم تحديث حالة الطلب' });
        setLastNotified(newStatus);
        queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(orderId) });
      }
    });
  };

  if (isLoading) return <div className="p-8"><DetailPanelSkeleton /></div>;
  if (!order) return <div>الطلب غير موجود</div>;
  if (!order.items) return <div>جاري التحميل...</div>;

  return (
    <>
      <div className="space-y-6 max-w-4xl mx-auto pb-16 print:hidden">
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
        <Button variant="outline" className="ms-auto" onClick={() => window.print()}>
          <Printer className="w-4 h-4 ml-2" />
          طباعة الإيصال
        </Button>
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
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                {lastNotified
                  ? `تم تحديث الحالة إلى "${getStatusLabel(lastNotified)}". أرسل إشعاراً للعميل عبر واتساب.`
                  : 'بعد تغيير الحالة، يمكنك إشعار العميل عبر واتساب برسالة جاهزة.'}
              </p>
              <a
                href={buildWhatsAppUrl(order.customerPhone, buildOrderStatusWhatsAppMessage(order.id, lastNotified ?? order.status, merchant?.storeName ?? 'متجري', order.customerName))}
                target="_blank"
                rel="noreferrer"
              >
                <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
                  <MessageCircle className="w-4 h-4" />
                  إشعار واتساب
                </Button>
              </a>
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
                <a
                  href={buildWhatsAppUrl(order.customerPhone, buildOrderStatusWhatsAppMessage(order.id, order.status, merchant?.storeName ?? 'متجري', order.customerName))}
                  target="_blank"
                  rel="noreferrer"
                  className="text-green-600 hover:text-green-700"
                  title="راسل العميل عبر واتساب"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
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

      <div id="order-receipt" className="hidden print:block bg-white text-gray-900" dir="rtl">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #order-receipt, #order-receipt * { visibility: visible; }
            #order-receipt { position: absolute; top: 0; left: 0; right: 0; width: 100%; }
            @page { margin: 12mm; }
          }
        `}</style>
        <div className="border border-gray-300 rounded-lg p-6 max-w-2xl mx-auto">
          <div className="text-center border-b border-gray-300 pb-4">
            <div className="text-2xl font-bold font-serif">{merchant?.storeName || 'متجري'}</div>
            {merchant?.phone && (
              <div className="text-sm text-gray-600 mt-1" dir="ltr">{merchant.phone}</div>
            )}
            <div className="text-lg font-bold mt-2">إيصال طلب</div>
          </div>

          <div className="py-4 border-b border-gray-300 grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm">
            <div><span className="text-gray-500">رقم الطلب: </span><span className="font-bold">#{order.id}</span></div>
            <div><span className="text-gray-500">التاريخ: </span>{new Date(order.createdAt).toLocaleString('ar-IQ')}</div>
            <div><span className="text-gray-500">الحالة: </span>{getStatusLabel(order.status)}</div>
            <div><span className="text-gray-500">طريقة الدفع: </span>{order.paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'تحويل بنكي'}</div>
          </div>

          <div className="py-4 border-b border-gray-300 text-sm space-y-1">
            <div><span className="text-gray-500">العميل: </span><span className="font-bold">{order.customerName}</span></div>
            <div><span className="text-gray-500">الهاتف: </span><span dir="ltr">{order.customerPhone}</span></div>
            <div><span className="text-gray-500">العنوان: </span>{order.customerAddress}</div>
          </div>

          <table className="w-full text-sm">
            <tbody>
              {order.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-200 last:border-0">
                  <td className="py-3">
                    <div className="font-medium">{item.productName}</div>
                    {item.variantLabel && <div className="text-gray-500 text-xs">{item.variantLabel}</div>}
                  </td>
                  <td className="py-3 text-center whitespace-nowrap">{item.quantity} × {formatPrice(item.priceAtOrder)}</td>
                  <td className="py-3 text-left font-bold whitespace-nowrap">{formatPrice(item.priceAtOrder * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="py-4 space-y-1 text-sm">
            <div className="flex justify-between">
              <span>المجموع الفرعي</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discountCode && (
              <div className="flex justify-between text-green-700">
                <span>خصم ({order.discountCode})</span>
                <span>- {formatPrice(order.subtotal - order.total)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base pt-2 mt-1 border-t border-gray-300">
              <span>الإجمالي</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>

          {order.isGift && (
            <div className="py-3 border-t border-gray-300 text-sm">
              <div className="font-bold">هدية</div>
              {order.giftMessage && <div className="text-gray-600 mt-1">"{order.giftMessage}"</div>}
            </div>
          )}

          <div className="pt-4 text-center text-sm text-gray-600 border-t border-gray-300">
            شكراً لتسوقك من {merchant?.storeName || 'متجري'}
          </div>
        </div>
      </div>
    </>
  );
}
