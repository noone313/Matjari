import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useLocation } from 'wouter';
import { useRegisterMerchant } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  storeName: z.string().min(2, 'اسم المتجر يجب أن يكون حرفين على الأقل'),
  slug: z.string().min(3, 'الرابط يجب أن يكون 3 أحرف على الأقل').regex(/^[a-z0-9-]+$/, 'فقط حروف إنجليزية صغيرة، أرقام، وشرطة (-)'),
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegisterMerchant();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { storeName: '', slug: '', email: '', password: '' },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    registerMutation.mutate({ data }, {
      onSuccess: (res) => {
        login(res.token, res.merchant);
        toast({ title: 'تم إنشاء الحساب بنجاح' });
        setLocation('/dashboard');
      },
      onError: (err: any) => {
        toast({
          title: 'فشل إنشاء الحساب',
          description: err.data?.error || 'حدث خطأ غير متوقع',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8 font-sans">
      <div className="max-w-md w-full bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-serif text-gray-900 mb-2">متجري</h1>
          <p className="text-gray-500">إنشاء متجر جديد</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="storeName">اسم المتجر</Label>
            <Input id="storeName" {...form.register('storeName')} />
            {form.formState.errors.storeName && <p className="text-sm text-red-500">{form.formState.errors.storeName.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">رابط المتجر (Slug)</Label>
            <div className="flex text-left" dir="ltr">
              <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm rounded-l-md">
                .matjari.iq
              </span>
              <Input id="slug" {...form.register('slug')} className="rounded-l-none" placeholder="mystore" />
            </div>
            {form.formState.errors.slug && <p className="text-sm text-red-500">{form.formState.errors.slug.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني</Label>
            <Input id="email" type="email" {...form.register('email')} className="text-left" dir="ltr" />
            {form.formState.errors.email && <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور</Label>
            <Input id="password" type="password" {...form.register('password')} className="text-left" dir="ltr" />
            {form.formState.errors.password && <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>}
          </div>

          <Button type="submit" className="w-full h-12 text-lg font-medium mt-2" disabled={registerMutation.isPending}>
            {registerMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء المتجر'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          لديك حساب بالفعل؟{' '}
          <Link href="/login" className="text-primary font-medium hover:underline">
            تسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
