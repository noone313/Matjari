import React, { useState } from 'react';
import { Link } from 'wouter';
import { customFetch } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await customFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
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
          <p className="text-gray-500">إعادة تعيين كلمة المرور</p>
        </div>

        {submitted ? (
          <div className="text-center space-y-4">
            <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              إذا كان البريد مسجلاً، ستتلقى رسالة لإعادة تعيين كلمة المرور.
              <br />
              تحقق من صندوق البريد (و مجلد Spam).
            </div>
            <Link href="/login" className="text-primary font-medium hover:underline text-sm inline-block mt-4">
              العودة لتسجيل الدخول
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-6 text-center">
              أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-left"
                  dir="ltr"
                />
              </div>

              <Button type="submit" className="w-full h-12 text-lg font-medium" disabled={loading}>
                {loading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              تذكرت كلمة المرور؟{' '}
              <Link href="/login" className="text-primary font-medium hover:underline">
                تسجيل الدخول
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
