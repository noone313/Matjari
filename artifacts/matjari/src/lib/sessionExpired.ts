const TOKEN_KEY = 'matjari_token';
const MERCHANT_KEY = 'matjari_merchant';
const SESSION_EXPIRED_KEY = 'matjari_session_expired';

export const SESSION_EXPIRED_MESSAGE = 'انتهت جلستك، الرجاء تسجيل الدخول مجدداً';

let isRedirecting = false;

/**
 * Protected (auth-gated) API endpoints. The centralized 401 handler must only
 * act on these — public storefront and login requests are never touched.
 */
export function isProtectedApiUrl(url: string): boolean {
  return url.includes('/api/dashboard/') || url.endsWith('/api/auth/me');
}

/**
 * Central 401 handler wired to the React Query caches. Ignores anything that
 * isn't a 401 from a protected dashboard endpoint (so a wrong-password 401 on
 * /auth/login keeps showing the normal login error and never redirects).
 */
export function handleApiError(error: unknown): void {
  const e = error as { status?: number; url?: string } | null;
  if (!e || typeof e.status !== 'number' || e.status !== 401) return;
  if (!isProtectedApiUrl(e.url || '')) return;
  forceRedirectToLogin();
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(MERCHANT_KEY);
}

/**
 * Clear the stored session and hard-redirect to the login page, remembering
 * the reason so the login screen can show an Arabic message instead of a
 * silent redirect. Guarded so concurrent 401s only trigger one redirect.
 */
export function forceRedirectToLogin(): void {
  if (isRedirecting) return;
  isRedirecting = true;
  try {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, SESSION_EXPIRED_MESSAGE);
  } catch {
    // storage unavailable — redirect without the message
  }
  clearSession();
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

/** Read (and clear) the pending session-expired message, shown by Login. */
export function consumeSessionExpiredMessage(): string | null {
  try {
    const message = sessionStorage.getItem(SESSION_EXPIRED_KEY);
    if (message) sessionStorage.removeItem(SESSION_EXPIRED_KEY);
    return message;
  } catch {
    return null;
  }
}

/**
 * Entry-point check: should we refuse to render the app and go straight to
 * /login? True only when a dashboard page is being loaded while the stored
 * JWT has already expired. Called from main.tsx BEFORE React mounts, so the
 * dashboard never flashes and the storefront is never affected.
 */
export function shouldRedirectToLogin(): boolean {
  try {
    if (!window.location.pathname.startsWith('/dashboard')) return false;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return false;
    return isJwtExpired(token);
  } catch {
    return false;
  }
}

/**
 * Decode the JWT payload (base64url) and check `exp` against the current time.
 * Used on app load so an already-expired token from an old tab sends the user
 * to /login immediately, without waiting for the first failed request.
 */
export function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const json = decodeURIComponent(
      Array.from(binary, (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''),
    );
    const payload = JSON.parse(json) as { exp?: unknown };
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    // Undecodable token — don't force logout; the 401 handler is the safety net.
    return false;
  }
}
