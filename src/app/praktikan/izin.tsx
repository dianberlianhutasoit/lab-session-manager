import { Stack } from 'expo-router';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { DaftarRiwayatIzin } from '@/components/izin/daftar-riwayat-izin';
import { FormPengajuanIzin } from '@/components/izin/form-pengajuan-izin';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useSessionContext } from '@/context/session-context';
import { useTheme } from '@/hooks/use-theme';

export default function IzinPraktikanScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const { addPermission } = useSessionContext();

  const [activeTab, setActiveTab] = useState<'FORM' | 'RIWAYAT'>('FORM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitPermission = async (data: { sessionId: string; reason: string }) => {
    setIsSubmitting(true);
    try {
      // Catatan: Pada Checklist 2, panggilan AI classifyPermissionReason akan dihubungkan di sini.
      // Untuk sementara pada Checklist 1, kita simpan dengan default/mock kategori awal.
      addPermission({
        sessionId: data.sessionId,
        reason: data.reason,
        category: 'Unclassified',
        aiAnalysis: 'Menunggu klasifikasi AI...',
      });
      // Pindahkan view ke tab riwayat agar praktikan langsung melihat hasilnya
      setActiveTab('RIWAYAT');
    } finally {
      setIsSubmitting(false);
    }
  };

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Pengajuan Izin Praktikum', headerBackTitle: 'Kembali' }} />

      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.background }]}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, Spacing.three),
            paddingBottom: insets.bottom,
          },
        ]}>
        <View style={styles.container}>
          {/* Header Banner */}
          <View style={styles.header}>
            <View style={styles.badgeRole}>
              <ThemedText type="smallBold" style={styles.badgeRoleText}>
                PORTAL PRAKTIKAN
              </ThemedText>
            </View>
            <ThemedText type="title" style={styles.title}>
              Layanan Izin Praktikum
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              SRS-11: Ajukan ketidakhadiran dengan alasan yang jelas dan pantau status persetujuan dari asisten lab.
            </ThemedText>
          </View>

          {/* Segmented Control / Tab Bar */}
          <View style={styles.tabBar}>
            <Pressable
              onPress={() => setActiveTab('FORM')}
              style={[styles.tabItem, activeTab === 'FORM' && styles.tabItemActive]}>
              <ThemedText
                type="smallBold"
                style={[styles.tabText, activeTab === 'FORM' && styles.tabTextActive]}>
                ✍️ Form Pengajuan
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('RIWAYAT')}
              style={[styles.tabItem, activeTab === 'RIWAYAT' && styles.tabItemActive]}>
              <ThemedText
                type="smallBold"
                style={[styles.tabText, activeTab === 'RIWAYAT' && styles.tabTextActive]}>
                📋 Riwayat Izin Saya
              </ThemedText>
            </Pressable>
          </View>

          {/* Tab Content */}
          {activeTab === 'FORM' ? (
            <FormPengajuanIzin
              onSubmitPermission={handleSubmitPermission}
              isLoading={isSubmitting}
            />
          ) : (
            <ThemedView type="backgroundElement" style={styles.historyWrapper}>
              <DaftarRiwayatIzin />
            </ThemedView>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  header: {
    gap: 8,
    marginTop: Spacing.two,
  },
  badgeRole: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeRoleText: {
    color: '#0369A1',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    color: '#64748B',
    fontSize: 13,
  },
  tabTextActive: {
    color: '#0F172A',
  },
  historyWrapper: {
    borderRadius: 16,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
});

