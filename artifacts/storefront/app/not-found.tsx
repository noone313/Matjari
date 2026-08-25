import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-6">
        <h1 className="text-6xl font-bold font-serif text-foreground mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">الصفحة غير موجودة</p>
        <Link
          href="/"
          className="inline-flex items-center px-6 py-3 bg-foreground text-background font-bold rounded-lg hover:opacity-90 transition-opacity"
        >
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
