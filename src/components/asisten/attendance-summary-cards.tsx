import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

interface AttendanceSummaryCardsProps {
  presentCount: number;
  totalStudents: number;
  sessionStatus: 'OPEN' | 'CLOSED';
}

export function AttendanceSummaryCards({
  presentCount,
  totalStudents,
  sessionStatus,
}: AttendanceSummaryCardsProps) {
  const percentage =
    totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  const absentCount = Math.max(0, totalStudents - presentCount);

  return (
    <View style={styles.container}>
      <ThemedView type="backgroundElement" style={[styles.card, styles.cardPresent]}>
        <ThemedText type="small" style={styles.labelPresent}>
          Praktikan Hadir
        </ThemedText>
        <ThemedText type="title" style={styles.valuePresent}>
          {presentCount}
        </ThemedText>
        <ThemedText type="small" style={styles.subtextPresent}>
          dari {totalStudents} praktikan
        </ThemedText>
      </ThemedView>

      <ThemedView type="backgroundElement" style={[styles.card, styles.cardRate]}>
        <ThemedText type="small" style={styles.labelRate}>
          Tingkat Kehadiran
        </ThemedText>
        <ThemedText type="title" style={styles.valueRate}>
          {percentage}%
        </ThemedText>
        <ThemedText type="small" style={styles.subtextRate}>
          {absentCount} belum hadir
        </ThemedText>
      </ThemedView>

      <ThemedView type="backgroundElement" style={[styles.card, styles.cardStatus]}>
        <ThemedText type="small" themeColor="textSecondary">
          Status Sesi
        </ThemedText>
        <ThemedText
          type="subtitle"
          style={sessionStatus === 'OPEN' ? styles.statusOpen : styles.statusClosed}>
          {sessionStatus === 'OPEN' ? 'DIBUKA' : 'DITUTUP'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {sessionStatus === 'OPEN' ? 'Presensi aktif' : 'Presensi ditutup'}
        </ThemedText>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  card: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  cardPresent: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  labelPresent: {
    color: '#15803D',
    fontSize: 11,
  },
  valuePresent: {
    color: '#16A34A',
    fontSize: 22,
    lineHeight: 26,
  },
  subtextPresent: {
    color: '#15803D',
    fontSize: 11,
  },
  cardRate: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  labelRate: {
    color: '#1D4ED8',
    fontSize: 11,
  },
  valueRate: {
    color: '#2563EB',
    fontSize: 22,
    lineHeight: 26,
  },
  subtextRate: {
    color: '#1D4ED8',
    fontSize: 11,
  },
  cardStatus: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusOpen: {
    color: '#16A34A',
    fontSize: 15,
  },
  statusClosed: {
    color: '#64748B',
    fontSize: 15,
  },
});
