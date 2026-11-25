import { Redirect, usePathname, type Href } from 'expo-router';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppTabs from '@/components/app-tabs';
import { useAuth } from '@/context/auth-context';
import { MemphisColors } from '@/constants/theme';
import { isStaffRole, isValidAppRole } from '@/features/asprak/role-utils';

export default function MainLayout() {
  const { status, profile, error, logout } = useAuth();
  const pathname = usePathname();

  if (status === 'loading') {
    return (
      <View style={styles.state}>
        <ActivityIndicator color={MemphisColors.teal} size="large" />
      </View>
    );
  }

  if (status === 'signedOut') {
    return <Redirect href={'/login' as Href} />;
  }

  if (status === 'needsProfile' || status === 'profileError' || !profile) {
    return (
      <View style={styles.state}>
        <Text style={styles.title}>
          {status === 'profileError' ? 'Profil tidak dapat dimuat' : 'Profil belum tersedia'}
        </Text>
        <Text style={styles.message}>
          {error ?? 'Akun ini belum memiliki profil aktif. Hubungi administrator untuk mendapatkan akses.'}
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => void logout()}>
          <Text style={styles.buttonText}>Keluar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isValidAppRole(profile.role)) {
    return (
      <View style={styles.state}>
        <Text style={styles.title}>Akses belum tersedia</Text>
        <TouchableOpacity style={styles.button} onPress={() => void logout()}>
          <Text style={styles.buttonText}>Keluar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (
    profile.role === 'praktikan' &&
    pathname !== '/praktikan' &&
    !pathname.startsWith('/praktikan/') &&
    pathname !== '/maps'
  ) {
    return <Redirect href={'/praktikan' as Href} />;
  }

  if (
    isStaffRole(profile.role) &&
    (pathname === '/praktikan' || pathname.startsWith('/praktikan/'))
  ) {
    return <Redirect href={'/' as Href} />;
  }

  return <AppTabs />;
}

const styles = StyleSheet.create({
  state: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 12,
  },
  title: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  button: {
    marginTop: 12,
    backgroundColor: '#FBBF24',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 26,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#0F172A',
    fontWeight: '700',
  },
});
