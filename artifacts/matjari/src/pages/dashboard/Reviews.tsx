import React, { useState } from 'react';
import { useListReviews, useDecideReview, useDeleteReview } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Star } from 'lucide-react';
import { TableRowsSkeleton } from '@/components/skeletons';

type StatusTab = 'pending' | 'approved' | 'all';

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      ))}
    </div>
  );
}

export default function Reviews() {
  const { toast } = useToast();
  const [tab, setTab] = useState<StatusTab>('pending');

  const { data, isLoading, refetch } = useListReviews(tab === 'all' ? undefined : { status: tab });
  const decideReview = useDecideReview();
  const deleteReview = useDeleteReview();

  const handleApprove = (id: number) => {
    decideReview.mutate({ id, data: { isApproved: true } }, {
      onSuccess: () => {
        toast({ title: 'تم اعتماد التقييم' });
        refetch();
      },
      onError: () => toast({ title: 'تعذر اعتماد التقييم' }),
    });
  };

  const handleUnapprove = (id: number) => {
    decideReview.mutate({ id, data: { isApproved: false } }, {
      onSuccess: () => {
        toast({ title: 'تم إرجاع التقييم للمعلّقة' });
        refetch();
      },
      onError: () => toast({ title: 'تعذر التعديل' }),
    });
  };

  const handleReject = (id: number) => {
    if (!confirm('هل أنت متأكد من رفض وحذف هذا التقييم؟')) return;
    deleteReview.mutate({ id }, {
      onSuccess: () => {
        toast({ title: 'تم رفض التقييم وحذفه' });
        refetch();
      },
      onError: () => toast({ title: 'تعذر رفض التقييم' }),
    });
  };

  const reviews = data?.reviews ?? [];

  const tabs: { key: StatusTab; label: string }[] = [
    { key: 'pending', label: 'المعلّقة' },
    { key: 'approved', label: 'المعتمدة' },
    { key: 'all', label: 'الكل' },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 font-serif">التقييمات</h2>
        <p className="text-gray-500 mt-1">اعتماد أو رفض تقييمات العملاء قبل ظهورها في متجرك</p>
      </div>

      <div className="flex gap-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
              tab === t.key
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm text-right">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
            <tr>
              <th className="px-6 py-4">المنتج</th>
              <th className="px-6 py-4">العميل</th>
              <th className="px-6 py-4">التقييم</th>
              <th className="px-6 py-4">التعليق</th>
              <th className="px-6 py-4">التاريخ</th>
              <th className="px-6 py-4 text-center">إجراء</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <TableRowsSkeleton rows={4} cols={6} />
            ) : reviews.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">لا توجد تقييمات</td></tr>
            ) : (
              reviews.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{r.productName}</td>
                  <td className="px-6 py-4 text-gray-700">{r.customerName}</td>
                  <td className="px-6 py-4"><Stars rating={r.rating} /></td>
                  <td className="px-6 py-4 text-gray-600 max-w-xs">
                    {r.comment ? (
                      <span className="line-clamp-2">{r.comment}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleDateString('ar-IQ')}
                  </td>
                  <td className="px-6 py-4 text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                      {!r.isApproved ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(r.id)}
                            disabled={decideReview.isPending}
                            className="text-green-600 border-green-200 hover:bg-green-50"
                          >
                            <Check className="w-4 h-4 ml-1" /> اعتماد
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(r.id)}
                            disabled={deleteReview.isPending}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 ml-1" /> رفض
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnapprove(r.id)}
                          disabled={decideReview.isPending}
                          className="text-gray-500"
                        >
                          إلغاء الاعتماد
                        </Button>
                      )}
                    </div>
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
