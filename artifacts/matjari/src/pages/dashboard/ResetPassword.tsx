import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { customFetch } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ResetPassword() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Read token from URL query param: /reset-password?token=abc123
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-sans">
        <div className="max-w-md w-full bg-white p-8 border border-gray-200 rounded-lg shadow-sm text-center">
          <h1 className="text-3xl font-bold font-serif text-gray-900 mb-4">متجري</h1>
          <p className="text-gray-500 mb-6">رابط إعادة التعيين غير صالح أو منتهي الصلاحية.</p>
          <Link href="/forgot-password" className="text-primary font-medium hover:underline">
            طلب رابط جديد
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    if (password.length < 6) {
      setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
      return;
    }

    setLoading(true);
    try {
      await customFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      setLocation('/login?reset=success');
    } catch (err: any) {
      setError(err?.data?.error || 'حدث خطأ، يرجى المحاولة مجدداً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-sans">
      <div className="max-w-md w-full bg-white p-8 border border-gray-200 rounded-lg shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-serif text-gray-900 mb-2">متجري</h1>
          <p className="text-gray-500">كلمة مرور جديدة</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">كلمة المرور الجديدة</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="text-left"
              dir="ltr"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="text-left"
              dir="ltr"
            />
          </div>

          <Button type="submit" className="w-full h-12 text-lg font-medium" disabled={loading}>
            {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <Link href="/login" className="text-primary font-medium hover:underline">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
