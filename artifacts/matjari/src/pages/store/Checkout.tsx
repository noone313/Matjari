import React, { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCart, cartItemKey } from '@/contexts/CartContext';
import { usePlaceOrder, useGetStore, validateDiscountCode, getGetStoreQueryKey } from '@workspace/api-client-react';
import { formatPrice } from '@/lib/utils';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronRight, CreditCard, Banknote, AlertCircle, CheckCircle2, XCircle, Gift, Loader2, ShoppingCart, MapPin, PartyPopper } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const IRAQI_GOVERNORATES = [
  'بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف', 'كربلاء', 'الأنبار', 'ديالى',
  'صلاح الدين', 'كركوك', 'دهوك', 'السليمانية', 'ميسان', 'ذي قار', 'المثنى', 'القادسية', 'واسط', 'حلبجة',
] as const;

const schema = z.object({
  customerName: z.string().min(2, 'الاسم مطلوب'),
  customerPhone: z.string().min(10, 'رقم الهاتف مطلوب').regex(/^07/, 'يجب أن يبدأ الرقم بـ 07'),
  governorate: z.string().min(1, 'المحافظة مطلوبة'),
  district: z.string().min(2, 'المنطقة مطلوبة'),
  street: z.string().min(3, 'العنوان التفصيلي مطلوب'),
  paymentMethod: z.enum(['cod', 'bank']),
  isGift: z.boolean(),
  giftMessage: z.string().optional().nullable(),
});

