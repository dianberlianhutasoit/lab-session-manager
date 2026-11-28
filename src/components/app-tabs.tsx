import React from 'react';
import { Tabs, useRouter, usePathname, type Href } from 'expo-router';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/auth-context';
import { useSessionContext } from '@/context/session-context';

const COLOR_MAROON = '#64102A';
const COLOR_BUTTON = '#791636';
const COLOR_MUTED = '#8E7F7F';

function CustomLaboraTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const safeAreaInsets = useSafeAreaInsets();
  const { profile, logout } = useAuth();
  const { sessions } = useSessionContext();

  const isPraktikan = profile?.role === 'praktikan';

  // Sembunyikan navbar pada halaman detail praktikan atau sub-halaman
  const isDetailPage =
    pathname.startsWith('/praktikan/') &&
    pathname !== '/praktikan' &&
    pathname !== '/praktikan/jadwal' &&
    pathname !== '/praktikan/riwayat';

  if (isDetailPage) {
    return null;
  }

  const isBeranda = isPraktikan ? pathname === '/praktikan' : pathname === '/';
  const isJadwal =
    pathname === '/praktikan/jadwal' ||
    pathname === '/praktikan/riwayat' ||
    pathname === '/explore';
  const isMaps = pathname === '/maps';
  const isProfil = false;

  const handleQRScan = () => {
    // Cari sesi yang sedang OPEN
    const openSession = sessions.find((s) => s.status === 'OPEN');
    if (openSession) {
      router.push(`/praktikan/${openSession.id}` as Href);
    } else {
      Alert.alert(
        'Presensi QR',
        'Belum ada sesi praktikum yang sedang aktif dibuka untuk presensi QR saat ini.',
        [{ text: 'Mengerti' }]
      );
    }
  };

  const handleProfilPress = () => {
    Alert.alert(
      'Profil Pengguna',
      `Nama: ${profile?.name || 'Mahasiswa'}\nNIM: ${profile?.nim || '-'}\nEmail: ${profile?.email || '-'}\nPeran: ${profile?.role === 'praktikan' ? 'Praktikan' : 'Asisten Lab'}`,
      [
        {
          text: 'Keluar Akun',
          style: 'destructive',
          onPress: () => void logout(),
        },
        { text: 'Tutup', style: 'cancel' },
      ]
    );
  };

  return (
    <View
      style={[
        styles.tabBarContainer,
        { paddingBottom: Math.max(safeAreaInsets.bottom, 8) },
      ]}
    >
      {/* 1. Beranda */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => {
          if (isPraktikan) {
            router.push('/praktikan' as Href);
          } else {
            router.push('/' as Href);
          }
        }}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isBeranda ? 'home' : 'home-outline'}
          size={22}
          color={isBeranda ? COLOR_MAROON : COLOR_MUTED}
        />
        <Text style={[styles.tabLabel, isBeranda && styles.tabLabelActive]}>
          Beranda
        </Text>
      </TouchableOpacity>

      {/* 2. Jadwal */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => {
          if (isPraktikan) {
            router.push('/praktikan/jadwal' as Href);
          } else {
            router.push('/explore' as Href);
          }
        }}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isJadwal ? 'calendar' : 'calendar-outline'}
          size={22}
          color={isJadwal ? COLOR_MAROON : COLOR_MUTED}
        />
        <Text style={[styles.tabLabel, isJadwal && styles.tabLabelActive]}>
          Jadwal
        </Text>
      </TouchableOpacity>

      {/* 3. Tombol Melayang Tengah (QR Scanner) */}
      <View style={styles.floatingButtonWrapper}>
        <TouchableOpacity
          style={styles.floatingCenterButton}
          onPress={handleQRScan}
          activeOpacity={0.85}
        >
          <Ionicons name="qr-code-outline" size={30} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 4. Maps */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => router.push('/maps' as Href)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isMaps ? 'location' : 'location-outline'}
          size={22}
          color={isMaps ? COLOR_MAROON : COLOR_MUTED}
        />
        <Text style={[styles.tabLabel, isMaps && styles.tabLabelActive]}>
          Maps
        </Text>
      </TouchableOpacity>

      {/* 5. Profil */}
      <TouchableOpacity
        style={styles.tabItem}
        onPress={handleProfilPress}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isProfil ? 'person' : 'person-outline'}
          size={22}
          color={isProfil ? COLOR_MAROON : COLOR_MUTED}
        />
        <Text style={[styles.tabLabel, isProfil && styles.tabLabelActive]}>
          Profil
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AppTabs() {
  const { profile } = useAuth();
  const isPraktikan = profile?.role === 'praktikan';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={() => <CustomLaboraTabBar />}
    >
      <Tabs.Screen
        name="praktikan"
        options={{
          href: isPraktikan ? '/praktikan' : null,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          href: !isPraktikan ? '/' : null,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          href: !isPraktikan ? '/explore' : null,
        }}
      />
      <Tabs.Screen
        name="maps"
        options={{
          href: '/maps',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1E9E9',
    paddingTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
    position: 'relative',
    overflow: 'visible',
    zIndex: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: COLOR_MUTED,
    marginTop: 3,
  },
  tabLabelActive: {
    color: COLOR_MAROON,
    fontWeight: '700',
  },
  floatingButtonWrapper: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  floatingCenterButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLOR_BUTTON,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: -54,
    shadowColor: COLOR_BUTTON,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 12,
    borderWidth: 3.5,
    borderColor: '#FFFFFF',
  },
});
