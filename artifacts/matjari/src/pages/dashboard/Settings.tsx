import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { getApiUrl } from '@/lib/utils';
import {
  useGetDashboardSettings,
  useUpdateDashboardSettings,
  useListHeroSlides,
  useCreateHeroSlide,
  useUpdateHeroSlide,
  useDeleteHeroSlide,
  useUploadHeroSlideImage,
  useDeleteHeroSlideImage,
  getListHeroSlidesQueryKey,
} from '@workspace/api-client-react';
import type { HeroSlide } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ImagePlus, Trash2, ArrowUp, ArrowDown, Upload, X, ImageOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DetailPanelSkeleton } from '@/components/skeletons';

const schema = z.object({
  storeName: z.string().min(2, 'مطلوب'),
  description: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  bannerUrl: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  instagramHandle: z.string().optional().nullable(),
  whatsappNumber: z.string().optional().nullable(),
  bankTransferInfo: z.string().optional().nullable(),
  accentColor: z.string().default('43 74% 49%'),
});

function HeroGallerySection() {
  const { data: settings } = useGetDashboardSettings();
  const updateSettings = useUpdateDashboardSettings();
  const { data, isLoading } = useListHeroSlides();
  const createSlide = useCreateHeroSlide();
  const updateSlide = useUpdateHeroSlide();
  const deleteSlide = useDeleteHeroSlide();
  const uploadImage = useUploadHeroSlideImage();
  const deleteImage = useDeleteHeroSlideImage();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const slides = data?.slides ?? [];
  const ordered = [...slides].sort((a, b) => a.position - b.position);
  const heroEnabled = settings?.heroEnabled ?? false;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListHeroSlidesQueryKey() });

  const toggleHero = (enabled: boolean) => {
    updateSettings.mutate(
      { data: { heroEnabled: enabled } },
      { onSuccess: () => toast({ title: enabled ? 'تم تفعيل معرض الصور' : 'تم إخفاء معرض الصور' }) },
    );
  };

  const addSlide = () => {
    createSlide.mutate(
      { data: {} },
      { onSuccess: () => { invalidate(); toast({ title: 'تمت إضافة شريحة جديدة — ارفع صورة لها' }); } },
    );
  };

  const updateField = (id: number, patch: Partial<{ title: string | null; subtitle: string | null; linkUrl: string | null }>) => {
    updateSlide.mutate({ id, data: patch }, { onSuccess: invalidate });
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = ordered[index + dir];
    if (!target) return;
    updateSlide.mutate({ id: ordered[index].id, data: { position: target.position } });
    updateSlide.mutate({ id: target.id, data: { position: ordered[index].position } });
    setTimeout(invalidate, 300);
  };

  const remove = (slide: HeroSlide) => {
    if (!window.confirm('حذف هذه الشريحة نهائياً؟')) return;
    deleteSlide.mutate(
      { id: slide.id },
      { onSuccess: () => { invalidate(); toast({ title: 'تم حذف الشريحة' }); } },
    );
  };

  const onFile = (slide: HeroSlide, file?: File | null) => {
    if (!file) return;
    uploadImage.mutate(
      { id: slide.id, data: { image: file } },
      { onSuccess: () => { invalidate(); toast({ title: 'تم رفع الصورة' }); } },
    );
  };

  const removeImage = (slide: HeroSlide) => {
    deleteImage.mutate(
      { id: slide.id },
      { onSuccess: () => { invalidate(); toast({ title: 'تم حذف الصورة' }); } },
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">معرض الصور العلوي (Hero)</h3>
          <p className="text-sm text-gray-500 mt-1">
            يظهر كمعرض صور متحرك في أعلى صفحة متجرك فوق المنتجات
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{heroEnabled ? 'ظاهر للعملاء' : 'مخفي'}</span>
          <Switch checked={heroEnabled} onCheckedChange={toggleHero} />
        </div>
      </div>

      {heroEnabled && (
        <>
          {isLoading ? (
            <div className="space-y-4 py-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                  <Skeleton className="w-28 h-20 rounded-lg bg-gray-100" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-9 w-full rounded-md bg-gray-100" />
                    <Skeleton className="h-9 w-2/3 rounded-md bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
          ) : ordered.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500 border border-dashed border-gray-200 rounded-lg">
              لا توجد شرائح بعد — أضف شريحة وارفع لها صورة لعرضها للعملاء
            </div>
          ) : (
            <ul className="space-y-4">
              {ordered.map((slide, index) => (
                <li key={slide.id} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex items-start gap-4">
                    <div className="w-36 h-24 rounded-md overflow-hidden bg-zinc-100 flex items-center justify-center shrink-0">
                      {slide.imageUrl ? (
                        <img src={getApiUrl(slide.imageUrl)} alt={slide.title ?? ''} className="w-full h-full object-cover" />
                      ) : (
                        <ImagePlus className="w-6 h-6 text-zinc-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <Label>العنوان (اختياري)</Label>
                        <Input
                          defaultValue={slide.title ?? ''}
                          onBlur={(e) => updateField(slide.id, { title: e.target.value || null })}
                          placeholder="مثال: تشكيلة عود جديدة"
                        />
                      </div>
                      <div>
                        <Label>الوصف المختصر (اختياري)</Label>
                        <Input
                          defaultValue={slide.subtitle ?? ''}
                          onBlur={(e) => updateField(slide.id, { subtitle: e.target.value || null })}
                          placeholder="سطر يظهر فوق الصورة"
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-md cursor-pointer transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          {slide.imageUrl ? 'استبدال الصورة' : 'رفع صورة'}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => onFile(slide, e.target.files?.[0])}
                          />
                        </label>
                        {slide.imageUrl && (
                          <button
                            onClick={() => removeImage(slide)}
                            className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-red-50 hover:text-red-600 px-3 py-2 rounded-md transition-colors"
                          >
                            <ImageOff className="w-3.5 h-3.5" />
                            حذف الصورة
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <Button variant="ghost" size="icon" disabled={index === 0} onClick={() => move(index, -1)} title="تحريك لأعلى">
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" disabled={index === ordered.length - 1} onClick={() => move(index, 1)} title="تحريك لأسفل">
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => remove(slide)} title="حذف الشريحة">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <div>
            <Button type="button" variant="outline" onClick={addSlide} disabled={createSlide.isPending}>
              <ImagePlus className="w-4 h-4 ml-2" />
              إضافة شريحة
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default function Settings() {
  const { data: settings, isLoading } = useGetDashboardSettings();
  const updateSettings = useUpdateDashboardSettings();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      storeName: '',
      description: '',
      logoUrl: '',
      bannerUrl: '',
      phone: '',
      instagramHandle: '',
      whatsappNumber: '',
      bankTransferInfo: '',
      accentColor: '43 74% 49%',
    }
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        storeName: settings.storeName,
        description: settings.description,
        logoUrl: settings.logoUrl,
        bannerUrl: settings.bannerUrl,
        phone: settings.phone,
        instagramHandle: settings.instagramHandle,
        whatsappNumber: settings.whatsappNumber,
        bankTransferInfo: settings.bankTransferInfo,
        accentColor: settings.accentColor || '43 74% 49%',
      });
    }
  }, [settings, form]);

  const onSubmit = (data: z.infer<typeof schema>) => {
    updateSettings.mutate({ data }, {
      onSuccess: () => {
        toast({ title: 'تم حفظ الإعدادات' });
      }
    });
  };

  if (isLoading) return <div className="pt-8"><DetailPanelSkeleton /></div>;

  return (
    <div className="space-y-8 max-w-3xl pb-16">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 font-serif">إعدادات المتجر</h2>
        <p className="text-gray-500 mt-1">تخصيص هوية متجرك وطرق الدفع</p>
      </div>

      <HeroGallerySection />

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2">الهوية البصرية</h3>
          
          <div className="space-y-2">
            <Label>اسم المتجر</Label>
            <Input {...form.register('storeName')} />
          </div>

          <div className="space-y-2">
            <Label>وصف المتجر (يظهر تحت الاسم)</Label>
            <Textarea {...form.register('description')} rows={3} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>رابط الشعار (Logo URL)</Label>
              <Input {...form.register('logoUrl')} dir="ltr" className="text-left" />
            </div>
            <div className="space-y-2">
              <Label>رابط الغلاف (Banner URL)</Label>
              <Input {...form.register('bannerUrl')} dir="ltr" className="text-left" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>لون المتجر (HSL)</Label>
            <Input {...form.register('accentColor')} dir="ltr" className="text-left" placeholder="43 74% 49%" />
            <p className="text-xs text-gray-500">ادخل قيم HSL مفصولة بمسافة (الافتراضي للذهبي: 43 74% 49%)</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm space-y-6">
          <h3 className="text-lg font-bold text-gray-900 border-b pb-2">التواصل والدفع</h3>
          
          <div className="space-y-2">
            <Label>رقم الهاتف للطلبات (اختياري)</Label>
            <Input {...form.register('phone')} dir="ltr" className="text-left" placeholder="+964..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>حساب انستقرام (اختياري)</Label>
              <Input {...form.register('instagramHandle')} dir="ltr" className="text-left" placeholder="@" />
              <p className="text-xs text-gray-500">سيظهر أيقونة انستقرام بالمتجر العام إن أُدخل</p>
            </div>
            <div className="space-y-2">
              <Label>رقم واتساب (اختياري)</Label>
              <Input {...form.register('whatsappNumber')} dir="ltr" className="text-left" placeholder="+964..." />
              <p className="text-xs text-gray-500">سيظهر زر واتساب بالمتجر العام إن أُدخل</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>معلومات التحويل البنكي (تظهر للعميل عند الدفع)</Label>
            <Textarea {...form.register('bankTransferInfo')} rows={4} placeholder="اسم البنك: ...\nرقم الحساب: ..." />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateSettings.isPending}>
            حفظ التعديلات
          </Button>
        </div>
      </form>
    </div>
  );
}
