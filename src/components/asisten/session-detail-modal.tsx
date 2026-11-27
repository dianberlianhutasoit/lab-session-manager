import React, { useState, useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { Spacing, LaboraColors } from '@/constants/theme';
import type { SessionWithDetails } from '@/context/session-context';
import { useSessionContext } from '@/context/session-context';
import type { SessionStatusLog, User } from '@/types';
import { confirmSessionStatusChange } from './session-card';
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
  const { users, permissions, getSessionAttendanceRecords } = useSessionContext();
  const [showQRModal, setShowQRModal] = useState(false);
  const [allowManualGps, setAllowManualGps] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'HADIR' | 'BELUM' | 'IZIN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const sessionRecords = useMemo(() => {
    return session ? getSessionAttendanceRecords(session.id) : [];
  }, [session, getSessionAttendanceRecords]);

  const sessionPermissions = useMemo(() => {
    return session ? permissions.filter((p) => p.sessionId === session.id) : [];
  }, [session, permissions]);

  const practitionerUsers = useMemo(() => {
    return users.filter((u) => u.role === 'praktikan');
  }, [users]);

  // Combine into a full student list with real live data
  const dynamicStudentList = useMemo(() => {
    const list: {
      id: string;
      initial: string;
      name: string;
      nim: string;
      status: 'TEPAT_WAKTU' | 'HADIR' | 'IZIN' | 'BELUM' | 'LUAR_RADIUS';
      time?: string;
      radius?: string;
      isWithin: boolean;
      attachment?: string;
    }[] = [];

    // 1. Add students who have recorded attendance
    sessionRecords.forEach((record) => {
      const user = users.find((u) => u.id === record.userId);
      const name = record.userName || user?.name || 'Mahasiswa';
      const nim = user?.nim || '2110511000';
      const isWithin = (record.distanceMeters ?? 0) <= 30;
      const initial = name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      let formattedTime = '-';
      try {
        const d = new Date(record.recordedAt);
        formattedTime = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
      } catch {
        formattedTime = '-';
      }

      list.push({
        id: record.id,
        initial: initial || 'M',
        name,
        nim,
        status: !isWithin ? 'LUAR_RADIUS' : 'HADIR',
        time: formattedTime,
        radius: record.distanceMeters !== undefined ? `${record.distanceMeters} meter` : 'GPS Verified',
        isWithin,
      });
    });

    // 2. Add students with permissions for this session
    sessionPermissions.forEach((perm) => {
      const user = users.find((u) => u.id === perm.userId);
      const name = user?.name || 'Mahasiswa';
      const nim = user?.nim || '2110511000';
      // Avoid duplicate if already added
      if (list.some((item) => item.id === perm.id || item.nim === nim)) return;

      const initial = name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      list.push({
        id: perm.id,
        initial: initial || 'M',
        name,
        nim,
        status: 'IZIN',
        attachment: perm.reason || 'Izin Praktikum',
        isWithin: false,
      });
    });

    // 3. Add remaining registered practitioners who haven't attended yet
    practitionerUsers.forEach((stu) => {
      const alreadyIncluded = list.some(
        (item) => item.name.toLowerCase() === stu.name.toLowerCase() || (stu.nim && item.nim === stu.nim)
      );
      if (!alreadyIncluded) {
        const initial = stu.name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase();

        list.push({
          id: stu.id,
          initial: initial || 'M',
          name: stu.name,
          nim: stu.nim || '2110511000',
          status: 'BELUM',
          isWithin: false,
        });
      }
    });

    return list;
  }, [sessionRecords, sessionPermissions, practitionerUsers, users]);

  const totalCount = dynamicStudentList.length;
  const hadirCount = dynamicStudentList.filter((s) => s.status === 'HADIR' || s.status === 'TEPAT_WAKTU' || s.status === 'LUAR_RADIUS').length;
  const izinCount = dynamicStudentList.filter((s) => s.status === 'IZIN').length;
  const belumCount = dynamicStudentList.filter((s) => s.status === 'BELUM').length;
  const tingkatHadirPct = totalCount > 0 ? Math.round(((hadirCount + izinCount) / totalCount) * 1000) / 10 : 0;

  const filteredStudentList = useMemo(() => {
    return dynamicStudentList.filter((stu) => {
      if (selectedFilter === 'HADIR' && stu.status !== 'HADIR' && stu.status !== 'TEPAT_WAKTU' && stu.status !== 'LUAR_RADIUS') return false;
      if (selectedFilter === 'IZIN' && stu.status !== 'IZIN') return false;
      if (selectedFilter === 'BELUM' && stu.status !== 'BELUM') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return stu.name.toLowerCase().includes(q) || stu.nim.toLowerCase().includes(q);
      }
      return true;
    });
  }, [dynamicStudentList, selectedFilter, searchQuery]);

  if (!session) return null;

  const {
    schedule,
    assistant,
    status,
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
              <ThemedText style={styles.courseTitle}>
                {schedule?.title ?? 'Praktikum Jaringan Komputer Lanjut'}
              </ThemedText>
              <View style={styles.metaRow}>
                <Feather name="map-pin" size={13} color={LaboraColors.primary} />
                <ThemedText style={styles.metaText}>
                  {schedule?.room ?? 'Lab Rekayasa Jaringan & IoT'} • Gedung F Lantai 3
                </ThemedText>
              </View>
              <View style={styles.metaRow}>
                <Feather name="clock" size={13} color={LaboraColors.primary} />
                <ThemedText style={styles.metaText}>
                  {schedule?.date ?? 'Senin, 21 Okt 2024'} • {schedule?.startTime ?? '09:30'} - {schedule?.endTime ?? '12:00'} WIB (Sesi {schedule?.sessionNumber ?? 2})
                </ThemedText>
              </View>
              <View style={styles.metaRow}>
                <Feather name="radio" size={13} color={LaboraColors.primary} />
                <ThemedText style={styles.metaText}>
                  Anchor Node: <ThemedText style={styles.anchorPill}>AP-LAB-NET3-5G</ThemedText>
                </ThemedText>
              </View>
            </View>

            {/* Kendali Sesi & Presensi */}
            <View style={styles.controlCard}>
              <View style={styles.controlHeaderRow}>
                <ThemedText style={styles.controlHeading}>Kendali Sesi & Presensi</ThemedText>
                <View style={styles.syncBadge}>
                  <ThemedText style={styles.syncBadgeText}>Server Sync: 5d lalu</ThemedText>
                </View>
              </View>

              <View style={styles.controlBtnRow}>
                <View style={styles.geofenceActivePill}>
                  <Feather name="compass" size={14} color={LaboraColors.primary} style={{ marginRight: 6 }} />
                  <ThemedText style={styles.geofenceActiveText}>Geofence (30m)</ThemedText>
                </View>

                <Pressable
                  disabled={isUpdating}
                  onPress={handleToggleWithConfirmation}
                  style={[
                    styles.toggleStatusBtn,
                    isOpen ? styles.toggleCloseBtn : styles.toggleOpenBtn,
                  ]}>
                  <Feather
                    name={isOpen ? 'stop-circle' : 'play-circle'}
                    size={14}
                    color={isOpen ? '#991B1B' : '#047857'}
                    style={{ marginRight: 6 }}
                  />
                  <ThemedText
                    style={[
                      styles.toggleStatusText,
                      isOpen ? styles.toggleCloseText : styles.toggleOpenText,
                    ]}>
                    {isOpen ? 'Tutup Sesi' : 'Buka Sesi'}
                  </ThemedText>
                </Pressable>
              </View>

              <View style={styles.switchRow}>
                <View style={styles.switchTextCol}>
                  <ThemedText style={styles.switchTitle}>Toleransi GPS Manual</ThemedText>
                  <ThemedText style={styles.switchSubtitle}>
                    Izinkan verifikasi foto praktikan saat akurasi satelit rendah
                  </ThemedText>
                </View>
                <Switch
                  value={allowManualGps}
                  onValueChange={setAllowManualGps}
                  trackColor={{ false: '#E2E8F0', true: LaboraColors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Ringkasan Kehadiran */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeaderRow}>
                <ThemedText style={styles.summaryHeading}>Ringkasan Kehadiran</ThemedText>
                <ThemedText style={styles.summaryTotalText}>Total: {totalCount} Praktikan</ThemedText>
              </View>

              <View style={styles.rateRow}>
                <ThemedText style={styles.rateNumber}>{tingkatHadirPct}%</ThemedText>
                <ThemedText style={styles.rateLabel}>Tingkat Hadir</ThemedText>
                <View style={styles.targetBadge}>
                  <ThemedText style={styles.targetBadgeText}>Target Lab ≥ 80%</ThemedText>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, tingkatHadirPct)}%` }]} />
              </View>

              {/* 4 Mini boxes */}
              <View style={styles.fourBoxGrid}>
                <View style={styles.statBox}>
                  <ThemedText style={styles.statBoxNumber}>{hadirCount}</ThemedText>
                  <ThemedText style={styles.statBoxLabel}>Hadir</ThemedText>
                </View>
                <View style={styles.statBox}>
                  <ThemedText style={styles.statBoxNumber}>{belumCount}</ThemedText>
                  <ThemedText style={styles.statBoxLabel}>Belum Presensi</ThemedText>
                </View>
                <View style={styles.statBox}>
                  <ThemedText style={styles.statBoxNumber}>{izinCount}</ThemedText>
                  <ThemedText style={styles.statBoxLabel}>Izin Sah</ThemedText>
                </View>
                <View style={styles.statBox}>
                  <ThemedText style={styles.statBoxNumber}>
                    {sessionPermissions.filter((p) => p.category === 'SAKIT').length}
                  </ThemedText>
                  <ThemedText style={styles.statBoxLabel}>Sakit</ThemedText>
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
                onPress={() => setSelectedFilter('HADIR')}
                style={[styles.filterPill, selectedFilter === 'HADIR' && styles.filterPillActive]}>
                <ThemedText style={[styles.filterPillText, selectedFilter === 'HADIR' && styles.filterPillTextActive]}>
                  Hadir ({hadirCount})
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setSelectedFilter('BELUM')}
                style={[styles.filterPill, selectedFilter === 'BELUM' && styles.filterPillActive]}>
                <ThemedText style={[styles.filterPillText, selectedFilter === 'BELUM' && styles.filterPillTextActive]}>
                  Belum ({belumCount})
                </ThemedText>
              </Pressable>
              <Pressable
                onPress={() => setSelectedFilter('IZIN')}
                style={[styles.filterPill, selectedFilter === 'IZIN' && styles.filterPillActive]}>
                <ThemedText style={[styles.filterPillText, selectedFilter === 'IZIN' && styles.filterPillTextActive]}>
                  Izin ({izinCount})
                </ThemedText>
              </Pressable>
            </View>

            {/* Daftar Kehadiran GPS */}
            <View style={styles.studentListSection}>
              <View style={styles.listHeaderRow}>
                <ThemedText style={styles.listSectionTitle}>DAFTAR KEHADIRAN GPS</ThemedText>
                <ThemedText style={styles.listSortTitle}>Tersinkronisasi Real-time</ThemedText>
              </View>

              {filteredStudentList.length === 0 ? (
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Feather name="inbox" size={32} color={LaboraColors.textMuted} style={{ marginBottom: 8 }} />
                  <ThemedText style={{ fontSize: 13, color: LaboraColors.textMuted }}>
                    Tidak ada data praktikan yang sesuai filter.
                  </ThemedText>
                </View>
              ) : null}

              {filteredStudentList.map((stu) => (
                <View key={stu.id} style={styles.studentCard}>
                  <View style={styles.studentTopRow}>
                    <View style={styles.studentAvatar}>
                      <ThemedText style={styles.studentAvatarText}>{stu.initial}</ThemedText>
                    </View>
                    <View style={styles.studentInfoCol}>
                      <ThemedText style={styles.studentName}>{stu.name}</ThemedText>
                      <ThemedText style={styles.studentNim}>NIM {stu.nim}</ThemedText>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        stu.status === 'TEPAT_WAKTU' || stu.status === 'HADIR'
                          ? styles.statusHadir
                          : stu.status === 'IZIN'
                            ? styles.statusIzin
                            : stu.status === 'BELUM'
                              ? styles.statusBelum
                              : styles.statusWarn,
                      ]}>
                      <ThemedText
                        style={[
                          styles.statusText,
                          stu.status === 'TEPAT_WAKTU' || stu.status === 'HADIR'
                            ? styles.statusHadirText
                            : stu.status === 'IZIN'
                              ? styles.statusIzinText
                              : stu.status === 'BELUM'
                                ? styles.statusBelumText
                                : styles.statusWarnText,
                        ]}>
                        {stu.status === 'TEPAT_WAKTU'
                          ? '✓ Tepat Waktu'
                          : stu.status === 'HADIR'
                            ? '✓ Hadir'
                            : stu.status === 'IZIN'
                              ? 'Izin'
                              : stu.status === 'BELUM'
                                ? 'Belum Presensi'
                                : 'Luar Geofence'}
                      </ThemedText>
                    </View>
                  </View>

                  {stu.status === 'IZIN' ? (
                    <View style={styles.attachmentProofRow}>
                      <Feather name="file-text" size={13} color={LaboraColors.primary} />
                      <ThemedText style={styles.attachmentProofText}>{stu.attachment}</ThemedText>
                    </View>
                  ) : stu.status === 'BELUM' ? (
                    <View style={styles.studentBottomRow}>
                      <View style={styles.timeMeta}>
                        <Feather name="clock" size={12} color={LaboraColors.textMuted} />
                        <ThemedText style={styles.timeMetaText}>Menunggu verifikasi presensi</ThemedText>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.studentBottomRow}>
                      <View style={styles.timeMeta}>
                        <Feather name="clock" size={12} color={LaboraColors.textMuted} />
                        <ThemedText style={styles.timeMetaText}>{stu.time ?? '-'}</ThemedText>
                      </View>
                      <View style={styles.radiusMeta}>
                        <Feather name="navigation" size={12} color={stu.isWithin ? LaboraColors.primary : '#EF4444'} />
                        <ThemedText
                          style={[
                            styles.radiusMetaText,
                            !stu.isWithin && styles.radiusMetaWarn,
                          ]}>
                          Radius: {stu.radius}
                        </ThemedText>
                      </View>
                      {!stu.isWithin && (
                        <View style={styles.manualActionBtn}>
                          <ThemedText style={styles.manualActionText}>Manual</ThemedText>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Action Footer */}
          <View style={styles.footer}>
            <Pressable style={styles.secondaryActionBtn} onPress={() => setShowQRModal(true)}>
              <Feather name="check-square" size={16} color={LaboraColors.primary} style={{ marginRight: 6 }} />
              <ThemedText style={styles.secondaryActionText}>Verifikasi Manual</ThemedText>
            </Pressable>

            <Pressable style={styles.primaryActionBtn} onPress={onClose}>
              <Feather name="download" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <ThemedText style={styles.primaryActionText}>Unduh BAP Presensi</ThemedText>
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
