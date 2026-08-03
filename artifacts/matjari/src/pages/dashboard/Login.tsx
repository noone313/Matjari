import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Link, useLocation } from 'wouter';
import { useLoginMerchant } from '@workspace/api-client-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const schema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const loginMutation = useLoginMerchant();

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    loginMutation.mutate({ data }, {
      onSuccess: (res) => {
        login(res.token, res.merchant);
        toast({ title: 'تم تسجيل الدخول بنجاح' });
        setLocation('/dashboard');
      },
      onError: (err: any) => {
        toast({
          title: 'فشل تسجيل الدخول',
          description: err.data?.error || 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-sans">
      <div className="max-w-md w-full bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-serif text-gray-900 mb-2">متجري</h1>
          <p className="text-gray-500">تسجيل الدخول للوحة التحكم</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

          <Button type="submit" className="w-full h-12 text-lg font-medium" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? 'جاري الدخول...' : 'دخول'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          ليس لديك حساب؟{' '}
          <Link href="/register" className="text-primary font-medium hover:underline">
            سجل الآن
          </Link>
        </div>
      </div>
    </div>
  );
}
