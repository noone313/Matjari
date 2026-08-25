// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  SESSION_EXPIRED_MESSAGE,
  isProtectedApiUrl,
  shouldRedirectToLogin,
  consumeSessionExpiredMessage,
  clearSession,
} from './sessionExpired';

// ─── SESSION_EXPIRED_MESSAGE ────────────────────────────────────────────────
describe('SESSION_EXPIRED_MESSAGE', () => {
  it('هو نص عربي', () => {
    expect(typeof SESSION_EXPIRED_MESSAGE).toBe('string');
    expect(SESSION_EXPIRED_MESSAGE.length).toBeGreaterThan(0);
  });
});

// ─── isProtectedApiUrl ──────────────────────────────────────────────────────
describe('isProtectedApiUrl', () => {
  it('يكتشف مسارات dashboard', () => {
    expect(isProtectedApiUrl('/api/dashboard/products')).toBe(true);
    expect(isProtectedApiUrl('/api/dashboard/orders')).toBe(true);
    expect(isProtectedApiUrl('/api/dashboard/settings')).toBe(true);
  });

  it('يكتشف مسار auth/me', () => {
    expect(isProtectedApiUrl('/api/auth/me')).toBe(true);
  });

  it('يرفض مسارات storefront', () => {
    expect(isProtectedApiUrl('/api/stores/cake-corner/products')).toBe(false);
    expect(isProtectedApiUrl('/api/stores/cake-corner')).toBe(false);
  });

  it('يرفض مسار login', () => {
    expect(isProtectedApiUrl('/api/auth/login')).toBe(false);
    expect(isProtectedApiUrl('/api/auth/register')).toBe(false);
  });

  it('يرفض نص فارغ', () => {
    expect(isProtectedApiUrl('')).toBe(false);
  });
});

// ─── shouldRedirectToLogin ──────────────────────────────────────────────────
describe('shouldRedirectToLogin', () => {
  it('يعيد دائماً false', () => {
    expect(shouldRedirectToLogin()).toBe(false);
  });
});

// ─── consumeSessionExpiredMessage ───────────────────────────────────────────
describe('consumeSessionExpiredMessage', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('sessionStorage', {
      getItem: vi.fn((k: string) => store[k] ?? null),
      setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
      removeItem: vi.fn((k: string) => { delete store[k]; }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('يقرأ و يمسح الرسالة المخزنة', () => {
    store['matjari_session_expired'] = 'test message';
    const msg = consumeSessionExpiredMessage();
    expect(msg).toBe('test message');
    expect(store['matjari_session_expired']).toBeUndefined();
  });

  it('يعيد null إذا لا توجد رسالة', () => {
    expect(consumeSessionExpiredMessage()).toBeNull();
  });
});

// ─── clearSession ───────────────────────────────────────────────────────────
describe('clearSession', () => {
  let store: Record<string, string>;

  beforeEach(() => {
    store = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((k: string) => store[k] ?? null),
      setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
      removeItem: vi.fn((k: string) => { delete store[k]; }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('يمسح المفتاح الصحيح من localStorage', () => {
    store['matjari_merchant'] = 'test';
    clearSession();
    expect(store['matjari_merchant']).toBeUndefined();
  });
});
