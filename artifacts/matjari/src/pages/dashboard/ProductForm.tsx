import React, { useEffect, useRef, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocation, useParams } from 'wouter';
import { useGetProduct, useCreateProduct, useUpdateProduct, useListStockNotifications, useUpdateStockNotification, getListStockNotificationsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getApiUrl } from '@/lib/utils';
import { useListDashboardCategories } from '@/hooks/useCategories';
import { Trash2, Plus, Upload, X, Loader2, BellRing, Phone } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { DetailPanelSkeleton } from '@/components/skeletons';

// ─── Schema ────────────────────────────────────────────────────────────────────
const variantSchema = z.object({
  variantLabel: z.string().min(1, 'مطلوب'),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().min(0).default(100),
});

const schema = z.object({
  name: z.string().min(2, 'اسم المنتج مطلوب'),
  description: z.string().optional().nullable(),
  category: z.string().min(1, 'الفئة مطلوبة'),
  isActive: z.boolean().default(true),
  noteTop: z.string().optional().nullable(),
  noteHeart: z.string().optional().nullable(),
  noteBase: z.string().optional().nullable(),
  skinType: z.string().optional().nullable(),
  ingredients: z.string().optional().nullable(),
  batchExpiry: z.string().optional().nullable(),
  variants: z.array(variantSchema).min(1, 'يجب إضافة خيار واحد على الأقل'),
});
type FormValues = z.infer<typeof schema>;

// ─── ImageUploader ─────────────────────────────────────────────────────────────
/** Tracks existing saved URLs + new local File objects together */
type ImageEntry = { kind: 'saved'; url: string } | { kind: 'new'; file: File; preview: string };

