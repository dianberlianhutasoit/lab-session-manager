import { Redirect, usePathname, type Href } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppTabs from '@/components/app-tabs';
import { useAuth } from '@/context/auth-context';

export default function MainLayout() {
  const { status, profile, error, logout } = useAuth();
  const pathname = usePathname();
  if (status === 'loading') return <View style={styles.state}><ActivityIndicator color="#4F8EF7" /></View>;
  if (status === 'signedOut') return <Redirect href={'/login' as Href} />;
  if (status === 'needsProfile' || status === 'profileError' || !profile) {
    return <View style={styles.state}>
      <Text style={styles.title}>{status === 'profileError' ? 'Profil tidak dapat dimuat' : 'Profil belum tersedia'}</Text>
      <Text style={styles.message}>{error ?? 'Akun ini belum memiliki profil aktif. Hubungi administrator untuk mendapatkan akses.'}</Text>
      <TouchableOpacity style={styles.button} onPress={() => void logout()}><Text style={styles.buttonText}>Keluar</Text></TouchableOpacity>
    </View>;
  }
  if (profile.role !== 'praktikan' && profile.role !== 'asisten') {
    return <View style={styles.state}><Text style={styles.title}>Akses belum tersedia</Text><TouchableOpacity style={styles.button} onPress={() => void logout()}><Text style={styles.buttonText}>Keluar</Text></TouchableOpacity></View>;
  }
  if (profile.role === 'praktikan' && pathname !== '/praktikan' && !pathname.startsWith('/praktikan/') && pathname !== '/maps') return <Redirect href={'/praktikan' as Href} />;
  if (profile.role === 'asisten' && (pathname === '/praktikan' || pathname.startsWith('/praktikan/'))) return <Redirect href={'/' as Href} />;
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
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
