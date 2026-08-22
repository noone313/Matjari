import React, { useState } from 'react';
import { useListDiscounts, useCreateDiscount, useToggleDiscount, useDeleteDiscount } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Tag, Percent, Banknote } from 'lucide-react';
import { TableRowsSkeleton } from '@/components/skeletons';
import { Switch } from '@/components/ui/switch';
import { formatPrice } from '@/lib/utils';

export default function Discounts() {
  const { data: discounts, isLoading, refetch } = useListDiscounts();
  const createDiscount = useCreateDiscount();
  const toggleDiscount = useToggleDiscount();
  const deleteDiscount = useDeleteDiscount();
  const { toast } = useToast();

  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [percent, setPercent] = useState('');
  const [amount, setAmount] = useState('');
  const [minOrder, setMinOrder] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    const payload = discountType === 'percent'
      ? { percentOff: Number(percent) }
      : { amountOff: Number(amount) };
    if (discountType === 'percent' && !percent) return;
    if (discountType === 'fixed' && !amount) return;

    createDiscount.mutate({
      data: {
        code: code.toUpperCase(),
        ...payload,
        minOrderTotal: minOrder ? Number(minOrder) : undefined,
        isActive: true,
      }
    }, {
      onSuccess: () => {
        toast({ title: 'تم إنشاء كود الخصم' });
        setCode('');
        setPercent('');
        setAmount('');
        setMinOrder('');
        refetch();
      }
    });
  };

  const handleToggle = (id: number) => {
    toggleDiscount.mutate({ id }, {
      onSuccess: () => refetch()
    });
  };

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا الكود؟')) {
      deleteDiscount.mutate({ id }, {
        onSuccess: () => {
          toast({ title: 'تم الحذف' });
          refetch();
        }
      });
    }
  };

  const discountLabel = (d: { percentOff?: number | null; amountOff?: number | null }) =>
    d.percentOff != null ? `${d.percentOff}%` : formatPrice(d.amountOff ?? 0);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 font-serif">الخصومات</h2>
        <p className="text-gray-500 mt-1">إنشاء وإدارة أكواد الخصم الترويجية</p>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-900 mb-4">إنشاء كود جديد</h3>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الكود</Label>
              <div className="relative">
                <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="pr-10"
                  placeholder="مثال: EID20"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>نوع الخصم</Label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden h-10">
                <button
                  type="button"
                  onClick={() => setDiscountType('percent')}
                  className={`flex-1 text-sm font-medium transition-colors ${discountType === 'percent' ? 'bg-primary text-primary-foreground' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                  نسبة %
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('fixed')}
                  className={`flex-1 text-sm font-medium transition-colors ${discountType === 'fixed' ? 'bg-primary text-primary-foreground' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                >
                  مبلغ ثابت
                </button>
              </div>
            </div>

            {discountType === 'percent' ? (
              <div className="space-y-2">
                <Label>نسبة الخصم (%)</Label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={percent}
                    onChange={(e) => setPercent(e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>مبلغ الخصم (د.ع)</Label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>حد أدنى للطلب (د.ع) — اختياري</Label>
              <Input
                type="number"
                min="1"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
                placeholder="بدون حد أدنى"
                dir="ltr"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" className="h-10 px-8" disabled={createDiscount.isPending}>
              إضافة
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">الكود</th>
              <th className="px-6 py-4">الخصم</th>
              <th className="px-6 py-4">حد أدنى</th>
              <th className="px-6 py-4">تاريخ الإنشاء</th>
              <th className="px-6 py-4 text-center">نشط</th>
              <th className="px-6 py-4 text-center">حذف</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <TableRowsSkeleton rows={4} cols={6} />
            ) : discounts?.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">لا توجد أكواد خصم</td></tr>
            ) : (
              discounts?.map(discount => (
                <tr key={discount.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono font-bold text-primary">{discount.code}</td>
                  <td className="px-6 py-4 font-bold">{discountLabel(discount)}</td>
                  <td className="px-6 py-4 text-gray-500">{discount.minOrderTotal != null ? formatPrice(discount.minOrderTotal) : '—'}</td>
                  <td className="px-6 py-4 text-gray-500">{new Date(discount.createdAt).toLocaleDateString('ar-IQ')}</td>
                  <td className="px-6 py-4 text-center">
                    <Switch
                      checked={discount.isActive}
                      onCheckedChange={() => handleToggle(discount.id)}
                      disabled={toggleDiscount.isPending}
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(discount.id)}
                      className="text-gray-400 hover:text-red-600"
                      disabled={deleteDiscount.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
