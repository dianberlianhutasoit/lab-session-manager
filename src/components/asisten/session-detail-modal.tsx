import React from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SessionStatusBadge } from './session-status-badge';
import type { SessionWithDetails } from '@/context/session-context';
import { Spacing } from '@/constants/theme';

interface SessionDetailModalProps {
  session: SessionWithDetails | null;
  visible: boolean;
  onClose: () => void;
  onToggleStatus: (sessionId: string) => void;
}

export function SessionDetailModal({
  session,
  visible,
  onClose,
  onToggleStatus,
}: SessionDetailModalProps) {
  if (!session) return null;

  const { schedule, assistant, status, attendanceCount } = session;
  const isOpen = status === 'OPEN';

  const handleToggle = () => {
    onToggleStatus(session.id);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <ThemedView style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <ThemedText type="small" themeColor="textSecondary">
                DETAIL SESI PRAKTIKUM
              </ThemedText>
              <ThemedText type="subtitle" style={styles.titleText}>
                {schedule?.title ?? 'Sesi Praktikum'}
              </ThemedText>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <ThemedText style={styles.closeButtonText}>✕</ThemedText>
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Status Section (SRS-07) */}
            <View style={styles.statusSection}>
              <ThemedText type="small" themeColor="textSecondary">
                Status Sesi Saat Ini:
              </ThemedText>
              <SessionStatusBadge status={status} />
            </View>

            {/* Schedule Details (SRS-05) */}
            <View style={styles.infoGroup}>
              <ThemedText type="smallBold" style={styles.sectionLabel}>
                Informasi Jadwal & Laboratorium
              </ThemedText>

              <View style={styles.infoRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
                  Kode Praktikum
                </ThemedText>
                <ThemedText type="smallBold">{schedule?.courseCode ?? '-'}</ThemedText>
              </View>

              <View style={styles.infoRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
                  Ruangan
                </ThemedText>
                <ThemedText type="small">{schedule?.room ?? '-'}</ThemedText>
              </View>

              <View style={styles.infoRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
                  Tanggal
                </ThemedText>
                <ThemedText type="small">{schedule?.date ?? '-'}</ThemedText>
              </View>

              <View style={styles.infoRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
                  Waktu
                </ThemedText>
                <ThemedText type="small">
                  {schedule?.startTime} - {schedule?.endTime} WIB
                </ThemedText>
              </View>
            </View>

            {/* Assistant Details (SRS-05) */}
            <View style={styles.infoGroup}>
              <ThemedText type="smallBold" style={styles.sectionLabel}>
                Asisten Penanggung Jawab
              </ThemedText>

              <View style={styles.infoRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
                  Nama Asisten
                </ThemedText>
                <ThemedText type="smallBold">{assistant?.name ?? 'Tidak Ditugaskan'}</ThemedText>
              </View>

              <View style={styles.infoRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
                  Email
                </ThemedText>
                <ThemedText type="small">{assistant?.email ?? '-'}</ThemedText>
              </View>
            </View>

            {/* Attendance Summary */}
            <View style={styles.infoGroup}>
              <ThemedText type="smallBold" style={styles.sectionLabel}>
                Kehadiran Praktikan
              </ThemedText>

              <View style={styles.infoRow}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
                  Total Presensi
                </ThemedText>
                <ThemedText type="smallBold">{attendanceCount} Praktikan</ThemedText>
              </View>
            </View>
          </ScrollView>

          {/* Action Footer (SRS-06) */}
          <View style={styles.footer}>
            <Pressable
              onPress={handleToggle}
              style={[
                styles.actionButton,
                isOpen ? styles.actionButtonClose : styles.actionButtonOpen,
              ]}>
              <ThemedText style={styles.actionButtonText}>
                {isOpen ? '🔴 Tutup Sesi Sekarang' : '🟢 Buka Sesi Sekarang'}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleWrap: {
    flex: 1,
    gap: 4,
  },
  titleText: {
    fontSize: 18,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.two,
  },
  closeButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: 'bold',
  },
  body: {
    flexGrow: 1,
  },
  bodyContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.three,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  infoGroup: {
    gap: Spacing.two,
  },
  sectionLabel: {
    fontSize: 13,
    color: '#0284C7',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    flex: 1,
  },
  footer: {
    padding: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  actionButtonOpen: {
    backgroundColor: '#16A34A',
  },
  actionButtonClose: {
    backgroundColor: '#DC2626',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
