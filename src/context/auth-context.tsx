import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseAuthUser,
} from '@react-native-firebase/auth';
import { doc, onSnapshot, runTransaction, setDoc } from '@react-native-firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { firebaseAuth, firestore } from '@/services/firebase';
import type { Role, User } from '@/types';

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

function isRole(value: unknown): value is Role {
  return value === 'praktikan' || value === 'asisten';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [profile, setProfile] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<FirebaseAuthUser | null>(null);

  useEffect(() => onAuthStateChanged(firebaseAuth, (user) => {
    setAuthUser(user);
    setProfile(null);
    setError(null);
    if (!user) setStatus('signedOut');
    else setStatus('loading');
  }), []);

  useEffect(() => {
    if (!authUser) return;
    return onSnapshot(doc(firestore, 'users', authUser.uid), (snapshot) => {
      if (!snapshot.exists()) {
        setProfile(null);
        setStatus('needsProfile');
        setError(null);
        return;
      }
      const data = snapshot.data();
      if (!isRole(data.role) || typeof data.name !== 'string' || typeof data.email !== 'string') {
        setProfile(null);
        setStatus('needsProfile');
        setError('Profil akun belum lengkap atau memiliki role yang tidak valid. Hubungi administrator.');
        return;
      }
      setProfile({ id: snapshot.id, name: data.name, email: data.email, role: data.role });
      setStatus('authenticated');
      setError(null);
    }, (cause) => {
      setProfile(null);
      setStatus('profileError');
      setError(toAuthMessage(cause));
    });
  }, [authUser]);

  const register = useCallback(async (name: string, email: string, password: string) => {
    setError(null);
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
    try {
      await setDoc(doc(firestore, 'users', credential.user.uid), {
        name: name.trim(),
        email: credential.user.email ?? email.trim(),
        role: 'praktikan',
        createdAt: new Date().toISOString(),
      });
    } catch (cause) {
      // Auth account creation and profile creation are separate operations. Keep the user signed in
      // so they can retry after the profile write failure; do not claim registration completed.
      setError(`Akun berhasil dibuat, tetapi profil belum tersimpan. Coba masuk kembali saat koneksi tersedia. ${toAuthMessage(cause)}`);
      throw cause;
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
  }, []);

  const completePractitionerProfile = useCallback(async (name: string) => {
    if (!authUser) throw new Error('Sesi login sudah berakhir. Masuk kembali untuk melanjutkan.');
    const profileRef = doc(firestore, 'users', authUser.uid);
    const displayName = name.trim();
    if (displayName.length < 2) throw new Error('Masukkan nama lengkap Anda.');
    await runTransaction(firestore, async (transaction) => {
      const existing = await transaction.get(profileRef);
      if (existing.exists()) throw new Error('Profil akun sudah ada tetapi belum valid. Hubungi administrator.');
      transaction.set(profileRef, { name: displayName, email: authUser.email ?? '', role: 'praktikan', createdAt: new Date().toISOString() });
    });
  }, [authUser]);

  const logout = useCallback(async () => {
    setError(null);
    await signOut(firebaseAuth);
  }, []);

  const value = useMemo(() => ({ status, profile, error, register, completePractitionerProfile, login, logout }), [status, profile, error, register, completePractitionerProfile, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}

export function toAuthMessage(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  const messages: Record<string, string> = {
    'auth/email-already-in-use': 'Email sudah terdaftar.',
    'auth/invalid-email': 'Format email tidak valid.',
    'auth/weak-password': 'Password minimal terdiri dari 6 karakter.',
    'auth/invalid-credential': 'Email atau password salah.',
    'auth/user-disabled': 'Akun ini dinonaktifkan.',
    'auth/network-request-failed': 'Tidak dapat terhubung. Periksa koneksi internet Anda.',
    'firestore/permission-denied': 'Akses profil ditolak. Periksa konfigurasi keamanan Firestore.',
  };
  return messages[code] ?? 'Terjadi kendala. Silakan coba kembali.';
}
