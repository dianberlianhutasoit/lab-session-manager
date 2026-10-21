import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { AttendanceRecord } from '@/types';

interface AttendanceRecordCardProps {
  record: AttendanceRecord;
  index: number;
}

export function formatAttendanceTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;

    const day = d.getDate().toString().padStart(2, '0');
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');

    return `${day} ${month} ${year}, ${hours}:${minutes} WIB`;
  } catch {
    return dateString;
  }
}

export function AttendanceRecordCard({ record, index }: AttendanceRecordCardProps) {
  const initial = record.userName.charAt(0).toUpperCase();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {/* Index Number */}
      <View style={styles.numberBadge}>
        <ThemedText type="smallBold" style={styles.numberText}>
          #{index + 1}
        </ThemedText>
      </View>

      {/* Avatar Circle */}
      <View style={styles.avatar}>
        <ThemedText type="smallBold" style={styles.avatarText}>
          {initial}
        </ThemedText>
      </View>

      {/* Student Details */}
      <View style={styles.infoCol}>
        <ThemedText type="smallBold" style={styles.nameText}>
          {record.userName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.emailText}>
          {record.userEmail}
        </ThemedText>
        <View style={styles.timeRow}>
          <ThemedText type="small" style={styles.timeLabel}>
            🕒 Presensi:
          </ThemedText>
          <ThemedText type="small" style={styles.timeValue}>
            {formatAttendanceTime(record.recordedAt)}
          </ThemedText>
        </View>
      </View>

      {/* Status Badge */}
      <View style={styles.statusBadge}>
        <ThemedText type="smallBold" style={styles.statusText}>
          Hadir
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 14,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  numberBadge: {
    width: 28,
    alignItems: 'center',
  },
  numberText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  nameText: {
    fontSize: 15,
  },
  emailText: {
    fontSize: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  timeLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  timeValue: {
    fontSize: 11,
    color: '#0369A1',
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  statusText: {
    color: '#15803D',
    fontSize: 11,
  },
});
