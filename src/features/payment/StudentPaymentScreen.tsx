import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';

import { LaboraColors, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { FineCard, formatRupiah } from '@/features/payment/components/FineCard';
import { PaymentHistoryCard } from '@/features/payment/components/PaymentHistoryCard';
import { chargeFinePayment, openMidtransSnap } from '@/features/payment/payment-api';
import type {
  FineWithSession,
  PaymentScreenTab,
  PaymentWithSession,
} from '@/features/payment/types';
import { useStudentPayments } from '@/features/payment/useStudentPayments';

export interface StudentPaymentScreenProps {
  initialTab?: PaymentScreenTab;
  onPayFine?: (fine: FineWithSession) => void;
  onSelectPayment?: (payment: PaymentWithSession) => void;
}

export default function StudentPaymentScreen({
  initialTab = 'BILLS',
  onPayFine,
  onSelectPayment,
}: StudentPaymentScreenProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const {
    activeFines,
    paymentHistory,
    totalUnpaidAmount,
    loading,
    refreshing,
    error,
    refresh,
  } = useStudentPayments();

  const [activeTab, setActiveTab] = useState<PaymentScreenTab>(initialTab);
  const [payingFineId, setPayingFineId] = useState<string | null>(null);

  const handlePayPress = async (fine: FineWithSession) => {
    if (onPayFine) {
      onPayFine(fine);
      return;
    }

    if (!profile?.id) {
      Alert.alert('Sesi Berakhir', 'Silakan login kembali untuk melakukan pembayaran.');
      return;
    }

    setPayingFineId(fine.id);
    try {
      const result = await chargeFinePayment({
        fineId: fine.id,
        studentId: profile.id,
      });
      await openMidtransSnap(result.redirectUrl);
      await refresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gagal membuka halaman pembayaran Midtrans.';
      Alert.alert('Pembayaran Gagal', message);
    } finally {
      setPayingFineId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.wrapper}>
        {/* Top Bar Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={LaboraColors.primary} />
          </TouchableOpacity>

          <View style={styles.topBarCenter}>
            <Text style={styles.topBarBrand}>LABORA</Text>
            <Text style={styles.topBarTitle}>Tagihan & Pembayaran</Text>
          </View>

          <View style={styles.topBarSpacer} />
        </View>

        {/* Summary Hero Card */}
        <View style={styles.headerSection}>
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroPill}>
                <Feather name="credit-card" size={12} color="#FFFFFF" />
                <Text style={styles.heroPillText}>DENDA PRAKTIKUM</Text>
              </View>
              <Text style={styles.heroCountText}>
                {activeFines.length} tagihan aktif
              </Text>
            </View>

            <Text style={styles.heroLabel}>Total Tagihan Belum Lunas</Text>
            <Text style={styles.heroAmount}>{formatRupiah(totalUnpaidAmount)}</Text>
          </View>

          {/* Segmented Tab Switcher */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'BILLS' && styles.tabButtonActive]}
              onPress={() => setActiveTab('BILLS')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'BILLS' && styles.tabTextActive]}>
                Tagihan Aktif ({activeFines.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'HISTORY' && styles.tabButtonActive]}
              onPress={() => setActiveTab('HISTORY')}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]}>
                Riwayat ({paymentHistory.length})
              </Text>
            </TouchableOpacity>
          </View>

          {error && (
            <View style={styles.errorBanner}>
              <Feather name="alert-triangle" size={15} color={LaboraColors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Content List */}
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={LaboraColors.primary} />
            <Text style={styles.loadingText}>Memuat data tagihan & pembayaran...</Text>
          </View>
        ) : activeTab === 'BILLS' ? (
          <FlatList<FineWithSession>
            data={activeFines}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <FineCard
                fine={item}
                onPayPress={(selectedFine) => void handlePayPress(selectedFine)}
                isPaying={payingFineId === item.id}
              />
            )}
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconBox}>
                  <Feather name="check-circle" size={26} color={LaboraColors.success} />
                </View>
                <Text style={styles.emptyTitle}>Tidak ada tagihan aktif</Text>
                <Text style={styles.emptySubtitle}>
                  Anda tidak memiliki tagihan denda keterlambatan yang belum dibayar.
                </Text>
              </View>
            }
          />
        ) : (
          <FlatList<PaymentWithSession>
            data={paymentHistory}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PaymentHistoryCard payment={item} onPress={onSelectPayment} />
            )}
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <View style={[styles.emptyIconBox, { backgroundColor: LaboraColors.primarySoft }]}>
                  <Feather name="file-text" size={26} color={LaboraColors.primary} />
                </View>
                <Text style={styles.emptyTitle}>Belum ada riwayat pembayaran</Text>
                <Text style={styles.emptySubtitle}>
                  Semua transaksi pembayaran denda melalui Midtrans akan tersimpan di sini.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LaboraColors.background,
  },
  wrapper: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.oneAndHalf,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: Radii.pill,
    backgroundColor: LaboraColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  topBarCenter: {
    flex: 1,
    marginLeft: Spacing.oneAndHalf,
  },
  topBarBrand: {
    fontSize: 10,
    fontWeight: '700',
    color: LaboraColors.primaryLight,
    letterSpacing: 1.2,
    marginBottom: -2,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  topBarSpacer: {
    width: 38,
  },
  headerSection: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.one,
  },
  heroCard: {
    backgroundColor: LaboraColors.primary,
    borderRadius: Radii.xlarge,
    padding: Spacing.twoAndHalf,
    marginBottom: Spacing.two,
    shadowColor: LaboraColors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 12,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.oneAndHalf,
  },
  heroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    gap: 6,
  },
  heroPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  heroCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FCE7EC',
  },
  heroLabel: {
    fontSize: 13,
    color: '#FCE7EC',
    marginBottom: 4,
  },
  heroAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: LaboraColors.surfaceMuted,
    borderRadius: Radii.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: Radii.pill,
  },
  tabButtonActive: {
    backgroundColor: LaboraColors.surface,
    shadowColor: '#0B192C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: LaboraColors.textSecondary,
  },
  tabTextActive: {
    color: LaboraColors.primary,
    fontWeight: '700',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LaboraColors.dangerSoft,
    borderRadius: Radii.medium,
    borderWidth: 1,
    borderColor: LaboraColors.dangerBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: Spacing.one,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  loadingText: {
    fontSize: 14,
    color: LaboraColors.textSecondary,
  },
  listContent: {
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.four,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: LaboraColors.surface,
    borderRadius: Radii.xlarge,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: Radii.pill,
    backgroundColor: LaboraColors.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.oneAndHalf,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: LaboraColors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
});
