import { describe, it, expect } from 'vitest';
import {
  normalizeWhatsAppNumber,
  buildWhatsAppUrl,
  getStatusLabel,
  getStatusColor,
  getCategoryLabel,
  formatPrice,
} from './utils';

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

describe('buildWhatsAppUrl', () => {
  it('يبني رابط wa.me مع رسالة مشفرة', () => {
    const url = buildWhatsAppUrl('07704760548', 'مرحباً');
    expect(url).toBe(`https://wa.me/9647704760548?text=${encodeURIComponent('مرحباً')}`);
  });

  it('يعيد نصاً فارغاً عند غياب الرقم', () => {
    expect(buildWhatsAppUrl(null, 'hi')).toBe('');
    expect(buildWhatsAppUrl('', 'hi')).toBe('');
  });
});

describe('getStatusLabel / getStatusColor', () => {
  it('يعيد التسمية العربية للحالة المعروفة', () => {
    expect(getStatusLabel('new')).toBe('جديد');
    expect(getStatusLabel('delivered')).toBe('تم التسليم');
  });

  it('يمرر الحالة غير المعروفة كما هي', () => {
    expect(getStatusLabel('unknown_x')).toBe('unknown_x');
    expect(getStatusColor('unknown_x')).toContain('bg-gray-100');
  });
});

describe('getCategoryLabel', () => {
  it('يعيد التسمية العربية للقسم المعروف', () => {
    expect(getCategoryLabel('perfume_men')).toBe('عطور رجالي');
  });

  it('يمرر القسم غير المعروف كما هو', () => {
    expect(getCategoryLabel('nope')).toBe('nope');
  });
});

describe('formatPrice', () => {
  it('يلحق العملة بالسعر', () => {
    expect(formatPrice(5000)).toContain('د.ع');
  });
});
