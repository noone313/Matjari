import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocation, useParams } from 'wouter';
import { useListBundles, useCreateBundle, useUpdateBundle, useListProducts, useUploadBundleImage, useDeleteBundleImage } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getApiUrl } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Plus, Loader2, ArrowRight, Upload, X, ImageIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const schema = z.object({
  name: z.string().min(2, 'اسم الباقة مطلوب').max(200, 'الاسم طويل جداً'),
  description: z.string().optional().nullable(),
  bundlePrice: z.coerce.number().min(1, 'سعر الباقة مطلوب'),
  isActive: z.boolean().default(true),
  items: z.array(z.object({
    productId: z.coerce.number().min(1, 'المنتج مطلوب'),
    variantId: z.coerce.number().min(1, 'الخيار مطلوب'),
    quantity: z.coerce.number().min(1, 'الكمية مطلوبة'),
  })).min(1, 'أضف عنصراً واحداً على الأقل'),
});
type FormValues = z.infer<typeof schema>;

export default function BundleForm() {
  const [, setLocation] = useLocation();
  const { id } = useParams();
  const isEdit = !!id;

  const { data: bundlesData } = useListBundles();
  const bundles = bundlesData?.bundles ?? [];
  const { data: productsData } = useListProducts();
  const products = productsData ?? [];

  const createMutation = useCreateBundle();
  const updateMutation = useUpdateBundle();
  const uploadImageMutation = useUploadBundleImage();
  const deleteImageMutation = useDeleteBundleImage();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [savedImageUrl, setSavedImageUrl] = useState<string | null>(null);
  const [removeSavedImage, setRemoveSavedImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = imageFile
    ? URL.createObjectURL(imageFile)
    : removeSavedImage ? null : savedImageUrl ? getApiUrl(savedImageUrl) : null;

  const variantToProduct = useMemo(() => {
    const map = new Map<number, number>();
    for (const p of products) {
      for (const v of p.variants ?? []) map.set(v.id, p.id);
    }
    return map;
  }, [products]);

  const { register, control, handleSubmit, reset, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      bundlePrice: 0,
      isActive: true,
      items: [{ productId: 0, variantId: 0, quantity: 1 }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');

  useEffect(() => {
    if (!id) return;
    const bundle = bundles.find(b => b.id === Number(id));
    if (!bundle) return;
    reset({
      name: bundle.name,
      description: bundle.description ?? '',
      bundlePrice: bundle.bundlePrice,
      isActive: bundle.isActive,
      items: bundle.items.map(it => ({
        productId: variantToProduct.get(it.variantId) ?? 0,
        variantId: it.variantId,
        quantity: it.quantity,
      })),
    });
    setSavedImageUrl(bundle.imageUrl ?? null);
    setImageFile(null);
    setRemoveSavedImage(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, bundles, variantToProduct]);

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      const payload = {
        name: data.name,
        description: data.description || null,
        bundlePrice: data.bundlePrice,
        isActive: data.isActive,
        items: data.items.map(it => ({ variantId: it.variantId, quantity: it.quantity })),
      };

      let bundleId: number;
      if (isEdit) {
        await updateMutation.mutateAsync({ id: Number(id), data: payload });
        bundleId = Number(id);
      } else {
        const created = await createMutation.mutateAsync({ data: payload });
        bundleId = created.id;
        setSavedImageUrl(created.imageUrl ?? null);
      }

      // Image management (stored in the database, uploaded separately)
      if (imageFile) {
        await uploadImageMutation.mutateAsync({ id: bundleId, data: { image: imageFile } });
      } else if (isEdit && removeSavedImage) {
        await deleteImageMutation.mutateAsync({ id: bundleId });
      }

      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/bundles'] });
      toast({ title: isEdit ? 'تم تحديث الباقة بنجاح' : 'تمت إضافة الباقة بنجاح' });
      setLocation('/dashboard/bundles');
    } catch (err: any) {
      toast({ title: err.message ?? 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (savedImageUrl) setRemoveSavedImage(true);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 font-serif">{isEdit ? 'تعديل الباقة' : 'باقة هدايا جديدة'}</h2>
        <p className="text-gray-500 mt-1">املأ منتجات متعددة باقة موحدة للعميل</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">اسم الباقة</Label>
              <Input id="name" {...register('name')} placeholder="مثال: طقم العطور الملكي" />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bundlePrice">السعر الإجمالي</Label>
              <Input id="bundlePrice" type="number" {...register('bundlePrice')} placeholder="0.00" />
              {errors.bundlePrice && <p className="text-xs text-red-500">{errors.bundlePrice.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">الوصف (اختياري)</Label>
            <Input id="description" {...register('description')} placeholder="وصف قصير يظهر في المتجر" />
          </div>

          <div className="space-y-2">
            <Label>صورة الباقة</Label>
            <div className="flex items-center gap-4">
              <div className="w-40 h-28 rounded-lg border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                {previewUrl ? (
                  <img src={previewUrl} alt="معاينة" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                )}
              </div>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                  {savedImageUrl || imageFile ? 'تغيير الصورة' : 'اختيار صورة'}
                </Button>
                {(savedImageUrl || imageFile) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-2 text-red-500 hover:text-red-600"
                    onClick={clearImage}
                  >
                    <X className="w-4 h-4" />
                    إزالة الصورة
                  </Button>
                )}
                <p className="text-xs text-gray-400">تُحفظ الصورة في قاعدة البيانات (حتى 5 MB)</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImageFile(file);
                    setRemoveSavedImage(false);
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label className="text-sm">الباقة مفعلة في المتجر</Label>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base font-bold text-gray-900">عناصر الباقة</Label>
            <Button type="button" variant="outline" size="sm" className="flex items-center gap-2" onClick={() => append({ productId: 0, variantId: 0, quantity: 1 })}>
              <Plus className="w-4 h-4" />
              إضافة عنصر
            </Button>
          </div>
          {errors.items && <p className="text-xs text-red-500">{errors.items.message}</p>}

          <div className="space-y-3">
            {fields.map((field, index) => {
              const selectedProductId = Number(items?.[index]?.productId ?? 0);
              const selectedProduct = products.find(p => p.id === selectedProductId);
              return (
                <div key={field.id} className="flex flex-col md:flex-row gap-3 md:items-end border border-gray-100 rounded-lg p-3">
                  <div className="flex-1 space-y-1">
                    <Controller
                      control={control}
                      name={`items.${index}.productId`}
                      render={({ field: f }) => (
                        <select
                          value={f.value ?? ''}
                          onChange={(e) => { f.onChange(Number(e.target.value)); }}
                          className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
                        >
                          <option value="">اختر المنتج...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      )}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <Controller
                      control={control}
                      name={`items.${index}.variantId`}
                      render={({ field: f }) => (
                        <select
                          value={f.value ?? ''}
                          onChange={(e) => f.onChange(Number(e.target.value))}
                          disabled={!selectedProduct}
                          className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm disabled:opacity-50"
                        >
                          <option value="">اختر الخيار...</option>
                          {(selectedProduct?.variants ?? []).map(v => (
                            <option key={v.id} value={v.id}>{v.variantLabel}</option>
                          ))}
                        </select>
                      )}
                    />
                  </div>
                  <div className="w-28 space-y-1">
                    <Controller
                      control={control}
                      name={`items.${index}.quantity`}
                      render={({ field: f }) => (
                        <Input type="number" min={1} value={f.value} onChange={(e) => f.onChange(Number(e.target.value))} className="text-center" />
                      )}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-gray-400 hover:text-red-500 shrink-0" onClick={() => remove(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
            {fields.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">لا توجد عناصر — أضف عنصراً</p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={submitting} className="flex items-center gap-2">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            {isEdit ? 'حفظ التعديل' : 'إنشاء الباقة'}
          </Button>
          <Button type="button" variant="outline" onClick={() => setLocation('/dashboard/bundles')}>
            إلغاء
          </Button>
        </div>
      </form>
    </div>
  );
}