function ImageUploader({
  initial,
  onChange,
}: {
  initial: string[];
  onChange: (saved: string[], files: File[]) => void;
}) {
  const [entries, setEntries] = useState<ImageEntry[]>(() =>
    initial.map((url) => ({ kind: 'saved', url }))
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync when initial changes (edit load)
  useEffect(() => {
    setEntries(initial.map((url) => ({ kind: 'saved', url })));
  }, [initial.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const notify = (next: ImageEntry[]) => {
    const saved = next.filter((e): e is Extract<ImageEntry, { kind: 'saved' }> => e.kind === 'saved').map((e) => e.url);
    const files = next.filter((e): e is Extract<ImageEntry, { kind: 'new' }> => e.kind === 'new').map((e) => e.file);
    onChange(saved, files);
  };

  const addFiles = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const next: ImageEntry[] = [
      ...entries,
      ...Array.from(fileList).map((file) => ({
        kind: 'new' as const,
        file,
        preview: URL.createObjectURL(file),
      })),
    ];
    setEntries(next);
    notify(next);
  };

  const remove = (idx: number) => {
    const entry = entries[idx];
    if (entry.kind === 'new') URL.revokeObjectURL(entry.preview);
    const next = entries.filter((_, i) => i !== idx);
    setEntries(next);
    notify(next);
  };

  return (
    <div className="space-y-3">
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {entries.map((entry, i) => {
            const src = entry.kind === 'saved'
              ? (entry.url.startsWith('/api/') ? getApiUrl(entry.url) : entry.url)
              : entry.preview;
            return (
              <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-zinc-200 group">
                <img src={src} alt="" className="w-full h-full object-cover" />
                {entry.kind === 'new' && (
                  <div className="absolute bottom-0 inset-x-0 bg-amber-500/80 text-white text-[9px] text-center py-0.5">جديدة</div>
                )}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="absolute top-1 right-1 bg-white/90 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                >
                  <X className="w-3.5 h-3.5 text-red-500" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2 border border-dashed border-zinc-300 rounded-lg text-sm text-zinc-500 hover:border-zinc-500 hover:text-zinc-700 transition-colors"
      >
        <Upload className="w-4 h-4" />
        اختر صورة
      </button>
    </div>
  );
}

// ─── ProductForm ───────────────────────────────────────────────────────────────
export default function ProductForm() {
  const [, setLocation] = useLocation();
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: categories } = useListDashboardCategories();

  const [savedUrls, setSavedUrls] = useState<string[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: product, isLoading } = useGetProduct(Number(id), {
    query: { enabled: isEdit, queryKey: ['product', id] },
  });

  const notificationsParams = isEdit && product ? { productId: product.id } : undefined;
  const { data: notificationsData, refetch: refetchNotifications } = useListStockNotifications(
    notificationsParams,
    {
      query: {
        enabled: isEdit && !!product,
        queryKey: getListStockNotificationsQueryKey(notificationsParams),
      },
    },
  );
  const updateNotification = useUpdateStockNotification();

  const markContacted = (notificationId: number) => {
    updateNotification.mutate(
      { id: notificationId, data: { notified: true } },
      {
        onSuccess: () => refetchNotifications(),
        onError: () => toast({ title: 'تعذر التحديث', variant: 'destructive' }),
      },
    );
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      category: 'perfume_women',
      isActive: true,
      variants: [{ variantLabel: 'الافتراضي', price: 0, stock: 100 }],
    },
  });
  const formVariants = form.watch('variants');

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'variants' });
  const categoryWatch = form.watch('category');
  const isFragrance = ['perfume_men', 'perfume_women', 'oud'].includes(categoryWatch);
  const isSkincare = ['skincare', 'makeup'].includes(categoryWatch);

  // Generated Orval multipart hooks — they build the FormData (data + keepUrls + images)
  // from the documented ProductCreateBody / ProductUpdateBody, so no manual fetch.
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();

  useEffect(() => {
    if (isEdit && product) {
      form.reset({
        name: product.name,
        description: product.description,
        category: product.category,
        isActive: product.isActive,
        noteTop: product.noteTop,
        noteHeart: product.noteHeart,
        noteBase: product.noteBase,
        skinType: product.skinType,
        ingredients: product.ingredients,
        batchExpiry: product.batchExpiry,
        variants: product.variants.map((v) => ({
          variantLabel: v.variantLabel,
          price: v.price,
          stock: v.stock,
        })),
      });
      setSavedUrls(product.imageUrls ?? []);
    }
  }, [product, isEdit]); // eslint-disable-line react-hooks/exhaustive-deps

  const onImagesChange = (saved: string[], files: File[]) => {
    setSavedUrls(saved);
    setNewFiles(files);
  };

  const onSubmit = async (data: FormValues) => {
    setSubmitting(true);
    try {
      const images = newFiles.length > 0 ? newFiles : undefined;
      if (isEdit) {
        await updateProductMutation.mutateAsync({
          id: Number(id),
          data: {
            data,
            keepUrls: JSON.stringify(savedUrls),
            images,
          },
        });
      } else {
        await createProductMutation.mutateAsync({
          data: { data, images },
        });
      }

      // Invalidate React-Query caches
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/products'] });

      toast({ title: isEdit ? 'تم التحديث بنجاح' : 'تم إضافة المنتج بنجاح' });
      setLocation('/dashboard/products');
    } catch (err: any) {
      toast({ title: err.message ?? 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && isLoading) return <div className="p-8"><DetailPanelSkeleton /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <h2 className="text-3xl font-bold text-gray-900 font-serif">
        {isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}
      </h2>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* ── Basic info ── */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2">المعلومات الأساسية</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>اسم المنتج</Label>
              <Input {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>الفئة</Label>
              <select
                {...form.register('category')}
                className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm"
              >
                {categories?.map((c) => (
                  <option key={c.id} value={c.slug}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>الوصف</Label>
            <Textarea {...form.register('description')} rows={4} />
          </div>

          {/* Images */}
          <div className="space-y-2">
            <Label>صور المنتج</Label>
            <ImageUploader initial={savedUrls} onChange={onImagesChange} />
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <Switch
              checked={form.watch('isActive')}
              onCheckedChange={(val) => form.setValue('isActive', val)}
            />
            <Label>نشط (يظهر للعملاء)</Label>
          </div>
        </div>

        {/* ── Category-specific fields ── */}
        {(isFragrance || isSkincare) && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">تفاصيل إضافية</h3>
            {isFragrance && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>المقدمة (القمة)</Label>
                  <Input {...form.register('noteTop')} placeholder="ليمون، برغموت..." />
                </div>
                <div className="space-y-2">
                  <Label>القلب</Label>
                  <Input {...form.register('noteHeart')} placeholder="ياسمين، ورد..." />
                </div>
                <div className="space-y-2">
                  <Label>القاعدة</Label>
                  <Input {...form.register('noteBase')} placeholder="عود، مسك..." />
                </div>
              </div>
            )}
            {isSkincare && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>نوع البشرة</Label>
                  <Input {...form.register('skinType')} placeholder="دهنية، جافة، مختلطة..." />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الانتهاء (اختياري)</Label>
                  <Input {...form.register('batchExpiry')} placeholder="MM/YYYY" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>المكونات</Label>
                  <Textarea {...form.register('ingredients')} rows={3} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Variants ── */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-bold text-gray-900">الخيارات (السعر والمخزون)</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ variantLabel: '', price: 0, stock: 100 })}
            >
              <Plus className="w-4 h-4 ml-1" /> إضافة خيار
            </Button>
          </div>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="flex flex-col md:flex-row flex-wrap gap-4 items-start md:items-end p-4 bg-gray-50 border border-gray-100 rounded-lg"
              >
                <div className="flex-1 w-full space-y-2">
                  <Label>الاسم (مثل: 50ml أو عبوة كبيرة)</Label>
                  <Input {...form.register(`variants.${index}.variantLabel`)} />
                </div>
                <div className="w-full md:w-32 space-y-2">
                  <Label>السعر (د.ع)</Label>
                  <Input type="number" {...form.register(`variants.${index}.price`)} />
                </div>
                <div className="w-full md:w-32 space-y-2">
                  <Label>المخزون</Label>
                  <Input type="number" {...form.register(`variants.${index}.stock`)} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 text-red-500 hover:text-red-700 md:mt-auto"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>

                {(() => {
                  if (!isEdit || !product) return null;
                  const original = product.variants.find((v) => v.variantLabel === fields[index].variantLabel);
                  if (!original || original.stock !== 0) return null;
                  const currentStockInput = Number(formVariants?.[index]?.stock ?? 0);
                  if (currentStockInput <= 0) return null;
                  const variantNotifications = (notificationsData?.notifications ?? []).filter(
                    (n) => n.variantId === original.id,
                  );
                  if (variantNotifications.length === 0) return null;
                  const pendingCount = variantNotifications.filter((n) => !n.notified).length;
                  return (
                    <div className="w-full bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <BellRing className="w-4 h-4 text-amber-600 shrink-0" />
                        <p className="text-sm font-bold text-amber-900">
                          كنت هذا الخيار غير متوفر — {pendingCount} رقم في انتظار توفر «{original.variantLabel}»
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        {variantNotifications.map((n) => (
                          <div key={n.id} className="flex items-center justify-between gap-2 text-sm">
                            <span className="flex items-center gap-2 text-gray-700" dir="ltr">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              {n.customerPhone}
                            </span>
                            {n.notified ? (
                              <span className="text-xs text-emerald-600 font-medium">تم التواصل</span>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs text-amber-700 border-amber-300 hover:bg-amber-100"
                                onClick={() => markContacted(n.id)}
                                disabled={updateNotification.isPending}
                              >
                                تم التواصل
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => setLocation('/dashboard/products')}>
            إلغاء
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <><Loader2 className="w-4 h-4 ml-2 animate-spin" /> جاري الحفظ...</>
            ) : isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}
          </Button>
        </div>
      </form>
    </div>
  );
}
