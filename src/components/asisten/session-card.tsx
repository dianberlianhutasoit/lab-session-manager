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
  onEditSession?: (session: SessionWithDetails) => void;
  onDeleteSession?: (sessionId: string) => void;
}

export function SessionCard({
  session,
  onOpenDetail,
  onToggleStatus,
  onEditSession,
  onDeleteSession,
}: SessionCardProps) {
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

  const handleDeleteWithConfirmation = () => {
    if (!onDeleteSession) return;
    const courseTitle = schedule?.title ?? 'sesi ini';

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        `Apakah Anda yakin ingin menghapus jadwal sesi praktikum "${courseTitle}"?`
      );
      if (confirmed) {
        onDeleteSession(session.id);
      }
    } else {
      Alert.alert(
        'Konfirmasi Hapus Sesi',
        `Apakah Anda yakin ingin menghapus jadwal sesi praktikum "${courseTitle}"?`,
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Hapus Sesi',
            style: 'destructive',
            onPress: () => onDeleteSession(session.id),
          },
        ]
      );
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {/* Header: Course Code, Class Badge & Status Badge (SRS-07) */}
      <View style={styles.topRow}>
        <View style={styles.badgesGroup}>
          <View style={styles.codeBadge}>
            <ThemedText type="smallBold" style={styles.codeText}>
              {schedule?.courseCode ?? 'LAB'}
            </ThemedText>
          </View>
          {schedule?.className ? (
            <View style={styles.classBadge}>
              <ThemedText type="smallBold" style={styles.classBadgeText}>
                {schedule.className}
              </ThemedText>
            </View>
          ) : null}
          {schedule?.sessionNumber !== undefined ? (
            <View style={styles.sessionNumBadge}>
              <ThemedText type="smallBold" style={styles.sessionNumText}>
                Sesi {schedule.sessionNumber}
              </ThemedText>
            </View>
          ) : null}
        </View>
        <SessionStatusBadge status={status} size="small" />
      </View>

      {/* Main Info: Title & Topic (SRS-05, SRS-07) */}
      <View style={styles.titleBlock}>
        <ThemedText type="subtitle" style={styles.courseTitle}>
          {schedule?.title ?? 'Praktikum'}
        </ThemedText>
        {schedule?.topic ? (
          <ThemedText type="small" themeColor="textSecondary">
            📖 Topik: {schedule.topic}
          </ThemedText>
        ) : null}
      </View>

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

      {/* Action Buttons (SRS-05 Detail, SRS-06 Toggle, SRS-07 Edit & Delete) */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => onOpenDetail(session)}
          style={({ pressed }) => [styles.detailButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.detailButtonText}>
            Detail
          </ThemedText>
        </Pressable>

        {onEditSession ? (
          <Pressable
            onPress={() => onEditSession(session)}
            style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.editButtonText}>
              Edit
            </ThemedText>
          </Pressable>
        ) : null}

        {onDeleteSession ? (
          <Pressable
            onPress={handleDeleteWithConfirmation}
            style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
            <ThemedText type="smallBold" style={styles.deleteButtonText}>
              Hapus
            </ThemedText>
          </Pressable>
        ) : null}

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
  badgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
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
  classBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  classBadgeText: {
    color: '#4F46E5',
    fontSize: 11,
  },
  sessionNumBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sessionNumText: {
    color: '#475569',
    fontSize: 11,
  },
  titleBlock: {
    gap: 4,
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
    flex: 0.9,
    paddingVertical: 10,
    paddingHorizontal: 10,
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
  editButton: {
    flex: 0.8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  editButtonText: {
    color: '#0369A1',
  },
  deleteButton: {
    flex: 0.8,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  deleteButtonText: {
    color: '#DC2626',
  },
  toggleButton: {
    flex: 1.3,
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
