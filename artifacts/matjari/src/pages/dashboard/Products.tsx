import React, { useState } from 'react';
import { useListProducts, useDeleteProduct, useUpdateProduct, getGetProductQueryKey } from '@workspace/api-client-react';
import { formatPrice, getCategoryLabel, CATEGORIES, getApiUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import { Plus, Search, Edit, Archive, ArchiveRestore, Package } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { TableRowsSkeleton } from '@/components/skeletons';
import { useToast } from '@/hooks/use-toast';

export default function Products() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const { data: products, isLoading, refetch } = useListProducts({ q: search, category: category || undefined });
  const deleteMutation = useDeleteProduct();
  const updateMutation = useUpdateProduct();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleArchive = (id: number) => {
    if (confirm('هل تريد أرشفة هذا المنتج؟ سيختفي من المتجر ويمكن استعادته لاحقاً.')) {
      deleteMutation.mutate({ id }, {
        onSuccess: () => {
          toast({ title: 'تمت أرشفة المنتج' });
          refetch();
        }
      });
    }
  };

  const handleRestore = (id: number) => {
    updateMutation.mutate({ id, data: { data: { isActive: true } } }, {
      onSuccess: () => {
        toast({ title: 'تمت استعادة المنتج' });
        refetch();
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 font-serif">المنتجات</h2>
          <p className="text-gray-500 mt-1">إدارة منتجات متجرك</p>
        </div>
        <Link href="/dashboard/products/new">
          <Button className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            إضافة منتج
          </Button>
        </Link>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col sm:flex-row gap-4 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="البحث عن منتج..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>
        <select 
          className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">جميع الفئات</option>
          {CATEGORIES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">المنتج</th>
                <th className="px-6 py-4">الفئة</th>
                <th className="px-6 py-4">السعر (يبدأ من)</th>
                <th className="px-6 py-4">الحالة</th>
                <th className="px-6 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <TableRowsSkeleton rows={5} cols={5} />
              ) : products?.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">لا توجد منتجات</td></tr>
              ) : (
                products?.map(product => {
                  const minPrice = product.variants && product.variants.length > 0 
                    ? Math.min(...product.variants.map(v => v.price)) 
                    : 0;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {product.imageUrls?.[0] ? (
                            <img src={getApiUrl(product.imageUrls[0])} alt={product.name} className="w-10 h-10 rounded border border-gray-200 object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded border border-gray-200 bg-gray-100 flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="font-medium text-gray-900">{product.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{getCategoryLabel(product.category)}</td>
                      <td className="px-6 py-4 font-medium">{formatPrice(minPrice)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${product.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                          {product.isActive ? 'نشط' : 'مؤرشف'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link href={`/dashboard/products/${product.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-500 hover:text-primary">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          {product.isActive ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-red-600"
                              onClick={() => handleArchive(product.id)}
                              disabled={deleteMutation.isPending}
                            >
                              <Archive className="w-4 h-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-green-600"
                              onClick={() => handleRestore(product.id)}
                              disabled={updateMutation.isPending}
                            >
                              <ArchiveRestore className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
