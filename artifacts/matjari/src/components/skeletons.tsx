import { Skeleton } from '@/components/ui/skeleton';

// ── Storefront ───────────────────────────────────────────────────────────────

/** بطاقة منتج هياكلية — تطابق تصميم البطاقات في Home/Wishlist */
export function ProductCardSkeleton() {
  return (
    <div className="bg-white">
      <Skeleton className="aspect-[3/4] w-full rounded-none bg-zinc-100" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-3 w-3/4 bg-zinc-100" />
        <Skeleton className="h-3 w-1/3 bg-zinc-100" />
      </div>
    </div>
  );
}

/** شبكة منتجات هيكلية */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** هيكل صفحة المتجر كاملة أثناء تحميل بيانات المتجر (StoreLayout) */
export function StoreShellSkeleton() {
  return (
    <div aria-busy="true" aria-label="جاري التحميل">
      {/* شريط الإعلان */}
      <Skeleton className="h-10 w-full rounded-none bg-zinc-100" />
      {/* الهيدر */}
      <div className="border-b border-zinc-100 bg-white">
        <div className="max-w-screen-xl mx-auto px-3 md:px-6 py-4 flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-32 bg-zinc-100" />
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-full bg-zinc-100" />
            <Skeleton className="w-9 h-9 rounded-full bg-zinc-100" />
          </div>
        </div>
      </div>
      {/* Hero */}
      <Skeleton className="h-[52vh] min-h-[340px] w-full rounded-none bg-zinc-100" />
      {/* عنوان قسم + شبكة */}
      <div className="max-w-screen-xl mx-auto w-full px-4 md:px-6 py-10 space-y-8">
        <Skeleton className="h-6 w-44 bg-zinc-100" />
        <ProductGridSkeleton count={6} />
      </div>
    </div>
  );
}

/** هيكل صفحة المنتج (صورة مربعة + معلومات) */
export function ProductPageSkeleton() {
  return (
    <div aria-busy="true" aria-label="جاري التحميل" className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <Skeleton className="h-4 w-28 bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <div className="p-6 md:border-l border-gray-100 flex flex-col items-center">
          <Skeleton className="aspect-square w-full max-w-md rounded-lg bg-gray-100 mb-4" />
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="w-20 h-20 rounded-md bg-gray-100" />
            ))}
          </div>
        </div>
        <div className="p-6 md:p-10 space-y-5">
          <Skeleton className="h-4 w-24 bg-gray-100" />
          <Skeleton className="h-8 w-3/4 bg-gray-100" />
          <Skeleton className="h-6 w-32 bg-gray-100" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-8 w-16 rounded-full bg-gray-100" />
            <Skeleton className="h-8 w-16 rounded-full bg-gray-100" />
            <Skeleton className="h-8 w-16 rounded-full bg-gray-100" />
          </div>
          <Skeleton className="h-12 w-full rounded-md bg-gray-100" />
          <Skeleton className="h-16 w-full rounded-lg bg-gray-100" />
        </div>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────

/** صفوف جدول هيكلية — توضع مباشرة داخل tbody */
export function TableRowsSkeleton({ rows = 4, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-6 py-4">
              <Skeleton className={`h-4 bg-gray-100 ${c === 0 ? 'w-12' : c === cols - 1 ? 'w-16 mx-auto' : 'w-24'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** بطاقات إحصائيات لوحة التحكم */
export function StatCardsSkeleton() {
  return (
    <div aria-busy="true" className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-xl p-6 space-y-3 shadow-sm">
            <Skeleton className="h-3 w-20 bg-gray-100" />
            <Skeleton className="h-7 w-24 bg-gray-100" />
          </div>
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl bg-gray-100" />
    </div>
  );
}

/** لوحة تفاصيل عامة (تفاصيل الطلب / نماذج / الإعدادات) */
export function DetailPanelSkeleton() {
  return (
    <div aria-busy="true" aria-label="جاري التحميل" className="space-y-4 animate-pulse">
      <Skeleton className="h-8 w-48 bg-gray-100" />
      <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-4 shadow-sm">
        <Skeleton className="h-4 w-full bg-gray-100" />
        <Skeleton className="h-4 w-2/3 bg-gray-100" />
        <Skeleton className="h-4 w-1/2 bg-gray-100" />
        <Skeleton className="h-10 w-36 rounded-md bg-gray-100" />
      </div>
    </div>
  );
}
