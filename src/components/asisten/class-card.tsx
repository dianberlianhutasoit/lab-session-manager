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
import type { LabClass, User } from '@/types';
import { Spacing } from '@/constants/theme';

export interface LabClassWithDetails extends LabClass {
  assistant?: User;
  sessionCount: number;
}

interface ClassCardProps {
  labClass: LabClassWithDetails;
  onAddSession: (labClass: LabClassWithDetails) => void;
  onEdit: (labClass: LabClassWithDetails) => void;
  onDelete: (classId: string) => { success: boolean; message?: string } | Promise<{ success: boolean; message?: string }>;
}

export function ClassCard({
  labClass,
  onAddSession,
  onEdit,
  onDelete,
}: ClassCardProps) {
  const {
    courseCode,
    title,
    className,
    room,
    assistant,
    semester,
    capacity,
    sessionCount,
  } = labClass;

  const showAlertMessage = (alertTitle: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${alertTitle}\n\n${message}`);
    } else {
      Alert.alert(alertTitle, message);
    }
  };

  const handleDeletePress = async () => {
    if (sessionCount > 0) {
      showAlertMessage(
        'Penghapusan Ditolak',
        `Kelas "${title} (${className})" tidak dapat dihapus karena masih memiliki ${sessionCount} sesi praktikum terjadwal. Silakan hapus sesi terkait terlebih dahulu.`
      );
      return;
    }

    const confirmMessage = `Apakah Anda yakin ingin menghapus kelas "${title} (${className})"?`;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(confirmMessage);
      if (confirmed) {
        const res = await onDelete(labClass.id);
        if (!res.success && res.message) {
          showAlertMessage('Penghapusan Ditolak', res.message);
        }
      }
    } else {
      Alert.alert('Konfirmasi Hapus Kelas', confirmMessage, [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus Kelas',
          style: 'destructive',
          onPress: async () => {
            const res = await onDelete(labClass.id);
            if (!res.success && res.message) {
              showAlertMessage('Penghapusan Ditolak', res.message);
            }
          },
        },
      ]);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.badgesGroup}>
          <View style={styles.codeBadge}>
            <ThemedText type="smallBold" style={styles.codeText}>
              {courseCode}
            </ThemedText>
          </View>
          <View style={styles.classBadge}>
            <ThemedText type="smallBold" style={styles.classBadgeText}>
              {className}
            </ThemedText>
          </View>
        </View>

        <View
          style={[
            styles.sessionCountBadge,
            sessionCount > 0 ? styles.sessionCountActive : styles.sessionCountEmpty,
          ]}>
          <ThemedText
            type="smallBold"
            style={[
              styles.sessionCountText,
              sessionCount > 0 ? styles.sessionCountTextActive : styles.sessionCountTextEmpty,
            ]}>
            {sessionCount} Sesi
          </ThemedText>
        </View>
      </View>

      <ThemedText type="subtitle" style={styles.courseTitle}>
        {title}
      </ThemedText>

      <View style={styles.metaContainer}>
        <View style={styles.metaRow}>
          <ThemedText type="small" themeColor="textSecondary">
            📍 Ruangan Default:
          </ThemedText>
          <ThemedText type="smallBold">{room}</ThemedText>
        </View>

        <View style={styles.metaRow}>
          <ThemedText type="small" themeColor="textSecondary">
            👤 Asisten Pengampu:
          </ThemedText>
          <ThemedText type="small">{assistant?.name ?? '-'}</ThemedText>
        </View>

        {semester ? (
          <View style={styles.metaRow}>
            <ThemedText type="small" themeColor="textSecondary">
              🎓 Semester:
            </ThemedText>
            <ThemedText type="small">{semester}</ThemedText>
          </View>
        ) : null}

        {capacity !== undefined ? (
          <View style={styles.metaRow}>
            <ThemedText type="small" themeColor="textSecondary">
              👥 Kapasitas Kelas:
            </ThemedText>
            <ThemedText type="smallBold" style={styles.capacityText}>
              {capacity} Praktikan
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => onAddSession(labClass)}
          style={({ pressed }) => [styles.addSessionButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.addSessionButtonText}>
            + Buat Sesi
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => onEdit(labClass)}
          style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.editButtonText}>
            Edit
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handleDeletePress}
          style={({ pressed }) => [
            styles.deleteButton,
            sessionCount > 0 && styles.deleteButtonDisabled,
            pressed && styles.pressed,
          ]}>
          <ThemedText
            type="smallBold"
            style={[
              styles.deleteButtonText,
              sessionCount > 0 && styles.deleteButtonTextDisabled,
            ]}>
            Hapus
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
    gap: 8,
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
  sessionCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sessionCountActive: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  sessionCountEmpty: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sessionCountText: {
    fontSize: 11,
  },
  sessionCountTextActive: {
    color: '#15803D',
  },
  sessionCountTextEmpty: {
    color: '#64748B',
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
  capacityText: {
    color: '#0284C7',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 4,
  },
  addSessionButton: {
    flex: 1.4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  addSessionButtonText: {
    color: '#FFFFFF',
  },
  editButton: {
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
  editButtonText: {
    color: '#334155',
  },
  deleteButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
  deleteButtonDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  deleteButtonText: {
    color: '#DC2626',
  },
  deleteButtonTextDisabled: {
    color: '#94A3B8',
  },
  pressed: {
    opacity: 0.75,
  },
});

