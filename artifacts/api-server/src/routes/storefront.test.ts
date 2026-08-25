import { describe, it, expect, vi } from 'vitest';
import { computeDiscountAmount, setCache, normalizePhone, mapStatusToArabic } from '../lib/helpers';

// ─── computeDiscountAmount ─────────────────────────────────────────────────
describe('computeDiscountAmount', () => {
  const makeDiscount = (overrides: Record<string, any> = {}) => ({
    percentOff: null,
    amountOff: null,
    minOrderTotal: null,
    ...overrides,
  });

  it('يعيد null إذا لم يكن هناك خصم', () => {
    expect(computeDiscountAmount(makeDiscount(), 10000)).toBeNull();
  });

  it('يخصم نسبة مئوية', () => {
    expect(computeDiscountAmount(makeDiscount({ percentOff: 10 }), 10000)).toBe(1000);
    expect(computeDiscountAmount(makeDiscount({ percentOff: 50 }), 200)).toBe(100);
  });

  it('يخصم مبلغ ثابت', () => {
    expect(computeDiscountAmount(makeDiscount({ amountOff: 5000 }), 10000)).toBe(5000);
  });

  it('amountOff لا يتجاوز المجموع الفرعي', () => {
    expect(computeDiscountAmount(makeDiscount({ amountOff: 20000 }), 10000)).toBe(10000);
  });

  it('يرجع null إذا لم يصل للحد الأدنى', () => {
    expect(computeDiscountAmount(makeDiscount({ minOrderTotal: 15000, amountOff: 2000 }), 10000)).toBeNull();
  });

  it('يطبّق الخصم عند الوصول للحد الأدنى', () => {
    expect(computeDiscountAmount(makeDiscount({ minOrderTotal: 10000, amountOff: 2000 }), 10000)).toBe(2000);
  });

  it(' процентOff يُقرب لأقرب عدد صحيح', () => {
    expect(computeDiscountAmount(makeDiscount({ percentOff: 33 }), 100)).toBe(33);
  });

  it('amountOff يفضّل على percentOff', () => {
    const d = makeDiscount({ amountOff: 1000, percentOff: 50 });
    expect(computeDiscountAmount(d, 10000)).toBe(1000);
  });

  it('يتعامل مع subtotal صفر', () => {
    expect(computeDiscountAmount(makeDiscount({ percentOff: 10 }), 0)).toBe(0);
    expect(computeDiscountAmount(makeDiscount({ amountOff: 100 }), 0)).toBe(0);
  });
});

// ─── setCache ───────────────────────────────────────────────────────────────
describe('setCache', () => {
  it('يضبط Cache-Control header', () => {
    const res = { set: vi.fn() };
    setCache(res, 60);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=60, s-maxage=60');
  });

  it('يعمل مع مدة 0', () => {
    const res = { set: vi.fn() };
    setCache(res, 0);
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'public, max-age=0, s-maxage=0');
  });
});

// ─── normalizePhone ─────────────────────────────────────────────────────────
describe('normalizePhone', () => {
  it('يمسح كل الأحرف غير الرقمية', () => {
    expect(normalizePhone('+964 (770) 476-0548')).toBe('9647704760548');
    expect(normalizePhone('0770-abc-123')).toBe('0770123');
  });

  it('يترك الأرقام كما هي', () => {
    expect(normalizePhone('07704760548')).toBe('07704760548');
  });

  it('يعامل نص فارغ', () => {
    expect(normalizePhone('')).toBe('');
  });
});

// ─── mapStatusToArabic ──────────────────────────────────────────────────────
describe('mapStatusToArabic', () => {
  it('يحول كل الحالات المعروفة', () => {
    expect(mapStatusToArabic('new')).toBe('جديد');
    expect(mapStatusToArabic('processing')).toBe('قيد التجهيز');
    expect(mapStatusToArabic('shipped')).toBe('تم الشحن');
    expect(mapStatusToArabic('delivered')).toBe('تم التسليم');
    expect(mapStatusToArabic('cancelled')).toBe('ملغي');
  });

  it('يرجع القيمة الأصلية لحالة غير معروفة', () => {
    expect(mapStatusToArabic('unknown')).toBe('unknown');
  });
});
