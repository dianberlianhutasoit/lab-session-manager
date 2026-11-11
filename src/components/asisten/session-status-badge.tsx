import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import type { SessionStatus } from '@/types';

interface SessionStatusBadgeProps {
  status: SessionStatus;
  size?: 'small' | 'medium';
  isUpdating?: boolean;
}

export function SessionStatusBadge({
  status,
  size = 'medium',
  isUpdating = false,
}: SessionStatusBadgeProps) {
  const isOpen = status === 'OPEN';

  return (
    <View
      style={[
        styles.badge,
        isOpen ? styles.badgeOpen : styles.badgeClosed,
        size === 'small' && styles.badgeSmall,
      ]}>
      <View style={[styles.dot, isOpen ? styles.dotOpen : styles.dotClosed]} />
      <ThemedText
        type="smallBold"
        style={[
          styles.text,
          isOpen ? styles.textOpen : styles.textClosed,
          size === 'small' && styles.textSmall,
        ]}>
        {isUpdating
          ? 'MEMPERBARUI...'
          : isOpen
            ? 'SESI DIBUKA (OPEN)'
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
  textClosed: {
    color: '#475569',
  },
});
