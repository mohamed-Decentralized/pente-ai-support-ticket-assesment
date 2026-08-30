'use client';

import { AuthUser } from '@pente/shared';
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import {
  refreshSession,
  restoreAccessToken,
  setAccessToken,
  decodeAccessToken,
  isAccessTokenFresh,
} from '../lib/api';
import { apiClient } from '../lib/api-client';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const expireSession = () => setUser(null);
    window.addEventListener('pente-auth-expired', expireSession);
    const restore = async () => {
      const token = restoreAccessToken();
      // If a fresh (non-expired) token is already in sessionStorage, decode the
      // user from it directly — no network call needed.
      if (token && isAccessTokenFresh(token)) {
        const claims = decodeAccessToken(token);
        if (claims) {
          setUser({
            id: claims.sub,
            email: claims.email,
            name: claims.name,
            role: claims.role as any,
          });
          setLoading(false);
          return;
        }
      }
      // Token missing, malformed, or within 60 s of expiry — call refresh.
      try {
        const session = await refreshSession();
        setUser(session.user);
      } catch {
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    };
    void restore();
    return () => window.removeEventListener('pente-auth-expired', expireSession);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const session = await apiClient.login({ email, password });
        setAccessToken(session.accessToken);
        setUser(session.user);
      },
      logout: async () => {
        try {
          await apiClient.logout();
        } finally {
          setAccessToken(null);
          setUser(null);
          window.location.assign('/');
        }
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
};
