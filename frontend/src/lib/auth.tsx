'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from './api';

interface User {
  id: number;
  email: string;
  username: string;
  role: string;
  status: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (email: string, password: string, username: string) => Promise<{ success: boolean; message?: string }>;
  verifyEmail: (token: string) => Promise<{ success: boolean; message?: string }>;
  resendVerification: (email: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  isAdmin: boolean;
  isVerified: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null, token: null, loading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  verifyEmail: async () => ({ success: false }),
  resendVerification: async () => ({ success: false }),
  logout: async () => {},
  refreshAccessToken: async () => false,
  isAdmin: false,
  isVerified: false,
});

const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return false;

    const res = await api.post('/auth/refresh', { refreshToken });
    if (res.code === 0 && res.data) {
      setToken(res.data.accessToken);
      localStorage.setItem(TOKEN_KEY, res.data.accessToken);
      localStorage.setItem(REFRESH_KEY, res.data.refreshToken);
      return true;
    } else {
      // Refresh 失败，清除登录状态
      setUser(null);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_KEY);
      return false;
    }
  }, []);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      setToken(savedToken);
      api.get('/auth/me').then((res) => {
        if (res.code === 0) {
          setUser(res.data);
        } else {
          // Token 过期，尝试 refresh
          refreshAccessToken().then((refreshed) => {
            if (!refreshed) {
              localStorage.removeItem(TOKEN_KEY);
              localStorage.removeItem(REFRESH_KEY);
              setToken(null);
            }
          });
        }
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshAccessToken]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.code === 0) {
      setUser(res.data.user);
      setToken(res.data.accessToken);
      localStorage.setItem(TOKEN_KEY, res.data.accessToken);
      localStorage.setItem(REFRESH_KEY, res.data.refreshToken);
      return { success: true };
    }
    return { success: false, message: res.message };
  }, []);

  const register = useCallback(async (email: string, password: string, username: string) => {
    const res = await api.post('/auth/register', { email, password, username });
    if (res.code === 0) {
      return { success: true, message: res.data.message };
    }
    return { success: false, message: res.message };
  }, []);

  const verifyEmail = useCallback(async (verificationToken: string) => {
    const res = await api.post('/auth/verify-email', { token: verificationToken });
    if (res.code === 0) {
      setUser(res.data.user);
      setToken(res.data.accessToken);
      localStorage.setItem(TOKEN_KEY, res.data.accessToken);
      localStorage.setItem(REFRESH_KEY, res.data.refreshToken);
      return { success: true, message: res.data.message };
    }
    return { success: false, message: res.message };
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    const res = await api.post('/auth/resend-verification', { email });
    if (res.code === 0) {
      return { success: true, message: res.data.message };
    }
    return { success: false, message: res.message };
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (refreshToken) {
      await api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  }, []);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const isVerified = user?.status === 'ACTIVE';

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, verifyEmail, resendVerification, logout, refreshAccessToken, isAdmin, isVerified }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
