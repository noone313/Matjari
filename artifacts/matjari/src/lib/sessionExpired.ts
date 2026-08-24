const MERCHANT_KEY = 'matjari_merchant';
const SESSION_EXPIRED_KEY = 'matjari_session_expired';

export const SESSION_EXPIRED_MESSAGE = 'انتهت جلستك، الرجاء تسجيل الدخول مجدداً';

let isRedirecting = false;

/**
 * Page-load timestamp used to suppress the 401→redirect during the initial
 * /auth/me check. Without this grace period, visiting the login page
 * (unauthenticated) triggers a 401 on /auth/me, which calls
 * forceRedirectToLogin() before the user can even type their credentials.
 */
const PAGE_LOAD_TIME = Date.now();
const AUTH_CHECK_GRACE_MS = 3000; // 3 seconds

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
 *
 * During the first few seconds after page load, /auth/me 401s are silenced
 * because they're the normal "not logged in yet" check from AuthContext.
 */
export function handleApiError(error: unknown): void {
  const e = error as { status?: number; url?: string } | null;
  if (!e || typeof e.status !== 'number' || e.status !== 401) return;
  if (!isProtectedApiUrl(e.url || '')) return;

  // Suppress /auth/me 401s during the initial session check (first 3s).
  // Dashboard 401s are never suppressed — they indicate a genuinely expired session.
  const isInitialAuthCheck =
    e.url?.endsWith('/api/auth/me') &&
    Date.now() - PAGE_LOAD_TIME < AUTH_CHECK_GRACE_MS;

  if (isInitialAuthCheck) return;

  forceRedirectToLogin();
}

export function clearSession(): void {
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
 * Entry-point check: with httpOnly cookies the session is validated
 * asynchronously via /auth/me in AuthContext. This always returns false.
 */
export function shouldRedirectToLogin(): boolean {
  return false;
}
