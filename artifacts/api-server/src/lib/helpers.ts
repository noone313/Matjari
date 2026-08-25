/**
 * Pure helper functions extracted from storefront routes for unit testing.
 */

export function computeDiscountAmount(
  discount: { percentOff?: number | null; amountOff?: number | null; minOrderTotal?: number | null },
  subtotal: number,
): number | null {
  if (discount.minOrderTotal != null && subtotal < discount.minOrderTotal) return null;
  if (discount.amountOff != null) return Math.min(discount.amountOff, subtotal);
  if (discount.percentOff != null) return Math.round((subtotal * discount.percentOff) / 100);
  return null;
}

export function setCache(res: { set: (key: string, value: string) => void }, seconds: number) {
  res.set('Cache-Control', `public, max-age=${seconds}, s-maxage=${seconds}`);
}

export function normalizePhone(value: string): string {
  return value.replace(/[^\d]/g, '');
}

export function mapStatusToArabic(status: string): string {
  const map: Record<string, string> = {
    new: 'جديد',
    processing: 'قيد التجهيز',
    shipped: 'تم الشحن',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
  };
  return map[status] ?? status;
}
