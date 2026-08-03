import React, { useState } from 'react';
import { useCart } from '@/contexts/CartContext';
import { formatPrice } from '@/lib/utils';
import { useValidateDiscount } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import { Trash2, ChevronRight } from 'lucide-react';

export default function StoreCart({ slug }: { slug: string }) {
  const { items, updateQuantity, removeFromCart, subtotal } = useCart();
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{code: string, percent: number} | null>(null);
  const [discountError, setDiscountError] = useState('');
  
  const validateMutation = useValidateDiscount();

  const handleApplyDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discountCode.trim()) return;

    validateMutation.mutate({ slug, data: { code: discountCode.trim() } }, {
      onSuccess: (res) => {
        if (res.valid) {
          setAppliedDiscount({ code: res.code, percent: res.percentOff });
          setDiscountError('');
        } else {
          setDiscountError('كود الخصم غير صالح أو منتهي');
          setAppliedDiscount(null);
        }
      },
      onError: () => {
        setDiscountError('كود الخصم غير صالح أو منتهي');
        setAppliedDiscount(null);
      }
    });
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountCode('');
    setDiscountError('');
  };

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 font-serif mb-4">سلة التسوق فارغة</h2>
        <p className="text-gray-500 mb-8">لم تقم بإضافة أي منتجات للسلة بعد.</p>
        <Link href={`/store/${slug}`}>
          <Button className="h-12 px-8">تصفح المتجر</Button>
        </Link>
      </div>
    );
  }

  const discountAmount = appliedDiscount ? (subtotal * appliedDiscount.percent) / 100 : 0;
  const total = subtotal - discountAmount;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-gray-500">
        <Link href={`/store/${slug}`} className="hover:text-gray-900 transition-colors">المتجر</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-bold">السلة</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.variantId} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-center">
              <div className="w-20 h-20 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden shrink-0">
                {item.image ? (
                  <img src={item.image} alt={item.productName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">بدون صورة</div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <Link href={`/store/${slug}/product/${item.productId}`} className="font-bold text-gray-900 font-serif truncate hover:text-[hsl(var(--primary))] transition-colors">
                  {item.productName}
                </Link>
                <div className="text-sm text-gray-500 mt-1">{item.variantLabel}</div>
                <div className="font-bold text-gray-900 mt-2">{formatPrice(item.price)}</div>
              </div>

              <div className="flex flex-col items-end gap-3 shrink-0">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-gray-400 hover:text-red-500 h-8 w-8"
                  onClick={() => removeFromCart(item.variantId)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center border border-gray-200 rounded-md h-9">
                  <button 
                    className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50"
                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                  >-</button>
                  <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                  <button 
                    className="w-8 h-full flex items-center justify-center text-gray-500 hover:bg-gray-50"
                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                  >+</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6 sticky top-24">
            <h3 className="font-bold text-lg text-gray-900 border-b border-gray-100 pb-4">ملخص الطلب</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>المجموع الفرعي</span>
                <span className="font-bold">{formatPrice(subtotal)}</span>
              </div>
              
              {appliedDiscount && (
                <div className="flex justify-between text-green-600 font-bold">
                  <span>خصم ({appliedDiscount.code})</span>
                  <span>- {formatPrice(discountAmount)}</span>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100">
              <div className="flex justify-between text-lg font-bold text-gray-900">
                <span>الإجمالي</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>

            <form onSubmit={handleApplyDiscount} className="pt-4">
              <div className="flex gap-2">
                <Input 
                  placeholder="كود الخصم" 
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  disabled={!!appliedDiscount}
                  className="bg-gray-50"
                  dir="ltr"
                />
                {!appliedDiscount ? (
                  <Button type="submit" variant="secondary" disabled={validateMutation.isPending || !discountCode.trim()}>تطبيق</Button>
                ) : (
                  <Button type="button" variant="outline" className="text-red-500" onClick={removeDiscount}>إزالة</Button>
                )}
              </div>
              {discountError && <p className="text-xs text-red-500 mt-2">{discountError}</p>}
            </form>

            <Link href={`/store/${slug}/checkout${appliedDiscount ? `?discount=${appliedDiscount.code}` : ''}`}>
              <Button className="w-full h-12 text-lg font-bold mt-4" style={{ backgroundColor: 'hsl(var(--primary))' }}>
                متابعة الدفع
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
