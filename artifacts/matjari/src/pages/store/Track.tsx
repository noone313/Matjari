import React, { useState, useMemo } from 'react';
import { useGetStoreOrder, getGetStoreOrderQueryKey, useBrowseStoreProducts, getBrowseStoreProductsQueryKey } from '@workspace/api-client-react';
import { formatPrice, getStatusLabel, getStatusColor, getApiUrl } from '@/lib/utils';
import { Link } from 'wouter';
import { PackageSearch, Loader2, Truck, XCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

const ORDER_STEPS = ['new', 'processing', 'shipped', 'delivered'];

export default function StoreTrack({ slug }: { slug: string }) {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState<{ orderId: number; phone: string } | null>(null);
  const { addToCart } = useCart();
  const { toast } = useToast();

  const orderIdNumber = submitted ? submitted.orderId : -1;
  const phoneParam = submitted ? { phone: submitted.phone } : { phone: '' };

  const { data: order, isLoading, error } = useGetStoreOrder(
    slug,
    orderIdNumber,
    phoneParam,
    {
      query: {
        enabled: !!submitted,
        queryKey: getGetStoreOrderQueryKey(slug, orderIdNumber, phoneParam),
      },
    },
  );

  // Catalog needed to rebuild cart items with current price/image when re-ordering.
  const { data: catalog } = useBrowseStoreProducts(slug, {}, {
    query: {
      enabled: !!order,
      queryKey: getBrowseStoreProductsQueryKey(slug, {}),
    },
  });

  const variantLookup = useMemo(() => {
    const map = new Map<number, { variantId: number; productId: number; productName: string; variantLabel: string; price: number; image?: string; category: string }>();
    for (const product of catalog ?? []) {
      for (const variant of product.variants ?? []) {
        map.set(variant.id, {
          variantId: variant.id,
          productId: product.id,
          productName: product.name,
          variantLabel: variant.variantLabel,
          price: variant.price,
          image: product.imageUrls?.find((u) => u?.trim()) ? getApiUrl(product.imageUrls!.find((u) => u?.trim())!) : undefined,
          category: product.category,
        });
      }
    }
    return map;
  }, [catalog]);

  const handleReorder = () => {
    if (!order) return;
    let added = 0;
    let skipped = 0;
    for (const item of order.items) {
      if (item.variantId == null) {
        skipped++;
        continue;
      }
      const match = variantLookup.get(item.variantId);
      if (!match) {
        skipped++;
        continue;
      }
      addToCart({ ...match, quantity: item.quantity });
      added++;
    }
    if (added > 0) {
      toast({ title: `تمت إعادة ${added} عنصر للسلة` });
    } else {
      toast({ title: 'تعذرت إعادة الطلب: المنتجات غير متوفرة حالياً' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const id = parseInt(orderId.trim(), 10);
    if (!id || !phone.trim()) return;
    setSubmitted({ orderId: id, phone: phone.trim() });
  };

  const stepIndex = order ? ORDER_STEPS.indexOf(order.status) : -1;
  const isCancelled = order?.status === 'cancelled';

  return (
    <div className="max-w-xl mx-auto">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-100 text-zinc-900 mb-5">
          <PackageSearch className="w-8 h-8" />
        </div>
        <h1 className="font-serif font-bold text-4xl text-gray-900">تتبع طلبك</h1>
        <p className="text-gray-500 mt-3">
          أدخل رقم الطلب ورقم الهاتف المستخدم عند إتمام الشراء لمعرفة حالة طلبك.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-5"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الطلب</label>
          <Input
            type="text"
            inputMode="numeric"
            dir="ltr"
            placeholder="مثال: 42"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="text-right"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الهاتف</label>
          <Input
            type="tel"
            dir="ltr"
            placeholder="مثال: 07701234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="text-right"
          />
        </div>

        <Button type="submit" className="w-full h-12 font-bold" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              جارٍ البحث...
            </>
          ) : (
            'تتبع الطلب'
          )}
        </Button>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
            تعذر العثور على طلب بهذه البيانات. تأكد من رقم الطلب والهاتف ثم حاول مجدداً.
          </p>
        )}
      </form>

      {order && (
        <div className="mt-10 bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-sm text-gray-500">طلب رقم</p>
              <p className="text-2xl font-bold font-mono text-gray-900">#{order.id}</p>
            </div>
            <span className={`inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full border ${getStatusColor(order.status)}`}>
              {isCancelled && <XCircle className="w-4 h-4" />}
              {getStatusLabel(order.status)}
            </span>
          </div>

          <p className="text-xs text-gray-400 mb-6" dir="ltr">
            {new Date(order.createdAt).toLocaleString('ar-IQ')}
          </p>

          {/* Status steps */}
          {!isCancelled && (
            <div className="flex items-center mb-8">
              {ORDER_STEPS.map((step, idx) => {
                const isReached = idx <= stepIndex;
                return (
                  <React.Fragment key={step}>
                    {idx > 0 && (
                      <div className={`flex-1 h-0.5 ${isReached ? 'bg-zinc-900' : 'bg-gray-200'}`} />
                    )}
                    <div className="flex flex-col items-center gap-1.5">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          isReached
                            ? 'bg-zinc-900 text-white'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <span className={`text-[11px] ${isReached ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                        {getStatusLabel(step)}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}

          {/* Items */}
          <div className="border-t border-gray-100 pt-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-widest mb-3">المنتجات</p>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{item.productName}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {item.variantLabel} × {item.quantity}
                    </p>
                  </div>
                  <p className="font-medium text-gray-900" dir="ltr">
                    {formatPrice(item.priceAtOrder * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-gray-100 space-y-1.5 text-sm">
            <div className="flex items-center justify-between text-gray-500">
              <span>المجموع الفرعي</span>
              <span dir="ltr">{formatPrice(order.subtotal)}</span>
            </div>
            {order.discountCode && (
              <div className="flex items-center justify-between text-green-700">
                <span>خصم ({order.discountCode})</span>
                <span dir="ltr">-{formatPrice(order.subtotal - order.total)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 text-base font-bold text-gray-900">
              <span>الإجمالي</span>
              <span dir="ltr">{formatPrice(order.total)}</span>
            </div>
          </div>

          <Button onClick={handleReorder} className="w-full h-12 font-bold mt-6">
            <RotateCcw className="w-4 h-4" />
            إعادة الطلب
          </Button>
        </div>
      )}

      <div className="mt-8 text-center">
        <Link href={`/store/${slug}`} className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          العودة للمتجر
        </Link>
      </div>
    </div>
  );
}
