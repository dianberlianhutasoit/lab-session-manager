import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import type { SessionStatus } from '@/types';

interface SessionStatusBadgeProps {
  status: SessionStatus;
  size?: 'small' | 'medium';
}

export function SessionStatusBadge({ status, size = 'medium' }: SessionStatusBadgeProps) {
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
        {isOpen ? 'SESI DIBUKA' : 'SESI DITUTUP'}
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
    backgroundColor: '#DCFCE7', // Tailwind green-100
    borderWidth: 1,
    borderColor: '#86EFAC', // Tailwind green-300
  },
  badgeClosed: {
    backgroundColor: '#F1F5F9', // Tailwind slate-100
    borderWidth: 1,
    borderColor: '#CBD5E1', // Tailwind slate-300
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOpen: {
    backgroundColor: '#16A34A', // Tailwind green-600
  },
  dotClosed: {
    backgroundColor: '#64748B', // Tailwind slate-500
  },
  text: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  textSmall: {
    fontSize: 11,
  },
  textOpen: {
    color: '#15803D', // Tailwind green-700
  },
  textClosed: {
    color: '#475569', // Tailwind slate-600
  },
});
