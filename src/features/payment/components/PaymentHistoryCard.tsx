import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { LaboraColors, Radii, Spacing } from '@/constants/theme';
import { formatRupiah } from '@/features/payment/components/FineCard';
import type { PaymentStatus, PaymentWithSession } from '@/features/payment/types';

export interface PaymentHistoryCardProps {
  payment: PaymentWithSession;
  onPress?: (payment: PaymentWithSession) => void;
}

interface PaymentBadgeConfig {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  bg: string;
  text: string;
  iconBg: string;
  iconColor: string;
}

function getStatusConfig(status: PaymentStatus): PaymentBadgeConfig {
  switch (status) {
    case 'success':
      return {
        label: 'Lunas',
        icon: 'check-circle',
        bg: LaboraColors.successSoft,
        text: LaboraColors.successDark,
        iconBg: LaboraColors.successSoft,
        iconColor: LaboraColors.success,
      };
    case 'failed':
      return {
        label: 'Gagal',
        icon: 'x-circle',
        bg: LaboraColors.dangerSoft,
        text: '#B91C1C',
        iconBg: LaboraColors.dangerSoft,
        iconColor: LaboraColors.danger,
      };
    default:
      return {
        label: 'Menunggu',
        icon: 'clock',
        bg: LaboraColors.warningSoft,
        text: '#B45309',
        iconBg: LaboraColors.warningSoft,
        iconColor: LaboraColors.warning,
      };
  }
}

function formatTransactionDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PaymentHistoryCard({ payment, onPress }: PaymentHistoryCardProps) {
  const badge = getStatusConfig(payment.status);
  const displayDate = payment.settledAt || payment.createdAt;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(payment)}
      activeOpacity={onPress ? 0.78 : 1}
      disabled={!onPress}
    >
      <View style={[styles.iconBox, { backgroundColor: badge.iconBg }]}>
        <Feather name={badge.icon} size={20} color={badge.iconColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={styles.sessionTitle} numberOfLines={1}>
            {payment.sessionTitle}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        {payment.fineReason && (
          <Text style={styles.reasonText} numberOfLines={1}>
            {payment.fineReason}
          </Text>
        )}

        <View style={styles.bottomRow}>
          <View style={styles.metaCol}>
            <Text style={styles.dateText}>{formatTransactionDate(displayDate)}</Text>
            <Text style={styles.orderIdText} numberOfLines={1}>
              Order: {payment.orderId}
            </Text>
          </View>
          <Text style={styles.amountText}>{formatRupiah(payment.amount)}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: LaboraColors.card,
    borderRadius: Radii.large,
    padding: Spacing.two,
    marginBottom: Spacing.oneAndHalf,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    shadowColor: '#0B192C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: Spacing.oneAndHalf,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.one,
    marginBottom: 4,
  },
  sessionTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  reasonText: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: Spacing.one,
    marginTop: 2,
  },
  metaCol: {
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: LaboraColors.textSecondary,
  },
  orderIdText: {
    fontSize: 11,
    color: LaboraColors.textMuted,
    marginTop: 2,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
});
