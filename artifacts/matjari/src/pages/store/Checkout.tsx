import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCart } from '@/contexts/CartContext';
import { usePlaceOrder, useGetStore, useValidateDiscount, getGetStoreQueryKey } from '@workspace/api-client-react';
import { formatPrice } from '@/lib/utils';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ChevronRight, CreditCard, Banknote, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  customerName: z.string().min(2, 'الاسم مطلوب'),
  customerPhone: z.string().min(10, 'رقم الهاتف مطلوب'),
  customerAddress: z.string().min(5, 'العنوان مطلوب'),
  paymentMethod: z.enum(['cod', 'bank']),
  isGift: z.boolean(),
  giftMessage: z.string().optional().nullable(),
});

export default function StoreCheckout({ slug }: { slug: string }) {
  const { items, subtotal, clearCart } = useCart();
  const [, setLocation] = useLocation();
  const { data: store } = useGetStore(slug, { query: { enabled: !!slug, queryKey: getGetStoreQueryKey(slug) } });
  const placeOrder = usePlaceOrder();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(window.location.search);
  const discountCode = searchParams.get('discount');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);

  const validateMutation = useValidateDiscount();

  React.useEffect(() => {
    if (discountCode) {
      validateMutation.mutate({ slug, data: { code: discountCode } }, {
        onSuccess: (res) => {
          if (res.valid) setAppliedDiscount(res.percentOff);
        }
      });
    }
  }, [discountCode]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      paymentMethod: 'cod',
      isGift: false,
      giftMessage: '',
    }
  });

  const isGift = form.watch('isGift');
  const paymentMethod = form.watch('paymentMethod');

  if (items.length === 0) {
    return <div className="text-center py-24 text-gray-500">سلة التسوق فارغة</div>;
  }

  const discountAmount = (subtotal * appliedDiscount) / 100;
  const total = subtotal - discountAmount;

  const onSubmit = (data: z.infer<typeof schema>) => {
    const payload = {
      ...data,
      discountCode: discountCode || null,
      items: items.map(item => ({
        variantId: item.variantId,
        quantity: item.quantity
      }))
    };

    placeOrder.mutate({ slug, data: { ...payload, paymentMethod: payload.paymentMethod === 'bank' ? 'bank_transfer' : 'cod' } }, {
      onSuccess: (res) => {
        clearCart();
        setLocation(`/store/${slug}/confirmation/${res.orderId}`);
      },
      onError: () => {
        toast({ title: 'حدث خطأ أثناء إتمام الطلب', variant: 'destructive' });
      }
    });
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center gap-2 text-gray-500">
        <Link href={`/store/${slug}`} className="hover:text-gray-900 transition-colors">المتجر</Link>
        <ChevronRight className="w-4 h-4" />
        <Link href={`/store/${slug}/cart`} className="hover:text-gray-900 transition-colors">السلة</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-bold">الدفع</span>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-xl font-bold font-serif text-gray-900 border-b border-gray-100 pb-4">معلومات التوصيل</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>الاسم الكامل</Label>
                <Input {...form.register('customerName')} className="h-12 bg-gray-50" />
                {form.formState.errors.customerName && <p className="text-sm text-red-500">{form.formState.errors.customerName.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>رقم الهاتف</Label>
                <Input {...form.register('customerPhone')} className="h-12 bg-gray-50 text-left" dir="ltr" placeholder="07..." />
                {form.formState.errors.customerPhone && <p className="text-sm text-red-500">{form.formState.errors.customerPhone.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>عنوان التوصيل التفصيلي (المدينة، المنطقة، أقرب نقطة دالة)</Label>
                <Textarea {...form.register('customerAddress')} rows={3} className="bg-gray-50 resize-none" />
                {form.formState.errors.customerAddress && <p className="text-sm text-red-500">{form.formState.errors.customerAddress.message}</p>}
              </div>
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
            <h2 className="text-xl font-bold font-serif text-gray-900 border-b border-gray-100 pb-4">طريقة الدفع</h2>
            
            <div className="space-y-3">
              <label className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" value="cod" {...form.register('paymentMethod')} className="w-5 h-5 accent-[hsl(var(--primary))]" />
                <Banknote className={`w-6 h-6 ${paymentMethod === 'cod' ? 'text-[hsl(var(--primary))]' : 'text-gray-400'}`} />
                <span className="font-bold text-gray-900">الدفع عند الاستلام</span>
              </label>

              <label className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'bank' ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input type="radio" value="bank" {...form.register('paymentMethod')} className="w-5 h-5 accent-[hsl(var(--primary))]" />
                <CreditCard className={`w-6 h-6 ${paymentMethod === 'bank' ? 'text-[hsl(var(--primary))]' : 'text-gray-400'}`} />
                <span className="font-bold text-gray-900">تحويل مباشر</span>
              </label>

              {paymentMethod === 'bank' && store?.bankTransferInfo && (
                <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  <strong className="block mb-2 text-gray-900">معلومات التحويل:</strong>
                  {store.bankTransferInfo}
                </div>
              )}
            </div>
          </div>

          <div className="bg-pink-50/50 p-6 md:p-8 rounded-xl shadow-sm border border-pink-100 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-pink-900">إرسال كهدية؟</h3>
                <p className="text-sm text-pink-700 mt-1">سنقوم بتغليف الطلب كهدية مميزة</p>
              </div>
              <Switch checked={isGift} onCheckedChange={(val) => form.setValue('isGift', val)} />
            </div>

            {isGift && (
              <div className="pt-4 animate-in fade-in slide-in-from-top-2">
                <Label className="text-pink-900">رسالة الإهداء (اختياري)</Label>
                <Textarea {...form.register('giftMessage')} className="mt-2 border-pink-200 focus-visible:ring-pink-500 bg-white" rows={2} placeholder="اكتب رسالتك هنا..." />
              </div>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-24 h-fit">
          <div className="bg-gray-900 text-white p-6 md:p-8 rounded-xl shadow-lg space-y-6">
            <h2 className="text-xl font-bold font-serif border-b border-gray-800 pb-4">ملخص الطلب</h2>
            
            <div className="space-y-4 max-h-[40vh] overflow-y-auto scrollbar-hide pr-2">
              {items.map(item => (
                <div key={item.variantId} className="flex justify-between text-sm">
                  <div className="flex gap-3">
                    <span className="text-gray-400">{item.quantity}×</span>
                    <div>
                      <div className="font-medium text-gray-100">{item.productName}</div>
                      <div className="text-gray-500 text-xs">{item.variantLabel}</div>
                    </div>
                  </div>
                  <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="pt-6 border-t border-gray-800 space-y-3 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>المجموع الفرعي</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              
              {appliedDiscount > 0 && (
                <div className="flex justify-between text-[hsl(var(--primary))] font-bold">
                  <span>خصم الترويج</span>
                  <span>- {formatPrice(discountAmount)}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-800">
              <div className="flex justify-between text-xl font-bold text-white mb-6">
                <span>الإجمالي</span>
                <span className="text-[hsl(var(--primary))]">{formatPrice(total)}</span>
              </div>
              
              <Button type="submit" className="w-full h-14 text-lg font-bold bg-white text-gray-900 hover:bg-gray-100" disabled={placeOrder.isPending}>
                {placeOrder.isPending ? 'جاري التأكيد...' : 'تأكيد الطلب'}
              </Button>
            </div>
            
            <div className="text-center text-xs text-gray-500 mt-4 flex items-center justify-center gap-1">
              <AlertCircle className="w-3 h-3" />
              بإتمامك للطلب، أنت توافق على شروط وأحكام المتجر
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
