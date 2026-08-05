import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useGetDashboardSettings, useUpdateDashboardSettings } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const schema = z.object({
  storeName: z.string().min(2, 'مطلوب'),
  description: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  bannerUrl: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  instagramHandle: z.string().optional().nullable(),
  whatsappNumber: z.string().optional().nullable(),
  bankTransferInfo: z.string().optional().nullable(),
  accentColor: z.string().default('43 74% 49%'), // Provide an HSL value text field or color picker simplified
});

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
        // update local auth context if needed, but the hook invalidates ideally
      }
    });
  };

  if (isLoading) return <div>جاري التحميل...</div>;

  return (
    <div className="space-y-8 max-w-3xl pb-16">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 font-serif">إعدادات المتجر</h2>
        <p className="text-gray-500 mt-1">تخصيص هوية متجرك وطرق الدفع</p>
      </div>

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
