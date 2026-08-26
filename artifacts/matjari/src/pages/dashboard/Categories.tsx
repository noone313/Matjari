import React, { useState } from 'react';
import { useListDashboardCategories, useCreateDashboardCategory, useUpdateDashboardCategory, useDeleteDashboardCategory, useReorderDashboardCategories, type Category } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, GripVertical, Loader2, Edit2, Check, X, LayoutGrid } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TableRowsSkeleton } from '@/components/skeletons';

export default function Categories() {
  const { data: categories, isLoading } = useListDashboardCategories();
  const createCategory = useCreateDashboardCategory();
  const updateCategory = useUpdateDashboardCategory();
  const deleteCategory = useDeleteDashboardCategory();
  const reorderCategories = useReorderDashboardCategories();
  const { toast } = useToast();

  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const handleCreate = async () => {
    if (!newLabel.trim()) {
      toast({ title: 'اسم الفئة مطلوب', variant: 'destructive' });
      return;
    }
    try {
      await createCategory.mutateAsync({
        slug: newLabel.trim(),
        label: newLabel.trim(),
        sortOrder: (categories?.length ?? 0) + 1,
      });
      setNewLabel('');
      toast({ title: 'تم إضافة الفئة' });
    } catch (err: any) {
      toast({ title: err.message ?? 'حدث خطأ', variant: 'destructive' });
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditLabel(cat.label);
  };

  const saveEdit = async (id: number) => {
    try {
      await updateCategory.mutateAsync({ id, label: editLabel });
      setEditingId(null);
      toast({ title: 'تم التحديث' });
    } catch (err: any) {
      toast({ title: err.message ?? 'حدث خطأ', variant: 'destructive' });
    }
  };

  const handleDelete = async (cat: Category) => {
    if (!confirm(`هل تريد حذف "${cat.label}"؟`)) return;
    try {
      await deleteCategory.mutateAsync(cat.id);
      toast({ title: 'تم الحذف' });
    } catch (err: any) {
      toast({ title: err.message ?? 'حدث خطأ', variant: 'destructive' });
    }
  };

  const handleMoveUp = async (index: number) => {
    if (!categories || index === 0) return;
    const ids = [...categories].map((c) => c.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    await reorderCategories.mutateAsync(ids);
  };

  const handleMoveDown = async (index: number) => {
    if (!categories || index === categories.length - 1) return;
    const ids = [...categories].map((c) => c.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    await reorderCategories.mutateAsync(ids);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 font-serif">الفئات</h2>
        <p className="text-gray-500 mt-1">إدارة أقسام وتصنيفات المنتجات</p>
      </div>

      {/* Add new category */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2">إضافة فئة جديدة</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>اسم الفئة</Label>
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="مثال: عطور رجالي"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleCreate}
              disabled={createCategory.isPending || !newLabel.trim()}
              className="w-full"
            >
              {createCategory.isPending ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 ml-2" />
              )}
              إضافة
            </Button>
          </div>
        </div>
      </div>

      {/* Categories list */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 w-12"></th>
                <th className="px-6 py-4">الاسم</th>
                <th className="px-6 py-4">الرابط</th>
                <th className="px-6 py-4">الترتيب</th>
                <th className="px-6 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <TableRowsSkeleton rows={4} cols={5} />
              ) : categories?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    <LayoutGrid className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                    لا توجد فئات بعد
                  </td>
                </tr>
              ) : (
                categories?.map((cat, index) => (
                  <tr key={cat.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        >
                          <GripVertical className="w-4 h-4 rotate-180" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === (categories?.length ?? 0) - 1}
                          className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                        >
                          <GripVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {editingId === cat.id ? (
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="h-8 w-full"
                        />
                      ) : (
                        cat.label
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs" dir="ltr">{cat.slug}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">{cat.sortOrder}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {editingId === cat.id ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-green-600 hover:text-green-700"
                              onClick={() => saveEdit(cat.id)}
                              disabled={updateCategory.isPending}
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-gray-700"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-primary"
                              onClick={() => startEdit(cat)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-red-600"
                              onClick={() => handleDelete(cat)}
                              disabled={deleteCategory.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
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
    </div>
  );
}