type FormData = z.infer<typeof schema>;

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function StepIndicator({ current }: { current: number }) {
  const steps = [
    { label: 'السلة', icon: ShoppingCart },
    { label: 'الدفع', icon: MapPin },
    { label: 'التأكيد', icon: PartyPopper },
  ];
  return (
    <div className="flex items-center justify-center gap-0 w-full max-w-md mx-auto mb-8">
      {steps.map((step, i) => {
        const Icon = step.icon;
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={step.label}>
            {i > 0 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full transition-colors duration-300 ${done ? 'bg-[hsl(var(--primary))]' : 'bg-gray-200'}`} />
            )}
            <div className="flex flex-col items-center gap-1.5 min-w-[60px]">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                done ? 'bg-[hsl(var(--primary))] text-white' :
                active ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary))]' :
                'bg-gray-100 text-gray-400'
              }`}>
                {done ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={`text-xs font-medium ${active ? 'text-[hsl(var(--primary))]' : done ? 'text-gray-700' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function StoreCheckout({ slug }: { slug: string }) {
  const { items, subtotal, clearCart } = useCart();
  const [, setLocation] = useLocation();
  const { data: store } = useGetStore(slug, { query: { enabled: !!slug, queryKey: getGetStoreQueryKey(slug) } });
  const placeOrder = usePlaceOrder();
  const { toast } = useToast();

  const searchParams = new URLSearchParams(window.location.search);
  const urlDiscountCode = searchParams.get('discount') ?? '';
  const [discountInput, setDiscountInput] = useState(urlDiscountCode);
  const debouncedDiscount = useDebounced(discountInput.trim(), 400);
  const [appliedDiscount, setAppliedDiscount] = useState<{ percentOff?: number | null; amountOff?: number | null; minOrderTotal?: number | null } | null>(null);
  const [discountMessage, setDiscountMessage] = useState<{ type: 'valid' | 'invalid'; text: string } | null>(null);
  const [discountChecking, setDiscountChecking] = useState(false);
  const validatedRef = useRef('');

  useEffect(() => {
    const code = debouncedDiscount.trim();
    if (!code) {
      setAppliedDiscount(null);
      setDiscountMessage(null);
      validatedRef.current = '';
      return;
    }
    let cancelled = false;
    setDiscountChecking(true);
    validateDiscountCode(slug, code)
      .then((res) => {
        if (cancelled) return;
        validatedRef.current = code;
        if (res.valid) {
          if (res.minOrderTotal != null && subtotal < res.minOrderTotal) {
            setAppliedDiscount(null);
            setDiscountMessage({ type: 'invalid', text: `هذا الكود يتطلب حد أدنى للطلب بقيمة ${formatPrice(res.minOrderTotal)}` });
          } else {
            setAppliedDiscount({ percentOff: res.percentOff ?? null, amountOff: res.amountOff ?? null, minOrderTotal: res.minOrderTotal ?? null });
            const label = res.amountOff != null ? `خصم ${formatPrice(res.amountOff)}` : `خصم ${res.percentOff}%`;
            setDiscountMessage({ type: 'valid', text: `تم تطبيق الخصم: ${label}` });
          }
        } else {
          setAppliedDiscount(null);
          setDiscountMessage({ type: 'invalid', text: 'الكود غير صالح أو منتهي' });
        }
      })
      .catch(() => {
        if (cancelled) return;
        validatedRef.current = code;
        setAppliedDiscount(null);
        setDiscountMessage({ type: 'invalid', text: 'الكود غير صالح أو منتهي' });
      })
      .finally(() => {
        if (!cancelled) setDiscountChecking(false);
      });
    return () => { cancelled = true; };
  }, [debouncedDiscount, slug, subtotal]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      governorate: '',
      district: '',
      street: '',
      paymentMethod: 'cod',
      isGift: false,
      giftMessage: '',
    }
  });

  const isGift = form.watch('isGift');
  const paymentMethod = form.watch('paymentMethod');

  if (items.length === 0) {
    return (
      <div className="py-24 text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-6">
          <ShoppingCart className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-xl font-bold font-serif text-gray-900 mb-2">سلة التسوق فارغة</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">لم تقم بإضافة أي منتجات بعد. تصفح المتجر واكتشف العروض المميزة.</p>
        <Link href={`/store/${slug}`}>
          <Button className="h-12 px-8" style={{ backgroundColor: 'hsl(var(--primary))' }}>تصفح المتجر</Button>
        </Link>
      </div>
    );
  }

  const discountAmount = appliedDiscount
    ? (appliedDiscount.amountOff != null
      ? Math.min(appliedDiscount.amountOff, subtotal)
      : (subtotal * (appliedDiscount.percentOff ?? 0)) / 100)
    : 0;
  const total = subtotal - discountAmount;

  const onSubmit = (data: FormData) => {
    const fullAddress = `${data.governorate}، ${data.district}، ${data.street}`;
    const validDiscount = discountMessage?.type === 'valid' ? discountInput.trim().toUpperCase() : null;
    const payload = {
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerAddress: fullAddress,
      paymentMethod: data.paymentMethod === 'bank' ? 'bank_transfer' as const : 'cod' as const,
      isGift: data.isGift,
      giftMessage: data.giftMessage,
      discountCode: validDiscount,
      items: items.map(item => item.bundleId !== undefined
        ? { bundleId: item.bundleId, quantity: item.quantity }
        : { variantId: item.variantId, quantity: item.quantity })
    };

    placeOrder.mutate({ slug, data: payload }, {
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
      <StepIndicator current={1} />

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
                <Label>المحافظة</Label>
                <Select value={form.watch('governorate')} onValueChange={(val) => form.setValue('governorate', val)}>
                  <SelectTrigger className="h-12 bg-gray-50">
                    <SelectValue placeholder="اختر المحافظة" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">{IRAQI_GOVERNORATES.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.governorate && <p className="text-sm text-red-500">{form.formState.errors.governorate.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>المنطقة / القضاء</Label>
                <Input {...form.register('district')} className="h-12 bg-gray-50" placeholder="مثال: المنصور، الكرادة، الحקיבية" />
                {form.formState.errors.district && <p className="text-sm text-red-500">{form.formState.errors.district.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>الشارع / المبنى / أقرب نقطة دالة</Label>
                <Input {...form.register('street')} className="h-12 bg-gray-50" placeholder="شارع 14 رمضان، عمارة 25، بجوار..." />
                {form.formState.errors.street && <p className="text-sm text-red-500">{form.formState.errors.street.message}</p>}
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
                <div key={cartItemKey(item)} className="flex justify-between text-sm">
                  <div className="flex gap-3">
                    <span className="text-gray-400">{item.quantity}×</span>
                    <div>
                      <div className="font-medium text-gray-100 flex items-center gap-2">
                        {item.productName}
                        {item.bundleId !== undefined && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-300">
                            <Gift className="w-3 h-3" /> باقة
                          </span>
                        )}
                      </div>
                      <div className="text-gray-500 text-xs">{item.variantLabel}</div>
                    </div>
                  </div>
                  <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-400 text-xs">كود الخصم</Label>
              <Input
                value={discountInput}
                onChange={(e) => { setDiscountInput(e.target.value); setDiscountMessage(null); }}
                placeholder="أدخل الكود هنا"
                className="h-11 bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 text-left"
                dir="ltr"
              />
              {discountChecking && !discountMessage && (
                <p className="text-xs text-gray-400">جاري التحقق...</p>
              )}
              {discountMessage?.type === 'valid' && (
                <p className="text-xs text-green-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {discountMessage.text}
                </p>
              )}
              {discountMessage?.type === 'invalid' && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  {discountMessage.text}
                </p>
              )}
            </div>

            <div className="pt-6 border-t border-gray-800 space-y-3 text-sm">
              <div className="flex justify-between text-gray-400">
                <span>المجموع الفرعي</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              
              {appliedDiscount && discountMessage?.type === 'valid' && (
                <div className="flex justify-between text-[hsl(var(--primary))] font-bold">
                  <span>خصم ({discountInput.trim().toUpperCase()})</span>
                  <span>- {formatPrice(discountAmount)}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-800">
              <div className="flex justify-between text-xl font-bold text-white mb-6">
                <span>الإجمالي</span>
                <span className="text-[hsl(var(--primary))]">{formatPrice(total)}</span>
              </div>
              
              <Button
                type="submit"
                className="w-full h-14 text-lg font-bold bg-white text-gray-900 hover:bg-gray-100 transition-all"
                disabled={placeOrder.isPending}
              >
                {placeOrder.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري تأكيد الطلب...
                  </span>
                ) : (
                  `تأكيد الطلب — ${formatPrice(total)}`
                )}
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
