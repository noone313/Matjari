export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center px-6 max-w-md">
        <h1 className="text-4xl font-bold font-serif text-foreground mb-4">متجري</h1>
        <p className="text-muted-foreground leading-relaxed mb-8">
          تسوق أحدث العطور ومستحضرات العناية بالبشرة والمكياج
        </p>
        <p className="text-sm text-muted-foreground">
          للدخول إلى متجرك، انتقل إلى رابط المتجر الخاص بك
        </p>
      </div>
    </div>
  );
}
