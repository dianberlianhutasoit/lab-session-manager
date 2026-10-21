import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SessionStatusBadge } from './session-status-badge';
import type { SessionWithDetails } from '@/context/session-context';
import { Spacing } from '@/constants/theme';

interface SessionCardProps {
  session: SessionWithDetails;
  onOpenDetail: (session: SessionWithDetails) => void;
  onToggleStatus: (sessionId: string) => void;
}

export function SessionCard({ session, onOpenDetail, onToggleStatus }: SessionCardProps) {
  const { schedule, assistant, status, attendanceCount } = session;
  const isOpen = status === 'OPEN';

  const handleToggleWithConfirmation = () => {
    const actionText = isOpen ? 'menutup' : 'membuka';
    const courseTitle = schedule?.title ?? 'sesi ini';

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Apakah Anda yakin ingin ${actionText} sesi praktikum "${courseTitle}"?`
      );
      if (confirmed) {
        onToggleStatus(session.id);
      }
    } else {
      Alert.alert(
        'Konfirmasi Status Sesi',
        `Apakah Anda yakin ingin ${actionText} sesi praktikum "${courseTitle}"?`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: isOpen ? 'Tutup Sesi' : 'Buka Sesi',
            style: isOpen ? 'destructive' : 'default',
            onPress: () => onToggleStatus(session.id),
          },
        ]
      );
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {/* Header: Course Code & Status Badge (SRS-07) */}
      <View style={styles.topRow}>
        <View style={styles.codeBadge}>
          <ThemedText type="smallBold" style={styles.codeText}>
            {schedule?.courseCode ?? 'LAB'}
          </ThemedText>
        </View>
        <SessionStatusBadge status={status} size="small" />
      </View>

      {/* Main Info: Title (SRS-05) */}
      <ThemedText type="subtitle" style={styles.courseTitle}>
        {schedule?.title ?? 'Praktikum'}
      </ThemedText>

      {/* Detail Meta: Ruangan, Tanggal, Jam (SRS-05) */}
      <View style={styles.metaContainer}>
        <View style={styles.metaRow}>
          <ThemedText type="small" themeColor="textSecondary">
            📍 Ruang:
          </ThemedText>
          <ThemedText type="smallBold">
            {schedule?.room ?? '-'}
          </ThemedText>
        </View>

        <View style={styles.metaRow}>
          <ThemedText type="small" themeColor="textSecondary">
            📅 Jadwal:
          </ThemedText>
          <ThemedText type="small">
            {schedule?.date} ({schedule?.startTime} - {schedule?.endTime})
          </ThemedText>
        </View>

        <View style={styles.metaRow}>
          <ThemedText type="small" themeColor="textSecondary">
            👤 Asisten:
          </ThemedText>
          <ThemedText type="small">
            {assistant?.name ?? '-'}
          </ThemedText>
        </View>

        <View style={styles.metaRow}>
          <ThemedText type="small" themeColor="textSecondary">
            👥 Kehadiran:
          </ThemedText>
          <ThemedText type="smallBold" style={styles.attendanceText}>
            {attendanceCount} Praktikan
          </ThemedText>
        </View>
      </View>

      {/* Action Buttons (SRS-05 Detail & SRS-06 Toggle) */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => onOpenDetail(session)}
          style={({ pressed }) => [styles.detailButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.detailButtonText}>
            Lihat Detail
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handleToggleWithConfirmation}
          style={({ pressed }) => [
            styles.toggleButton,
            isOpen ? styles.toggleButtonClose : styles.toggleButtonOpen,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={styles.toggleButtonText}>
            {isOpen ? 'Tutup Sesi' : 'Buka Sesi'}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  codeBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeText: {
    color: '#0369A1',
    fontSize: 11,
  },
  courseTitle: {
    fontSize: 18,
    lineHeight: 24,
  },
  metaContainer: {
    gap: 6,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceText: {
    color: '#0284C7',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 4,
  },
  detailButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  detailButtonText: {
    color: '#334155',
  },
  toggleButton: {
    flex: 1.2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  toggleButtonOpen: {
    backgroundColor: '#16A34A',
  },
  toggleButtonClose: {
    backgroundColor: '#DC2626',
  },
  toggleButtonText: {
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.75,
  },
});
