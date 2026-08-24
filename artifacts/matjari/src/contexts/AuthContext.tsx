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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Attempt to hydrate the session from the httpOnly cookie by calling /auth/me.
    // If the cookie is valid, the server returns the merchant data.
    // If not, we stay unauthenticated silently.
    const controller = new AbortController();
    (async () => {
      try {
        const res = await customFetch<Merchant>('/api/auth/me', {
          signal: controller.signal,
        });
        setMerchant(res);
        // Store a placeholder token so isAuthenticated becomes true.
        // The real token lives in the httpOnly cookie.
        setToken('__cookie__');
      } catch {
        // No valid cookie — user is not authenticated.
        // This is normal for first visits / expired sessions.
      } finally {
        setIsLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  const login = useCallback((newToken: string, newMerchant: Merchant, initialNewOrdersCount?: number) => {
    // The server already set the httpOnly cookie in the login response.
    // We still store merchant data in state for immediate UI availability.
    // Also store in localStorage for the 401 redirect flow (sessionExpired.ts).
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
      // Best-effort — even if the request fails, clear local state.
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
