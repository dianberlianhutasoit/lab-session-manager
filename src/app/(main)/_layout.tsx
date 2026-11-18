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
  if (profile.role === 'praktikan' && pathname !== '/praktikan' && !pathname.startsWith('/praktikan/')) return <Redirect href={'/praktikan' as Href} />;
  if (profile.role === 'asisten' && (pathname === '/praktikan' || pathname.startsWith('/praktikan/'))) return <Redirect href={'/' as Href} />;
  return <AppTabs />;
}

const styles = StyleSheet.create({ state: { flex: 1, backgroundColor: '#12121A', alignItems: 'center', justifyContent: 'center', padding: 28, gap: 12 }, title: { color: '#F8F8F2', fontSize: 20, fontWeight: '700', textAlign: 'center' }, message: { color: '#A5ADC4', fontSize: 14, textAlign: 'center', lineHeight: 21 }, button: { marginTop: 12, backgroundColor: '#4F8EF7', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }, buttonText: { color: '#fff', fontWeight: '700' } });
