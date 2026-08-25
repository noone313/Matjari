import { describe, it, expect, vi, afterEach } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.SESSION_SECRET || 'matjari-dev-secret';

// We import after potential env setup
import { signToken, sessionCookieOptions, SESSION_COOKIE_NAME } from '../middleware/auth';

// ─── SESSION_COOKIE_NAME ────────────────────────────────────────────────────
describe('SESSION_COOKIE_NAME', () => {
  it('يحتوي على matjari_session', () => {
    expect(SESSION_COOKIE_NAME).toBe('matjari_session');
  });
});

// ─── signToken ──────────────────────────────────────────────────────────────
describe('signToken', () => {
  it('يعيد توكن JWT صالح', () => {
    const token = signToken(42);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('التوكن يحتوي على merchantId', () => {
    const token = signToken(42);
    const decoded = jwt.verify(token, JWT_SECRET) as { merchantId: number };
    expect(decoded.merchantId).toBe(42);
  });

  it('التوكن صالح لمدة 30 يوم', () => {
    const token = signToken(1);
    const decoded = jwt.verify(token, JWT_SECRET) as { exp: number };
    const now = Math.floor(Date.now() / 1000);
    const diff = decoded.exp - now;
    expect(diff).toBeGreaterThan(29 * 24 * 60 * 60);
    expect(diff).toBeLessThanOrEqual(30 * 24 * 60 * 60 + 5);
  });

  it('يولّد توكنين مختلفين لمعرّفين مختلفين', () => {
    const t1 = signToken(1);
    const t2 = signToken(2);
    expect(t1).not.toBe(t2);
  });
});

// ─── sessionCookieOptions ──────────────────────────────────────────────────
describe('sessionCookieOptions', () => {
  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  it('في وضع التطوير: httpOnly=true, secure=false, sameSite=lax', () => {
    process.env.NODE_ENV = 'development';
    const opts = sessionCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.secure).toBe(false);
    expect(opts.sameSite).toBe('lax');
    expect(opts.path).toBe('/');
    expect(opts.maxAge).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it('في وضع الإنتاج: httpOnly=true, secure=true, sameSite=none', () => {
    process.env.NODE_ENV = 'production';
    const opts = sessionCookieOptions();
    expect(opts.httpOnly).toBe(true);
    expect(opts.secure).toBe(true);
    expect(opts.sameSite).toBe('none');
  });

  it('بدون NODE_ENV: ي treats كتطوير', () => {
    const opts = sessionCookieOptions();
    expect(opts.secure).toBe(false);
    expect(opts.sameSite).toBe('lax');
  });
});
