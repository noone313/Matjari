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
 * /login? With httpOnly cookies, we no longer have a synchronously readable
 * JWT — the session is validated asynchronously via /auth/me in AuthContext.
 * This function only checks localStorage for merchant data as a fast
 * heuristic; the real validation happens on mount.
 */
export function shouldRedirectToLogin(): boolean {
  try {
    if (!window.location.pathname.startsWith('/dashboard')) return false;
    // With httpOnly cookies we can't synchronously check JWT expiry.
    // We still check if merchant data exists in localStorage as a fast path.
    // If it does, the user likely has a valid session — AuthContext will verify
    // via /auth/me. If not, let AuthContext handle the redirect.
    return false;
  } catch {
    return false;
  }
}
