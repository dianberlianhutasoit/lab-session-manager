import { Stack, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { DaftarRiwayatIzin } from '@/components/izin/daftar-riwayat-izin';
import { FormPengajuanIzin } from '@/components/izin/form-pengajuan-izin';
import { BottomTabInset, MaxContentWidth, Spacing, LaboraColors } from '@/constants/theme';
import { useSessionContext } from '@/context/session-context';
import { useAuth } from '@/context/auth-context';
import { analyzePermissionReason } from '@/services/ai-sentiment';
import type { PermissionCategory } from '@/types';

export default function IzinPraktikanScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const { addPermission } = useSessionContext();
  const { profile } = useAuth();

  const [activeTab, setActiveTab] = useState<'FORM' | 'RIWAYAT'>('FORM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitPermission = async (data: {
    sessionId: string;
    reason: string;
    category?: PermissionCategory;
  }) => {
    setIsSubmitting(true);
    try {
      // Integrasi AI On-Device: Model analisis sentimen lokal + deteksi kategori izin
      const aiResult = analyzePermissionReason(data.reason);

      addPermission({
        sessionId: data.sessionId,
        reason: data.reason,
        sentiment: aiResult.label,
        category: data.category ?? aiResult.category,
        aiAnalysis: aiResult.summary,
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
    <View style={styles.outerContainer}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Bar Navigation */}
      <View style={[styles.topBar, { paddingTop: Math.max(safeAreaInsets.top, 12) }]}>
        <Pressable
          style={styles.iconNavBtn}
          onPress={() => router.back()}
          hitSlop={8}>
          <Feather name="arrow-left" size={20} color={LaboraColors.primary} />
        </Pressable>

        <View style={styles.topBarTitleCol}>
          <ThemedText style={styles.brandTitle}>LABORA</ThemedText>
          <ThemedText style={styles.pageSubtitle}>Formulir Izin</ThemedText>
        </View>

        <View style={styles.avatarCircle}>
          <ThemedText style={styles.avatarInitial}>
            {profile?.name?.trim().charAt(0).toUpperCase() || 'P'}
          </ThemedText>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingBottom: insets.bottom,
          },
        ]}>
        <View style={styles.container}>
          {/* Segmented Control / Tab Bar */}
          <View style={styles.tabBar}>
            <Pressable
              onPress={() => setActiveTab('FORM')}
              style={[styles.tabItem, activeTab === 'FORM' && styles.tabItemActive]}>
              <ThemedText
                style={[styles.tabText, activeTab === 'FORM' && styles.tabTextActive]}>
                Formulir Izin
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('RIWAYAT')}
              style={[styles.tabItem, activeTab === 'RIWAYAT' && styles.tabItemActive]}>
              <ThemedText
                style={[styles.tabText, activeTab === 'RIWAYAT' && styles.tabTextActive]}>
                Riwayat Pengajuan
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
            <View style={styles.historyWrapper}>
              <DaftarRiwayatIzin />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: LaboraColors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingBottom: 12,
    backgroundColor: LaboraColors.background,
    borderBottomWidth: 1,
    borderBottomColor: LaboraColors.cardBorder,
  },
  iconNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: LaboraColors.card,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitleCol: {
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: LaboraColors.primary,
    letterSpacing: 0.8,
  },
  pageSubtitle: {
    fontSize: 11,
    color: LaboraColors.textMuted,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: LaboraColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: 16,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: LaboraColors.surfaceAlt,
    borderRadius: 14,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 11,
  },
  tabItemActive: {
    backgroundColor: LaboraColors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    color: LaboraColors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  tabTextActive: {
    color: LaboraColors.primary,
    fontWeight: '800',
  },
  historyWrapper: {
    backgroundColor: LaboraColors.card,
    borderRadius: 18,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
});
