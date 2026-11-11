import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { SessionWithDetails } from '@/context/session-context';
import type { SessionStatusLog, User } from '@/types';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { formatTimeWIB } from './active-sessions-banner';
import { confirmSessionStatusChange } from './session-card';
import { SessionStatusBadge } from './session-status-badge';

interface SessionDetailModalProps {
  session: SessionWithDetails | null;
  visible: boolean;
  selectedAssistantId?: string;
  activeAssistant?: User;
  isUpdating?: boolean;
  statusLogs?: SessionStatusLog[];
  onClose: () => void;
  onToggleStatus: (sessionId: string) => void;
  onEditSession?: (session: SessionWithDetails) => void;
}

export function SessionDetailModal({
  session,
  visible,
  selectedAssistantId,
  activeAssistant,
  isUpdating = false,
  statusLogs = [],
  onClose,
  onToggleStatus,
  onEditSession,
}: SessionDetailModalProps) {
  if (!session) return null;

  const {
    schedule,
    assistant,
    lastUpdatedByUser,
    status,
    openedAt,
    closedAt,
    attendanceCount,
  } = session;
  const isOpen = status === 'OPEN';

  const handleToggleWithConfirmation = () => {
    confirmSessionStatusChange({
      session,
      selectedAssistantId,
      activeAssistant,
      onConfirm: () => onToggleStatus(session.id),
    });
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
                DETAIL & KONTROL STATUS SESI (SRS-08)
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
            {/* Status Section (SRS-08) */}
            <View style={styles.statusSection}>
              <View style={styles.statusHeaderRow}>
                <ThemedText type="smallBold" style={styles.statusLabel}>
                  Status Sesi Saat Ini:
                </ThemedText>
                <SessionStatusBadge status={status} isUpdating={isUpdating} />
              </View>

              <View style={styles.statusTimestampsBox}>
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Waktu Terakhir Dibuka (OPEN):
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {formatTimeWIB(openedAt)}
                  </ThemedText>
                </View>

                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Waktu Terakhir Ditutup (CLOSED):
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {formatTimeWIB(closedAt)}
                  </ThemedText>
                </View>

                {lastUpdatedByUser ? (
                  <View style={styles.infoRow}>
                    <ThemedText type="small" themeColor="textSecondary">
                      Terakhir Diubah Oleh:
                    </ThemedText>
                    <ThemedText type="small">
                      👤 {lastUpdatedByUser.name}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Schedule Details (SRS-05, SRS-07) */}
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

              {schedule?.className ? (
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
                    Kelas
                  </ThemedText>
                  <ThemedText type="smallBold">{schedule.className}</ThemedText>
                </View>
              ) : null}

              {schedule?.sessionNumber !== undefined ? (
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
                    Pertemuan Ke-
                  </ThemedText>
                  <ThemedText type="small">{schedule.sessionNumber}</ThemedText>
                </View>
              ) : null}

              {schedule?.topic ? (
                <View style={styles.infoRow}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
                    Topik Materi
                  </ThemedText>
                  <ThemedText type="small" style={styles.topicValue}>{schedule.topic}</ThemedText>
                </View>
              ) : null}

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

            {/* SRS-08: Riwayat Perubahan Status Sesi (Audit Log) */}
            <View style={styles.infoGroup}>
              <ThemedText type="smallBold" style={styles.sectionLabel}>
                Riwayat Perubahan Status Sesi ({statusLogs.length})
              </ThemedText>

              {statusLogs.length === 0 ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Belum ada catatan riwayat perubahan status pada sesi ini.
                </ThemedText>
              ) : (
                <View style={styles.logsList}>
                  {statusLogs.slice(0, 5).map((log) => {
                    const isOpened = log.newStatus === 'OPEN';
                    return (
                      <View key={log.id} style={styles.logItem}>
                        <View style={styles.logItemHeader}>
                          <ThemedText
                            type="smallBold"
                            style={isOpened ? styles.logStatusOpen : styles.logStatusClosed}>
                            {isOpened ? '🟢 DIBUKA (OPEN)' : '🔴 DITUTUP (CLOSED)'}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {formatTimeWIB(log.changedAt)}
                          </ThemedText>
                        </View>
                        <ThemedText type="small" themeColor="textSecondary">
                          Oleh: {log.changedByName}
                          {log.isSubstitute ? ' (Asisten Pengganti)' : ''}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Action Footer (SRS-07, SRS-08) */}
          <View style={styles.footer}>
            {onEditSession ? (
              <Pressable
                onPress={() => {
                  onClose();
                  onEditSession(session);
                }}
                style={styles.editModalButton}>
                <ThemedText type="smallBold" style={styles.editModalButtonText}>
                  ✏️ Edit Jadwal
                </ThemedText>
              </Pressable>
            ) : null}

            <Pressable
              disabled={isUpdating}
              onPress={handleToggleWithConfirmation}
              style={[
                styles.actionButton,
                isOpen ? styles.actionButtonClose : styles.actionButtonOpen,
                isUpdating && styles.disabledButton,
              ]}>
              <ThemedText style={styles.actionButtonText}>
                {isUpdating
                  ? '⏳ Memproses Status...'
                  : isOpen
                    ? '🔴 Tutup Sesi Sekarang'
                    : '🟢 Buka Sesi Sekarang'}
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
    maxHeight: '88%',
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
    padding: Spacing.three,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: Spacing.two,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabel: {
    color: '#334155',
  },
  statusTimestampsBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#CBD5E1',
    paddingTop: 8,
    gap: 2,
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
  topicValue: {
    flex: 1.5,
    textAlign: 'right',
  },
  logsList: {
    gap: 8,
  },
  logItem: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
    gap: 2,
  },
  logItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logStatusOpen: {
    color: '#15803D',
    fontSize: 12,
  },
  logStatusClosed: {
    color: '#B91C1C',
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  editModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  editModalButtonText: {
    color: '#0369A1',
  },
  actionButton: {
    flex: 1.4,
    paddingVertical: 12,
    paddingHorizontal: 16,
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
  disabledButton: {
    opacity: 0.55,
  },
});
