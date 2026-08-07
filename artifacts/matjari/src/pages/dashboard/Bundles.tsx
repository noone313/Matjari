import React from 'react';
import { useListBundles, useDeleteBundle } from '@workspace/api-client-react';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { Plus, Edit, Trash2, Gift } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Bundles() {
  const { data: bundlesData, isLoading, refetch } = useListBundles();
  const bundles = bundlesData?.bundles ?? [];
  const deleteMutation = useDeleteBundle();
  const { toast } = useToast();

  const handleDelete = (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذه الباقة؟')) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: 'تم الحذف بنجاح' });
          refetch();
        },
        onError: (err: any) => {
          toast({ title: err?.message ?? 'حدث خطأ', variant: 'destructive' });
        }
      });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 font-serif">باقات الهدايا</h2>
          <p className="text-gray-500 mt-1">باقات جاهزة يضيفها العميل دفعة واحدة</p>
        </div>
        <Link href="/dashboard/bundles/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            إضافة باقة
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">الباقة</th>
                <th className="px-6 py-4">العناصر</th>
                <th className="px-6 py-4">السعر</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">جاري التحميل...</td></tr>
              ) : bundles.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">لا توجد باقات بعد</td></tr>
              ) : (
                bundles.map(bundle => (
                  <tr key={bundle.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {bundle.imageUrl ? (
                          <img src={bundle.imageUrl} alt={bundle.name} className="w-10 h-10 rounded border border-gray-200 object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded border border-gray-200 bg-gray-100 flex items-center justify-center">
                            <Gift className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{bundle.name}</div>
                          {bundle.description && (
                            <div className="text-xs text-gray-400 line-clamp-1">{bundle.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {bundle.items.map(it => `${it.productName} (${it.variantLabel})${it.quantity > 1 ? ` ×${it.quantity}` : ''}`).join('، ')}
                    </td>
                    <td className="px-6 py-4 font-medium">{formatPrice(bundle.bundlePrice)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${bundle.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                        {bundle.isActive ? 'نشط' : 'غير نشط'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/dashboard/bundles/${bundle.id}/edit`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-primary">
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-red-500"
                          onClick={() => handleDelete(bundle.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}