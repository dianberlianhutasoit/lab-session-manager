import { users as dummyUsers } from '@/data/dummy';
import type { Role, User } from '@/types';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type AuthStatus = 'loading' | 'signedOut' | 'authenticated' | 'needsProfile' | 'profileError';

interface AuthContextValue {
  status: AuthStatus;
  profile: User | null;
  error: string | null;
  register: (name: string, email: string, password: string) => Promise<void>;
  completePractitionerProfile: (name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'lab_session_web_auth_user';

function isRole(value: unknown): value is Role {
  return value === 'praktikan' || value === 'asisten';
}

function getInitialWebUser(): User | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as User;
        if (parsed && parsed.id && isRole(parsed.role)) {
          return parsed;
        }
      }
    }
  } catch {
    // Ignore storage parse failure on initial load
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<User | null>(getInitialWebUser);
  const [status, setStatus] = useState<AuthStatus>(() =>
    profile ? 'authenticated' : 'signedOut'
  );
  const [error, setError] = useState<string | null>(null);

  const saveUser = useCallback((user: User | null) => {
    setProfile(user);
    if (typeof window !== 'undefined' && window.localStorage) {
      if (user) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  const register = useCallback(async (name: string, email: string, _password: string) => {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    const role: Role = trimmedEmail.includes('asisten') ? 'asisten' : 'praktikan';
    const newUser: User = {
      id: `web-user-${Date.now()}`,
      name: name.trim(),
      email: trimmedEmail,
      role,
    };
    saveUser(newUser);
    setStatus('authenticated');
  }, [saveUser]);

  const login = useCallback(async (email: string, _password: string) => {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();

    // 1. Cek apakah ada di daftar dummy users
    const matched = dummyUsers.find((u) => u.email.toLowerCase() === trimmedEmail);
    if (matched) {
      saveUser(matched);
      setStatus('authenticated');
      return;
    }

    // 2. Jika tidak ada di dummy, buat user baru sesuai pola email
    const role: Role = trimmedEmail.includes('asisten') ? 'asisten' : 'praktikan';
    const fallbackUser: User = {
      id: `web-user-${Date.now()}`,
      name: trimmedEmail.split('@')[0],
      email: trimmedEmail,
      role,
    };
    saveUser(fallbackUser);
    setStatus('authenticated');
  }, [saveUser]);

  const completePractitionerProfile = useCallback(async (name: string) => {
    if (!profile) throw new Error('Sesi login sudah berakhir. Masuk kembali untuk melanjutkan.');
    const updated: User = { ...profile, name: name.trim() };
    saveUser(updated);
    setStatus('authenticated');
  }, [profile, saveUser]);

  const logout = useCallback(async () => {
    setError(null);
    saveUser(null);
    setStatus('signedOut');
  }, [saveUser]);

  const value = useMemo(
    () => ({ status, profile, error, register, completePractitionerProfile, login, logout }),
    [status, profile, error, register, completePractitionerProfile, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

export function toAuthMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return 'Terjadi kendala. Silakan coba kembali.';
}

