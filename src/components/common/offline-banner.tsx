import { useNetInfo } from '@react-native-community/netinfo';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

export function OfflineBanner() {
  const netInfo = useNetInfo();

  // Jika koneksi terhubung dan internet terjangkau, jangan tampilkan banner
  const isOffline =
    netInfo.isConnected === false ||
    (netInfo.isInternetReachable === false && Platform.OS !== 'web');

  if (!isOffline) {
    return null;
  }

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.content}>
        <ThemedText style={styles.icon}>📡</ThemedText>
        <View style={styles.textContainer}>
          <ThemedText type="smallBold" style={styles.title}>
            Mode Offline Aktif
          </ThemedText>
          <ThemedText type="small" style={styles.subtitle}>
            Koneksi internet terputus. Data akan disimpan secara lokal dan disinkronkan saat online kembali.
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    width: '100%',
    zIndex: 9999,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  icon: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#92400E',
    fontSize: 12,
  },
  subtitle: {
    color: '#B45309',
    fontSize: 11,
    lineHeight: 14,
  },
});

