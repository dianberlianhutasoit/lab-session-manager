import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import type { SessionStatus, Sprint4SessionStatus } from '@/types';

interface SessionStatusBadgeProps {
  status: SessionStatus | Sprint4SessionStatus;
  size?: 'small' | 'medium';
  isUpdating?: boolean;
}

export function SessionStatusBadge({
  status,
  size = 'medium',
  isUpdating = false,
}: SessionStatusBadgeProps) {
  const isOpen = status === 'OPEN';
  const isScheduled = status === 'SCHEDULED';

  return (
    <View
      style={[
        styles.badge,
        isOpen ? styles.badgeOpen : isScheduled ? styles.badgeScheduled : styles.badgeClosed,
        size === 'small' && styles.badgeSmall,
      ]}>
      <View
        style={[
          styles.dot,
          isOpen ? styles.dotOpen : isScheduled ? styles.dotScheduled : styles.dotClosed,
        ]}
      />
      <ThemedText
        type="smallBold"
        style={[
          styles.text,
          isOpen ? styles.textOpen : isScheduled ? styles.textScheduled : styles.textClosed,
          size === 'small' && styles.textSmall,
        ]}>
        {isUpdating
          ? 'MEMPERBARUI...'
          : isOpen
            ? 'SESI DIBUKA (OPEN)'
            : isScheduled
              ? 'TERJADWAL (SCHEDULED)'
              : 'SESI DITUTUP (CLOSED)'}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 4,
  },
  badgeOpen: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  badgeScheduled: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  badgeClosed: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOpen: {
    backgroundColor: '#16A34A',
  },
  dotScheduled: {
    backgroundColor: '#D97706',
  },
  dotClosed: {
    backgroundColor: '#64748B',
  },
  text: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  textSmall: {
    fontSize: 11,
  },
  textOpen: {
    color: '#15803D',
  },
  textScheduled: {
    color: '#B45309',
  },
  textClosed: {
    color: '#475569',
  },
});
