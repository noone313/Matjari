import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { Merchant } from '@workspace/api-client-react';

interface AuthContextType {
  token: string | null;
  merchant: Merchant | null;
  login: (token: string, merchant: Merchant) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('matjari_token');
    const savedMerchant = localStorage.getItem('matjari_merchant');
    if (savedToken && savedMerchant) {
      setToken(savedToken);
      try {
        setMerchant(JSON.parse(savedMerchant));
      } catch (e) {
        console.error("Failed to parse merchant from localStorage", e);
      }
    }
  }, []);

  const login = (newToken: string, newMerchant: Merchant) => {
    localStorage.setItem('matjari_token', newToken);
    localStorage.setItem('matjari_merchant', JSON.stringify(newMerchant));
    setToken(newToken);
    setMerchant(newMerchant);
  };

  const logout = () => {
    localStorage.removeItem('matjari_token');
    localStorage.removeItem('matjari_merchant');
    setToken(null);
    setMerchant(null);
  };

  return (
    <AuthContext.Provider value={{ token, merchant, login, logout, isAuthenticated: !!token }}>
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
