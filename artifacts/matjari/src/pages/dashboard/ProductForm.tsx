import React, { useEffect, useRef } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLocation, useParams } from 'wouter';
import { useCreateProduct, useUpdateProduct, useGetProduct } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CATEGORIES } from '@/lib/utils';
import { Trash2, Plus } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

const variantSchema = z.object({
  variantLabel: z.string().min(1, 'مطلوب'),
  price: z.coerce.number().min(0),
  stock: z.coerce.number().min(0).default(100)
});

const schema = z.object({
  name: z.string().min(2, 'اسم المنتج مطلوب'),
  description: z.string().optional().nullable(),
  category: z.string().min(1, 'الفئة مطلوبة'),
  imageUrlsString: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  // Fragrance
  noteTop: z.string().optional().nullable(),
  noteHeart: z.string().optional().nullable(),
  noteBase: z.string().optional().nullable(),
  // Skincare/Makeup
  skinType: z.string().optional().nullable(),
  ingredients: z.string().optional().nullable(),
  batchExpiry: z.string().optional().nullable(),
  variants: z.array(variantSchema).min(1, 'يجب إضافة خيار واحد على الأقل (مثل الحجم أو السعة)')
});

export default function ProductForm() {
  const [, setLocation] = useLocation();
  const { id } = useParams();
  const isEdit = !!id && id !== 'new';
  const { toast } = useToast();

  const { data: product, isLoading: isLoadingProduct } = useGetProduct(Number(id), { 
    query: { enabled: isEdit, queryKey: ['product', id] } 
  });
  
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      category: 'perfume_women',
      imageUrlsString: '',
      isActive: true,
      variants: [{ variantLabel: 'الافتراضي', price: 0, stock: 100 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'variants'
  });

  const categoryWatch = form.watch('category');
  const isFragrance = categoryWatch === 'perfume_men' || categoryWatch === 'perfume_women' || categoryWatch === 'oud';
  const isSkincare = categoryWatch === 'skincare' || categoryWatch === 'makeup';

  useEffect(() => {
    if (isEdit && product) {
      form.reset({
        name: product.name,
        description: product.description,
        category: product.category,
        imageUrlsString: product.imageUrls?.join(', '),
        isActive: product.isActive,
        noteTop: product.noteTop,
        noteHeart: product.noteHeart,
        noteBase: product.noteBase,
        skinType: product.skinType,
        ingredients: product.ingredients,
        batchExpiry: product.batchExpiry,
        variants: product.variants.map(v => ({ variantLabel: v.variantLabel, price: v.price, stock: v.stock }))
      });
    }
  }, [product, isEdit, form]);

  const onSubmit = (data: z.infer<typeof schema>) => {
    const payload = {
      ...data,
      imageUrls: data.imageUrlsString ? data.imageUrlsString.split(',').map(u => u.trim()).filter(Boolean) : []
    };
    // @ts-ignore
    delete payload.imageUrlsString;

    if (isEdit) {
      updateMutation.mutate({ id: Number(id), data: payload as any }, {
        onSuccess: () => {
          toast({ title: 'تم التحديث بنجاح' });
          setLocation('/dashboard/products');
        }
      });
    } else {
      createMutation.mutate({ data: payload as any }, {
        onSuccess: () => {
          toast({ title: 'تم الإضافة بنجاح' });
          setLocation('/dashboard/products');
        }
      });
    }
  };

  if (isEdit && isLoadingProduct) return <div>جاري التحميل...</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 font-serif">{isEdit ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2">المعلومات الأساسية</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>اسم المنتج</Label>
              <Input {...form.register('name')} />
              {form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}
            </div>
            
            <div className="space-y-2">
              <Label>الفئة</Label>
              <select {...form.register('category')} className="w-full h-10 px-3 py-2 rounded-md border border-input bg-background text-sm">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>الوصف</Label>
            <Textarea {...form.register('description')} rows={4} />
          </div>

          <div className="space-y-2">
            <Label>روابط الصور (مفصولة بفاصلة)</Label>
            <Input {...form.register('imageUrlsString')} dir="ltr" className="text-left" placeholder="https://..., https://..." />
            <p className="text-xs text-gray-500">أضف روابط الصور الخاصة بالمنتج.</p>
          </div>

          <div className="flex items-center space-x-2 space-x-reverse">
            <Switch checked={form.watch('isActive')} onCheckedChange={(val) => form.setValue('isActive', val)} />
            <Label>نشط (يظهر للعملاء)</Label>
          </div>
        </div>

        {/* Dynamic Fields based on Category */}
        {(isFragrance || isSkincare) && (
          <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-gray-900 border-b pb-2">تفاصيل إضافية</h3>
            
            {isFragrance && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>المقدمة (القمة)</Label>
                  <Input {...form.register('noteTop')} placeholder="مثال: ليمون، برغموت" />
                </div>
                <div className="space-y-2">
                  <Label>القلب</Label>
                  <Input {...form.register('noteHeart')} placeholder="مثال: ياسمين، ورد" />
                </div>
                <div className="space-y-2">
                  <Label>القاعدة</Label>
                  <Input {...form.register('noteBase')} placeholder="مثال: عود، مسك" />
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

        {/* Variants */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-lg font-bold text-gray-900">الخيارات (السعر والمخزون)</h3>
            <Button type="button" variant="outline" size="sm" onClick={() => append({ variantLabel: '', price: 0, stock: 100 })}>
              <Plus className="w-4 h-4 ml-1" /> إضافة خيار
            </Button>
          </div>
          
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="flex flex-col md:flex-row gap-4 items-start md:items-end p-4 bg-gray-50 border border-gray-100 rounded-lg">
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
                <Button type="button" variant="ghost" className="h-10 text-red-500 hover:text-red-700 md:mt-auto" onClick={() => remove(index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {form.formState.errors.variants?.root && <p className="text-sm text-red-500">{form.formState.errors.variants.root.message}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => setLocation('/dashboard/products')}>إلغاء</Button>
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {isEdit ? 'حفظ التعديلات' : 'إضافة المنتج'}
          </Button>
        </div>
      </form>
    </div>
  );
}
