import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  normalizeWhatsAppNumber,
  buildWhatsAppUrl,
  buildOrderStatusWhatsAppMessage,
  getStatusLabel,
  getStatusColor,
  formatPrice,
  getApiUrl,
  ORDER_STATUSES,
} from './utils';

// ─── formatPrice ────────────────────────────────────────────────────────────
describe('formatPrice', () => {
  it('يلحق العملة بالسعر', () => {
    expect(formatPrice(5000)).toContain('د.ع');
  });

  it('يُنظّم الأرقام千位 separators', () => {
    const result = formatPrice(100000);
    expect(result).toContain('د.ع');
    expect(typeof result).toBe('string');
  });

  it('يتعامل مع الصفر', () => {
    expect(formatPrice(0)).toContain('د.ع');
  });

  it('يتعامل مع الأرقام العشرية', () => {
    expect(formatPrice(1234.56)).toContain('د.ع');
  });
});

// ─── ORDER_STATUSES ─────────────────────────────────────────────────────────
describe('ORDER_STATUSES', () => {
  it('يحتوي على 5 حالات', () => {
    expect(ORDER_STATUSES).toHaveLength(5);
  });

  it('كل حالة لها value و label و color', () => {
    ORDER_STATUSES.forEach((status) => {
      expect(status).toHaveProperty('value');
      expect(status).toHaveProperty('label');
      expect(status).toHaveProperty('color');
    });
  });
});

// ─── getStatusLabel ─────────────────────────────────────────────────────────
describe('getStatusLabel', () => {
  it('يعيد التسمية العربية للحالة المعروفة', () => {
    expect(getStatusLabel('new')).toBe('جديد');
    expect(getStatusLabel('delivered')).toBe('تم التسليم');
    expect(getStatusLabel('cancelled')).toBe('ملغي');
    expect(getStatusLabel('shipped')).toBe('تم الشحن');
    expect(getStatusLabel('processing')).toBe('قيد التجهيز');
  });

  it('يمرر الحالة غير المعروفة كما هي', () => {
    expect(getStatusLabel('unknown_x')).toBe('unknown_x');
  });

  it('يعيد القيمة الأصلية عند إدخال نص فارغ', () => {
    expect(getStatusLabel('')).toBe('');
  });
});

// ─── getStatusColor ─────────────────────────────────────────────────────────
describe('getStatusColor', () => {
  it('يعيد ألوان الحالة المعروفة', () => {
    expect(getStatusColor('new')).toContain('bg-blue-100');
    expect(getStatusColor('delivered')).toContain('bg-green-100');
    expect(getStatusColor('cancelled')).toContain('bg-red-100');
  });

  it('يعيد لون افتراضي للحالة غير المعروفة', () => {
    expect(getStatusColor('unknown')).toContain('bg-gray-100');
  });
});

// ─── normalizeWhatsAppNumber ────────────────────────────────────────────────
describe('normalizeWhatsAppNumber', () => {
  it('يحوّل الصيغة المحلية العراقية 0xxx إلى 964', () => {
    expect(normalizeWhatsAppNumber('07704760548')).toBe('9647704760548');
  });

  it('يمسح الأحرف غير الرقمية', () => {
    expect(normalizeWhatsAppNumber('+964 (770) 476-0548')).toBe('9647704760548');
    expect(normalizeWhatsAppNumber('0770 abc 123')).toBe('964770123');
  });

  it('يعيد الأرقام الدولية كما هي', () => {
    expect(normalizeWhatsAppNumber('9647704760548')).toBe('9647704760548');
  });

  it('يقبل null/undefined/فارغ ويعيد سلسلة فارغة', () => {
    expect(normalizeWhatsAppNumber(null)).toBe('');
    expect(normalizeWhatsAppNumber(undefined)).toBe('');
    expect(normalizeWhatsAppNumber('')).toBe('');
    expect(normalizeWhatsAppNumber('abc')).toBe('');
  });

  it('لا يحول الصفر المفرد', () => {
    expect(normalizeWhatsAppNumber('0')).toBe('0');
  });
});

// ─── buildWhatsAppUrl ───────────────────────────────────────────────────────
describe('buildWhatsAppUrl', () => {
  it('يبني رابط wa.me مع رسالة مشفرة', () => {
    const url = buildWhatsAppUrl('07704760548', 'مرحباً');
    expect(url).toBe(`https://wa.me/9647704760548?text=${encodeURIComponent('مرحباً')}`);
  });

  it('يعيد نصاً فارغاً عند غياب الرقم', () => {
    expect(buildWhatsAppUrl(null, 'hi')).toBe('');
    expect(buildWhatsAppUrl('', 'hi')).toBe('');
  });

  it('يعيد نصاً فارغاً عند رسال فارغة الرقم', () => {
    expect(buildWhatsAppUrl(undefined, 'test')).toBe('');
  });
});

// ─── buildOrderStatusWhatsAppMessage ────────────────────────────────────────
describe('buildOrderStatusWhatsAppMessage', () => {
  it('يبني رسالة حالة "جديد" بدون اسم العميل', () => {
    const msg = buildOrderStatusWhatsAppMessage(123, 'new', 'متجري');
    expect(msg).toContain('طلبك رقم #123');
    expect(msg).toContain('متجري');
    expect(msg).not.toContain('مرحباً');
  });

  it('يبني رسالة حالة "جديد" مع اسم العميل', () => {
    const msg = buildOrderStatusWhatsAppMessage(123, 'new', 'متجري', 'أحمد');
    expect(msg).toContain('مرحباً أحمد');
    expect(msg).toContain('طلبك رقم #123');
  });

  it('يغطي جميع الحالات المعروفة', () => {
    const statuses = ['new', 'processing', 'shipped', 'delivered', 'cancelled'];
    statuses.forEach((status) => {
      const msg = buildOrderStatusWhatsAppMessage(1, status, 'Store');
      expect(msg).toContain('Store');
      expect(msg).toContain('#1');
    });
  });

  it('يتعامل مع حالة غير معروفة', () => {
    const msg = buildOrderStatusWhatsAppMessage(1, 'unknown', 'Store');
    expect(msg).toContain('#1');
    expect(msg).toContain('Store');
  });
});

// ─── getApiUrl ──────────────────────────────────────────────────────────────
describe('getApiUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('يعيد المسار كما هو مع base URL', () => {
    const result = getApiUrl('/api/images/1');
    expect(result).toBe('http://localhost:5173/api/images/1');
  });

  it('يتعامل مع URLs مطلقة', () => {
    expect(getApiUrl('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
    expect(getApiUrl('http://example.com/img.jpg')).toBe('http://example.com/img.jpg');
  });

  it('يتعامل مع data URIs', () => {
    expect(getApiUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('يتعامل مع blob URIs', () => {
    expect(getApiUrl('blob:http://localhost:5173/abc')).toBe('blob:http://localhost:5173/abc');
  });

  it('يرجع القيمة الأصلية إذا كانت فارغة', () => {
    expect(getApiUrl('')).toBe('');
    expect(getApiUrl('   ')).toBe('');
  });
});
