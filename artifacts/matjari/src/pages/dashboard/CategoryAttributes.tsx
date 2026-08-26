import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useListDashboardCategories, type Category } from '@/hooks/useCategories';
import {
  useAttributeDefinitions,
  useCreateAttributeDefinition,
  useUpdateAttributeDefinition,
  useDeleteAttributeDefinition,
  type AttributeDefinition,
} from '@/hooks/useAttributes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Loader2, ChevronRight, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { TableRowsSkeleton } from '@/components/skeletons';

export default function CategoryAttributes() {
  const [, params] = useRoute('/dashboard/categories/:catId/attributes');
  const [, setLocation] = useLocation();
  const catId = params ? Number(params.catId) : null;
  const { toast } = useToast();

  const { data: categories } = useListDashboardCategories();
  const { data: attributes, isLoading } = useAttributeDefinitions(catId);
  const createAttr = useCreateAttributeDefinition();
  const updateAttr = useUpdateAttributeDefinition();
  const deleteAttr = useDeleteAttributeDefinition();

  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState('text');
  const [newRequired, setNewRequired] = useState(false);

  const category = categories?.find((c) => c.id === catId);

  const handleCreate = async () => {
    if (!newKey.trim() || !newLabel.trim() || !catId) {
      toast({ title: 'المفتاح والاسم مطلوبان', variant: 'destructive' });
      return;
    }
    try {
      await createAttr.mutateAsync({
        catId,
        key: newKey.trim(),
        label: newLabel.trim(),
        type: newType,
        required: newRequired,
      });
      setNewKey('');
      setNewLabel('');
      setNewType('text');
      setNewRequired(false);
      toast({ title: 'تم إضافة الخاصية' });
    } catch (err: any) {
      toast({ title: err.message ?? 'حدث خطأ', variant: 'destructive' });
    }
  };

  const handleDelete = async (attr: AttributeDefinition) => {
    if (!catId || !confirm(`هل تريد حذف "${attr.label}"؟`)) return;
    try {
      await deleteAttr.mutateAsync({ attrId: attr.id, catId });
      toast({ title: 'تم حذف الخاصية' });
    } catch (err: any) {
      toast({ title: err.message ?? 'حدث خطأ', variant: 'destructive' });
    }
  };

  const toggleRequired = async (attr: AttributeDefinition) => {
    if (!catId) return;
    try {
      await updateAttr.mutateAsync({
        attrId: attr.id,
        catId,
        required: !attr.required,
      });
    } catch (err: any) {
      toast({ title: err.message ?? 'حدث خطأ', variant: 'destructive' });
    }
  };

  if (!catId) {
    setLocation('/dashboard/categories');
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <button
            onClick={() => setLocation('/dashboard/categories')}
            className="hover:text-gray-900 transition-colors"
          >
            الفئات
          </button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 font-medium">إدارة الخصائص</span>
        </div>
        <h2 className="text-3xl font-bold text-gray-900 font-serif">
          خصائص فئة: {category?.label ?? '...'}
        </h2>
        <p className="text-gray-500 mt-1">
          تعريف الحقول الإضافية التي تظهر لكل منتج في هذه الفئة
        </p>
      </div>

      {/* Add new attribute */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-lg font-bold text-gray-900 border-b pb-2 flex items-center gap-2">
          <Settings className="w-5 h-5" />
          إضافة خاصية جديدة
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>المفتاح (إنجليزي)</Label>
            <Input
              value={newKey}
              onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
              placeholder="note_top"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label>الاسم بالعربي</Label>
            <Input
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="المقدمة (القمة)"
            />
          </div>
          <div className="space-y-2">
            <Label>نوع الإدخال</Label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
            >
              <option value="text">نص قصير</option>
              <option value="textarea">نص طويل</option>
            </select>
          </div>
          <div className="flex items-end gap-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Switch checked={newRequired} onCheckedChange={setNewRequired} />
              <Label className="text-sm">إلزامي</Label>
            </div>
            <Button
              onClick={handleCreate}
              disabled={createAttr.isPending || !newKey.trim() || !newLabel.trim()}
              className="flex-1"
            >
              {createAttr.isPending ? (
                <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 ml-2" />
              )}
              إضافة
            </Button>
          </div>
        </div>
      </div>

      {/* Attributes list */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">المفتاح</th>
                <th className="px-6 py-4">الاسم</th>
                <th className="px-6 py-4">النوع</th>
                <th className="px-6 py-4 text-center">إلزامي</th>
                <th className="px-6 py-4 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <TableRowsSkeleton rows={3} cols={5} />
              ) : attributes?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    لا توجد خصائص معرّفة لهذه الفئة
                  </td>
                </tr>
              ) : (
                attributes?.map((attr) => (
                  <tr key={attr.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-600" dir="ltr">{attr.key}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">{attr.label}</td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {attr.type === 'textarea' ? 'نص طويل' : 'نص قصير'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => toggleRequired(attr)}>
                        <Switch checked={attr.required} />
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-gray-500 hover:text-red-600"
                        onClick={() => handleDelete(attr)}
                        disabled={deleteAttr.isPending}
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
    </div>
  );
}
