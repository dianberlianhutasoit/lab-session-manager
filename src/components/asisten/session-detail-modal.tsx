import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { LaboraColors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useSessionContext, type SessionWithDetails } from '@/context/session-context';
import {
  getEffectiveSessionStatus,
  isAsprakAssignedToSession,
  type RosterDisplayStatus,
} from '@/features/asprak/asprak-dashboard-helpers';
import { resolveSessionConfigSnapshotOptional } from '@/features/asprak/services/session-snapshot-helpers';
import { findLabForRoom } from '@/utils/attendance-location';
import type { FineStatus, SessionStatusLog, User } from '@/types';
import { confirmSessionStatusChange } from './session-card';
import { SessionStatusBadge } from './session-status-badge';
import { SessionQRModal } from './session-qr-modal';

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

function formatCheckInTime(iso?: string): string {
  if (!iso) return '-';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '-';
  return `${parsed.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })} WIB`;
}

function getFineBadgeMeta(status: FineStatus): {
  label: string;
  bg: string;
  color: string;
} {
  switch (status) {
    case 'unpaid':
      return { label: 'Denda: unpaid', bg: '#FEE2E2', color: '#B91C1C' };
    case 'pending':
      return { label: 'Denda: pending', bg: '#FEF3C7', color: '#B45309' };
    case 'paid':
      return { label: 'Denda: paid', bg: '#DCFCE7', color: '#15803D' };
    case 'waived':
      return { label: 'Denda: waived', bg: '#E0F2FE', color: '#0369A1' };
  }
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
  const { profile } = useAuth();
  const {
    labs,
    isFirestoreConnected,
    actionError,
    getCourseById,
    getLabById,
    getSessionRoster,
  } = useSessionContext();
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<
    'ALL' | RosterDisplayStatus
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const roster = useMemo(() => {
    return session ? getSessionRoster(session.id) : [];
  }, [session, getSessionRoster]);

  const totalCount = roster.length;
  const presentCount = roster.filter((s) => s.attendanceStatus === 'PRESENT').length;
  const excusedCount = roster.filter((s) => s.attendanceStatus === 'EXCUSED').length;
  const absentCount = roster.filter(
    (s) => s.attendanceStatus === 'ABSENT' || s.attendanceStatus === 'PENDING_CHECKIN'
  ).length;
  const lateCount = roster.filter((s) => s.isLate).length;
  const tingkatHadirPct =
    totalCount > 0 ? Math.round(((presentCount + excusedCount) / totalCount) * 1000) / 10 : 0;

  const filteredStudentList = useMemo(() => {
    return roster.filter((stu) => {
      if (selectedFilter !== 'ALL') {
        if (selectedFilter === 'ABSENT') {
          if (
            stu.attendanceStatus !== 'ABSENT' &&
            stu.attendanceStatus !== 'PENDING_CHECKIN'
          ) {
            return false;
          }
        } else if (stu.attendanceStatus !== selectedFilter) {
          return false;
        }
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          stu.name.toLowerCase().includes(q) ||
          stu.nim.toLowerCase().includes(q) ||
          stu.email.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [roster, selectedFilter, searchQuery]);

  if (!session) return null;

  const { schedule, assistant } = session;
  const effectiveStatus = getEffectiveSessionStatus(session);
  const isOpen = effectiveStatus === 'OPEN';
  const actingUserId = profile?.id ?? selectedAssistantId;
  const isAuthorized = isAsprakAssignedToSession(session, actingUserId);

  const relatedCourse = getCourseById(session.courseId);
  const relatedLab =
    (session.labId ? getLabById(session.labId) : undefined) ??
    findLabForRoom(labs, schedule?.room);
  const configSnapshot = resolveSessionConfigSnapshotOptional(
    relatedLab,
    session.configSnapshot
  );

  const handleToggleWithConfirmation = () => {
    if (!isAuthorized) return;
    confirmSessionStatusChange({
      session,
      selectedAssistantId: actingUserId,
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
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={onClose} style={styles.backButton}>
              <Feather name="arrow-left" size={18} color={LaboraColors.primary} />
            </Pressable>
            <ThemedText style={styles.headerTitle}>Detail Sesi Praktikum</ThemedText>
            <View style={styles.avatarCircle}>
              <ThemedText style={styles.avatarInitial}>
                {assistant?.name?.trim().charAt(0).toUpperCase() || 'A'}
              </ThemedText>
            </View>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {/* Course Title & Room Details */}
            <View style={styles.courseHeader}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <ThemedText style={[styles.courseTitle, { flex: 1 }]}>
                  {relatedCourse?.name ?? schedule?.title ?? 'Sesi Praktikum'}
                </ThemedText>
                <SessionStatusBadge status={effectiveStatus} size="small" isUpdating={isUpdating} />
              </View>
              <View style={styles.metaRow}>
                <Feather name="map-pin" size={13} color={LaboraColors.primary} />
                <ThemedText style={styles.metaText}>
                  {relatedLab?.name ?? schedule?.room ?? 'Lab belum ditentukan'}
                  {relatedLab?.building ? ` • ${relatedLab.building}` : ''}
                </ThemedText>
              </View>
              <View style={styles.metaRow}>
                <Feather name="clock" size={13} color={LaboraColors.primary} />
                <ThemedText style={styles.metaText}>
                  {schedule?.date ?? '-'} • {schedule?.startTime ?? '-'} - {schedule?.endTime ?? '-'} WIB
                  {schedule?.sessionNumber ? ` (Sesi ${schedule.sessionNumber})` : ''}
                </ThemedText>
              </View>
              <View style={styles.metaRow}>
                <Feather name="shield" size={13} color={configSnapshot ? LaboraColors.primary : LaboraColors.danger} />
                <ThemedText
                  style={[
                    styles.metaText,
                    !configSnapshot && { color: LaboraColors.danger, fontWeight: '600' },
                  ]}>
                  {configSnapshot
                    ? `Toleransi: ${configSnapshot.gracePeriodMinutes} mnt • Denda Terlambat: Rp${configSnapshot.lateFineAmount.toLocaleString('id-ID')}`
                    : 'Konfigurasi toleransi & denda Lab belum diatur oleh Aslab'}
                </ThemedText>
              </View>
            </View>

            {/* Kendali Sesi & Presensi */}
            <View style={styles.controlCard}>
              <View style={styles.controlHeaderRow}>
                <ThemedText style={styles.controlHeading}>Kendali Sesi Real-Time</ThemedText>
                <View style={styles.syncBadge}>
                  <ThemedText style={styles.syncBadgeText}>
                    {isFirestoreConnected ? 'onSnapshot Live' : 'Mode Lokal'}
                  </ThemedText>
                </View>
              </View>

              {actionError ? (
                <View style={{ backgroundColor: '#FEE2E2', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#FECACA' }}>
                  <ThemedText style={{ fontSize: 12, color: '#B91C1C', fontWeight: '600' }}>
                    {actionError}
                  </ThemedText>
                </View>
              ) : null}

              {!isAuthorized ? (
                <View style={{ backgroundColor: '#FEF3C7', padding: 10, borderRadius: 10 }}>
                  <ThemedText style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}>
                    Hanya Asprak yang ditugaskan pada sesi ini yang dapat membuka atau menutup sesi.
                  </ThemedText>
                </View>
              ) : null}

              <View style={styles.controlBtnRow}>
                <View style={styles.geofenceActivePill}>
                  <Feather name="compass" size={14} color={LaboraColors.primary} style={{ marginRight: 6 }} />
                  <ThemedText style={styles.geofenceActiveText}>
                    Radius {relatedLab?.radius ?? 30}m
                  </ThemedText>
                </View>

                <Pressable
                  disabled={isUpdating || !isAuthorized}
                  onPress={handleToggleWithConfirmation}
                  style={[
                    styles.toggleStatusBtn,
                    isOpen ? styles.toggleCloseBtn : styles.toggleOpenBtn,
                    (isUpdating || !isAuthorized) && { opacity: 0.55 },
                  ]}>
                  {isUpdating ? (
                    <ActivityIndicator size="small" color={isOpen ? '#991B1B' : '#047857'} style={{ marginRight: 6 }} />
                  ) : (
                    <Feather
                      name={isOpen ? 'stop-circle' : 'play-circle'}
                      size={14}
                      color={isOpen ? '#991B1B' : '#047857'}
                      style={{ marginRight: 6 }}
                    />
                  )}
                  <ThemedText
                    style={[
                      styles.toggleStatusText,
                      isOpen ? styles.toggleCloseText : styles.toggleOpenText,
                    ]}>
                    {isUpdating ? 'Memproses...' : isOpen ? 'Tutup Sesi' : 'Buka Sesi'}
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Ringkasan Kehadiran */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeaderRow}>
                <ThemedText style={styles.summaryHeading}>Monitoring Kehadiran</ThemedText>
                <ThemedText style={styles.summaryTotalText}>Total: {totalCount} Praktikan</ThemedText>
              </View>

              <View style={styles.rateRow}>
                <ThemedText style={styles.rateNumber}>{tingkatHadirPct}%</ThemedText>
                <ThemedText style={styles.rateLabel}>Tingkat Hadir</ThemedText>
                <View style={styles.targetBadge}>
                  <ThemedText style={styles.targetBadgeText}>Terlambat: {lateCount}</ThemedText>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, tingkatHadirPct)}%` }]} />
              </View>

              {/* 4 Mini boxes */}
              <View style={styles.fourBoxGrid}>
                <View style={styles.statBox}>
                  <ThemedText style={styles.statBoxNumber}>{presentCount}</ThemedText>
                  <ThemedText style={styles.statBoxLabel}>PRESENT</ThemedText>
                </View>
                <View style={styles.statBox}>
                  <ThemedText style={styles.statBoxNumber}>{lateCount}</ThemedText>
                  <ThemedText style={styles.statBoxLabel}>Terlambat</ThemedText>
                </View>
                <View style={styles.statBox}>
                  <ThemedText style={styles.statBoxNumber}>{excusedCount}</ThemedText>
                  <ThemedText style={styles.statBoxLabel}>EXCUSED</ThemedText>
                </View>
                <View style={styles.statBox}>
                  <ThemedText style={styles.statBoxNumber}>{absentCount}</ThemedText>
                  <ThemedText style={styles.statBoxLabel}>
                    {effectiveStatus === 'CLOSED' ? 'ABSENT' : 'Belum'}
                  </ThemedText>
                </View>
              </View>
            </View>

            {/* Search Input */}
            <View style={styles.searchBox}>
              <Feather name="search" size={16} color={LaboraColors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama atau NIM praktikan..."
                placeholderTextColor={LaboraColors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Filter Pills */}
            <View style={styles.filterPillsRow}>
              <Pressable
                onPress={() => setSelectedFilter('ALL')}
                style={[styles.filterPill, selectedFilter === 'ALL' && styles.filterPillActive]}>
                <ThemedText style={[styles.filterPillText, selectedFilter === 'ALL' && styles.filterPillTextActive]}>
                  Semua ({totalCount})
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setSelectedFilter('PRESENT')}
                style={[styles.filterPill, selectedFilter === 'PRESENT' && styles.filterPillActive]}>
                <ThemedText style={[styles.filterPillText, selectedFilter === 'PRESENT' && styles.filterPillTextActive]}>
                  PRESENT ({presentCount})
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setSelectedFilter('EXCUSED')}
                style={[styles.filterPill, selectedFilter === 'EXCUSED' && styles.filterPillActive]}>
                <ThemedText style={[styles.filterPillText, selectedFilter === 'EXCUSED' && styles.filterPillTextActive]}>
                  EXCUSED ({excusedCount})
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setSelectedFilter('ABSENT')}
                style={[styles.filterPill, selectedFilter === 'ABSENT' && styles.filterPillActive]}>
                <ThemedText style={[styles.filterPillText, selectedFilter === 'ABSENT' && styles.filterPillTextActive]}>
                  {effectiveStatus === 'CLOSED' ? `ABSENT (${absentCount})` : `Belum (${absentCount})`}
                </ThemedText>
              </Pressable>
            </View>

            {/* Daftar Kehadiran Real-Time */}
            <View style={styles.studentListSection}>
              <View style={styles.listHeaderRow}>
                <ThemedText style={styles.listSectionTitle}>DAFTAR PRAKTIKAN REAL-TIME</ThemedText>
                <ThemedText style={styles.listSortTitle}>
                  {statusLogs.length > 0 ? `${statusLogs.length} log status` : 'onSnapshot Live'}
                </ThemedText>
              </View>

              {filteredStudentList.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Feather name="inbox" size={32} color={LaboraColors.textMuted} style={{ marginBottom: 8 }} />
                  <ThemedText style={{ fontSize: 13, color: LaboraColors.textMuted }}>
                    Tidak ada praktikan yang sesuai filter.
                  </ThemedText>
                </View>
              ) : null}

              {filteredStudentList.map((stu) => {
                const initials =
                  stu.name
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase() || 'M';
                const fineMeta = stu.fine ? getFineBadgeMeta(stu.fine.status) : null;
                const displayAttendanceLabel =
                  stu.attendanceStatus === 'PENDING_CHECKIN'
                    ? 'BELUM CHECK-IN'
                    : stu.attendanceStatus;

                return (
                  <View key={stu.studentId} style={styles.studentCard}>
                    <View style={styles.studentTopRow}>
                      <View style={styles.studentAvatar}>
                        <ThemedText style={styles.studentAvatarText}>{initials}</ThemedText>
                      </View>
                      <View style={styles.studentInfoCol}>
                        <ThemedText style={styles.studentName}>{stu.name}</ThemedText>
                        <ThemedText style={styles.studentNim}>NIM: {stu.nim}</ThemedText>
                      </View>
                      <View
                        style={[
                          styles.statusPill,
                          stu.attendanceStatus === 'PRESENT'
                            ? stu.isLate
                              ? styles.statusWarn
                              : styles.statusHadir
                            : stu.attendanceStatus === 'EXCUSED'
                              ? styles.statusIzin
                              : styles.statusBelum,
                        ]}>
                        <ThemedText
                          style={[
                            styles.statusText,
                            stu.attendanceStatus === 'PRESENT'
                              ? stu.isLate
                                ? styles.statusWarnText
                                : styles.statusHadirText
                              : stu.attendanceStatus === 'EXCUSED'
                                ? styles.statusIzinText
                                : styles.statusBelumText,
                          ]}>
                          {displayAttendanceLabel}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.studentBottomRow}>
                      <View style={styles.timeMeta}>
                        <Feather name="clock" size={12} color={LaboraColors.textMuted} />
                        <ThemedText style={styles.timeMetaText}>
                          Check-in: {formatCheckInTime(stu.checkedInAt)}
                        </ThemedText>
                      </View>

                      <View style={styles.radiusMeta}>
                        <ThemedText
                          style={[
                            styles.radiusMetaText,
                            stu.isLate && styles.radiusMetaWarn,
                          ]}>
                          {stu.attendanceStatus === 'PRESENT'
                            ? stu.isLate
                              ? `Terlambat ${stu.lateMinutes} mnt`
                              : 'Tepat Waktu'
                            : stu.attendanceStatus === 'EXCUSED'
                              ? 'Izin Disetujui'
                              : stu.attendanceStatus === 'ABSENT'
                                ? 'Tidak Hadir'
                                : 'Menunggu Check-in'}
                        </ThemedText>
                      </View>
                    </View>

                    {stu.fine && fineMeta ? (
                      <View
                        style={[
                          styles.attachmentProofRow,
                          { backgroundColor: fineMeta.bg, justifyContent: 'space-between' },
                        ]}>
                        <ThemedText style={{ fontSize: 11, fontWeight: '700', color: fineMeta.color }}>
                          {fineMeta.label} • Rp{stu.fine.amount.toLocaleString('id-ID')}
                        </ThemedText>
                        <ThemedText style={{ fontSize: 10, color: fineMeta.color }}>
                          {stu.fine.reason}
                        </ThemedText>
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <Pressable style={styles.secondaryActionBtn} onPress={() => setShowQRModal(true)}>
              <Feather name="maximize-2" size={16} color={LaboraColors.primary} style={{ marginRight: 6 }} />
              <ThemedText style={styles.secondaryActionText}>QR Sesi</ThemedText>
            </Pressable>

            {onEditSession && isAuthorized ? (
              <Pressable
                style={styles.secondaryActionBtn}
                onPress={() => {
                  onClose();
                  onEditSession(session);
                }}>
                <Feather name="edit-2" size={15} color={LaboraColors.primary} style={{ marginRight: 6 }} />
                <ThemedText style={styles.secondaryActionText}>Edit Jadwal</ThemedText>
              </Pressable>
            ) : null}

            <Pressable style={styles.primaryActionBtn} onPress={onClose}>
              <Feather name="check" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <ThemedText style={styles.primaryActionText}>Tutup</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>

      <SessionQRModal
        visible={showQRModal}
        session={session}
        onClose={() => setShowQRModal(false)}
      />
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
    maxHeight: '92%',
    backgroundColor: LaboraColors.background,
    borderRadius: 24,
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
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: LaboraColors.cardBorder,
    backgroundColor: LaboraColors.background,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LaboraColors.card,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: LaboraColors.primary,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LaboraColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  body: {
    flexGrow: 1,
  },
  bodyContent: {
    padding: Spacing.four,
    gap: 14,
  },

  /* Course info */
  courseHeader: {
    backgroundColor: LaboraColors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 8,
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
  },
  anchorPill: {
    backgroundColor: LaboraColors.blush,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    color: LaboraColors.primary,
    fontWeight: '700',
    fontSize: 11,
  },

  /* Control Card */
  controlCard: {
    backgroundColor: LaboraColors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 12,
  },
  controlHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
  syncBadge: {
    backgroundColor: LaboraColors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  syncBadgeText: {
    fontSize: 10,
    color: LaboraColors.textMuted,
  },
  controlBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  geofenceActivePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LaboraColors.blush,
    paddingVertical: 10,
    borderRadius: 12,
  },
  geofenceActiveText: {
    fontSize: 12,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  toggleStatusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  toggleCloseBtn: {
    backgroundColor: '#FEE2E2',
  },
  toggleOpenBtn: {
    backgroundColor: '#D1FAE5',
  },
  toggleStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  toggleCloseText: {
    color: '#991B1B',
  },
  toggleOpenText: {
    color: '#047857',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: LaboraColors.cardBorder,
    paddingTop: 10,
  },
  switchTextCol: {
    flex: 1,
    paddingRight: 10,
  },
  switchTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  switchSubtitle: {
    fontSize: 11,
    color: LaboraColors.textMuted,
  },

  /* Summary */
  summaryCard: {
    backgroundColor: LaboraColors.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 10,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
  summaryTotalText: {
    fontSize: 12,
    color: LaboraColors.textMuted,
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  rateNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
  rateLabel: {
    fontSize: 12,
    color: LaboraColors.textMuted,
  },
  targetBadge: {
    backgroundColor: LaboraColors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 'auto',
  },
  targetBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: LaboraColors.textSecondary,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#F1E8EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: LaboraColors.primary,
    borderRadius: 4,
  },
  fourBoxGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statBox: {
    flex: 1,
    backgroundColor: LaboraColors.surfaceAlt,
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  statBoxNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
  statBoxLabel: {
    fontSize: 10,
    color: LaboraColors.textMuted,
    textAlign: 'center',
  },

  /* Search */
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LaboraColors.card,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: LaboraColors.textPrimary,
  },

  /* Filter pills */
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterPill: {
    backgroundColor: LaboraColors.card,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  filterPillActive: {
    backgroundColor: LaboraColors.primary,
    borderColor: LaboraColors.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: LaboraColors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Student List */
  studentListSection: {
    gap: 10,
  },
  listHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: LaboraColors.textMuted,
    letterSpacing: 0.6,
  },
  listSortTitle: {
    fontSize: 10,
    color: LaboraColors.primary,
  },
  studentCard: {
    backgroundColor: LaboraColors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 8,
  },
  studentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LaboraColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
  studentInfoCol: {
    flex: 1,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  studentNim: {
    fontSize: 11,
    color: LaboraColors.textMuted,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusHadir: {
    backgroundColor: '#FCE7EC',
  },
  statusHadirText: {
    color: LaboraColors.primary,
    fontSize: 10,
    fontWeight: '700',
  },
  statusIzin: {
    backgroundColor: LaboraColors.surfaceAlt,
  },
  statusIzinText: {
    color: LaboraColors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  statusWarn: {
    backgroundColor: '#FEF2F2',
  },
  statusWarnText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '700',
  },
  statusBelum: {
    backgroundColor: '#F1F5F9',
  },
  statusBelumText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
  },
  statusText: {},
  studentBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeMetaText: {
    fontSize: 11,
    color: LaboraColors.textMuted,
  },
  radiusMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  radiusMetaText: {
    fontSize: 11,
    color: LaboraColors.textSecondary,
    fontWeight: '600',
  },
  radiusMetaWarn: {
    color: '#EF4444',
  },
  manualActionBtn: {
    backgroundColor: LaboraColors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  manualActionText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  attachmentProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LaboraColors.surfaceAlt,
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  attachmentProofText: {
    fontSize: 11,
    color: LaboraColors.textSecondary,
    flex: 1,
  },
  seeProofLink: {
    fontSize: 11,
    fontWeight: '700',
    color: LaboraColors.primary,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    padding: Spacing.four,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: LaboraColors.cardBorder,
    backgroundColor: LaboraColors.card,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LaboraColors.surfaceAlt,
    paddingVertical: 12,
    borderRadius: 12,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LaboraColors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
