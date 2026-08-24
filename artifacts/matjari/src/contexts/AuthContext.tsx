import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Merchant } from '@workspace/api-client-react';
import { customFetch } from '@workspace/api-client-react';

interface AuthContextType {
  token: string | null;
  merchant: Merchant | null;
  login: (token: string, merchant: Merchant, initialNewOrdersCount?: number) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Response type for the /auth/session endpoint. Returns the merchant if a
 * valid session exists (cookie OR Authorization header), or null otherwise.
 * Never returns 401 — always 200.
 */
interface SessionResponse {
  merchant: Merchant | null;
  token: string | null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        // Use /auth/session which returns 200+{merchant,token} or 200+null.
        // This avoids the 401 that /auth/me throws, which triggers error handlers.
        const res = await customFetch<SessionResponse>('/api/auth/session', {
          signal: controller.signal,
        });
        if (res.merchant && res.token) {
          setMerchant(res.merchant);
          setToken(res.token);
          // Persist token for the Authorization header fallback
          localStorage.setItem('matjari_token', res.token);
          localStorage.setItem('matjari_merchant', JSON.stringify(res.merchant));
        }
      } catch {
        // Network error or session expired — user is not authenticated.
      } finally {
        setIsLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const login = useCallback((newToken: string, newMerchant: Merchant, initialNewOrdersCount?: number) => {
    // Persist for the Authorization header fallback (cookie may not work cross-origin)
    localStorage.setItem('matjari_token', newToken);
    localStorage.setItem('matjari_merchant', JSON.stringify(newMerchant));

    if (initialNewOrdersCount !== undefined) {
      const seenKey = `matjari_seen_new_orders_${newMerchant.id}`;
      if (localStorage.getItem(seenKey) === null) {
        localStorage.setItem(seenKey, String(initialNewOrdersCount));
      }
    }

    setToken(newToken);
    setMerchant(newMerchant);
  }, []);

  const logout = useCallback(async () => {
    try {
      await customFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Best-effort
    }
    localStorage.removeItem('matjari_token');
    localStorage.removeItem('matjari_merchant');
    setToken(null);
    setMerchant(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, merchant, login, logout, isAuthenticated: !!token, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
