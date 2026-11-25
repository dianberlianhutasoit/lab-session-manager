import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { LaboraColors, Radii, Spacing } from '@/constants/theme';
import type { FineWithSession } from '@/features/payment/types';

export interface FineCardProps {
  fine: FineWithSession;
  onPayPress: (fine: FineWithSession) => void;
  isPaying?: boolean;
}

export function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString('id-ID')}`;
}

function formatDate(isoString?: string): string {
  if (!isoString) return '-';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function FineCard({ fine, onPayPress, isPaying = false }: FineCardProps) {
  const isPending = fine.status === 'pending';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.sessionInfo}>
          <Text style={styles.labTag}>LAB {fine.labId.toUpperCase()}</Text>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {fine.sessionTitle}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            isPending ? styles.statusPendingBg : styles.statusUnpaidBg,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isPending ? LaboraColors.warning : LaboraColors.danger },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isPending ? '#B45309' : '#B91C1C' },
            ]}
          >
            {isPending ? 'MENUNGGU' : 'BELUM BAYAR'}
          </Text>
        </View>
      </View>

      <View style={styles.reasonBox}>
        <Feather name="clock" size={14} color={LaboraColors.primary} />
        <Text style={styles.reasonText} numberOfLines={2}>
          {fine.reason}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.footerRow}>
        <View>
          <Text style={styles.amountLabel}>Nominal Denda • {formatDate(fine.createdAt)}</Text>
          <Text style={styles.amountValue}>{formatRupiah(fine.amount)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, isPaying && styles.payButtonDisabled]}
          onPress={() => onPayPress(fine)}
          activeOpacity={0.8}
          disabled={isPaying}
        >
          <Feather name="credit-card" size={14} color={LaboraColors.primaryText} />
          <Text style={styles.payButtonText}>
            {isPending ? 'Lanjutkan' : 'Bayar Sekarang'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: LaboraColors.card,
    borderRadius: Radii.xlarge,
    padding: Spacing.two,
    marginBottom: Spacing.oneAndHalf,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    shadowColor: '#0B192C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.one,
    marginBottom: Spacing.oneAndHalf,
  },
  sessionInfo: {
    flex: 1,
  },
  labTag: {
    fontSize: 10,
    fontWeight: '700',
    color: LaboraColors.primaryLight,
    letterSpacing: 0.9,
    marginBottom: 2,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    gap: 5,
  },
  statusUnpaidBg: {
    backgroundColor: LaboraColors.dangerSoft,
  },
  statusPendingBg: {
    backgroundColor: LaboraColors.warningSoft,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: Radii.pill,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LaboraColors.primarySoft,
    borderRadius: Radii.medium,
    paddingHorizontal: 12,
    paddingVertical: 9,
    gap: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: LaboraColors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: LaboraColors.cardBorder,
    marginVertical: Spacing.oneAndHalf,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: LaboraColors.textSecondary,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LaboraColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radii.pill,
    gap: 6,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: LaboraColors.primaryText,
  },
});
