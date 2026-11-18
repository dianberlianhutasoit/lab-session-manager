import React, { useState, useMemo, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SessionStatusBadge } from '@/components/asisten/session-status-badge';
import { AttendanceSummaryCards } from '@/components/asisten/attendance-summary-cards';
import { AttendanceRecordCard } from '@/components/asisten/attendance-record-card';
import { AbsentPractitionerCard } from '@/components/asisten/absent-practitioner-card';
import { LeaveRequestCard } from '@/components/asisten/leave-request-card';
import { LeaveReviewModal } from '@/components/asisten/leave-review-modal';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionContext } from '@/context/session-context';
import { isFirebaseConfigured } from '@/config/firebase';
import {
  subscribeToSessionAttendance,
  subscribeToSessionLeaveRequests,
} from '@/services/firestore-service';
import type { LeaveRequest, LeaveStatus } from '@/types';

type ViewTab = 'PRESENT' | 'LEAVES' | 'ABSENT';
type LeaveFilter = 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED';

function formatSyncTime(isoString: string): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return '-';
  return `${d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })} WIB`;
}

export default function AttendanceRecapScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const {
    sessions,
    schedules,
    users,
    reviewingLeaveIds,
    lastRealtimeSyncAt,
    realtimeEventCount,
    isFirestoreConnected,
    currentAssistantId,
    getSessionAttendanceRecords,
    getSessionLeaveRequests,
    reviewLeaveRequest,
    getPractitioners,
  } = useSessionContext();

  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    return sessions.length > 0 ? sessions[0].id : '';
  });

  const [activeTab, setActiveTab] = useState<ViewTab>('PRESENT');
  const [leaveFilter, setLeaveFilter] = useState<LeaveFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeReviewRequest, setActiveReviewRequest] = useState<LeaveRequest | null>(
    null
  );
  const [sessionRealtimeTick, setSessionRealtimeTick] = useState<string | null>(null);

  // SRS-09: Berlangganan spesifik per sesi dengan query + onSnapshot saat sesi dipilih
  useEffect(() => {
    if (!isFirebaseConfigured || !selectedSessionId) return;

    const unsubAtt = subscribeToSessionAttendance(selectedSessionId, () => {
      setSessionRealtimeTick(new Date().toISOString());
    });

    const unsubLeaves = subscribeToSessionLeaveRequests(selectedSessionId, () => {
      setSessionRealtimeTick(new Date().toISOString());
    });

    return () => {
      unsubAtt?.();
      unsubLeaves?.();
    };
  }, [selectedSessionId]);

  const effectiveSyncTimestamp = sessionRealtimeTick ?? lastRealtimeSyncAt;

  // Info sesi terpilih
  const selectedSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId) ?? sessions[0];
  }, [sessions, selectedSessionId]);

  const effectiveSessionId = selectedSession?.id ?? '';

  const selectedSchedule = useMemo(() => {
    if (!selectedSession) return undefined;
    return schedules.find((sch) => sch.id === selectedSession.scheduleId);
  }, [schedules, selectedSession]);

  const selectedAssistant = useMemo(() => {
    if (!selectedSession) return undefined;
    return users.find((u) => u.id === selectedSession.assistantId);
  }, [users, selectedSession]);

  // SRS-09: Daftar data presensi praktikan pada sesi terpilih
  const attendanceRecords = useMemo(() => {
    if (!effectiveSessionId) return [];
    return getSessionAttendanceRecords(effectiveSessionId);
  }, [effectiveSessionId, getSessionAttendanceRecords]);

  // SRS-10: Daftar pengajuan izin praktikan pada sesi terpilih
  const sessionLeaveRequests = useMemo(() => {
    if (!effectiveSessionId) return [];
    return getSessionLeaveRequests(effectiveSessionId);
  }, [effectiveSessionId, getSessionLeaveRequests]);

  const presentUserIds = useMemo(
    () => new Set(attendanceRecords.map((a) => a.userId)),
    [attendanceRecords]
  );

  // Peta status izin per userId pada sesi ini
  const leaveStatusByUserId = useMemo(() => {
    const map = new Map<string, LeaveStatus>();
    for (const req of sessionLeaveRequests) {
      map.set(req.userId, req.status);
    }
    return map;
  }, [sessionLeaveRequests]);

  // Praktikan yang izinnya APPROVED dan tidak melakukan presensi hadir (Status Hadir diutamakan jika tetap datang)
  const approvedExcusedUserIds = useMemo(() => {
    const set = new Set<string>();
    for (const req of sessionLeaveRequests) {
      if (req.status === 'APPROVED' && !presentUserIds.has(req.userId)) {
        set.add(req.userId);
      }
    }
    return set;
  }, [sessionLeaveRequests, presentUserIds]);

  const pendingLeaveCount = useMemo(
    () => sessionLeaveRequests.filter((l) => l.status === 'PENDING').length,
    [sessionLeaveRequests]
  );

  // Daftar seluruh praktikan terdaftar
  const allPractitioners = useMemo(() => {
    return getPractitioners();
  }, [getPractitioners]);

  // Daftar praktikan yang belum hadir (tidak presensi DAN tidak memiliki izin APPROVED)
  const absentPractitioners = useMemo(() => {
    return allPractitioners.filter(
      (p) => !presentUserIds.has(p.id) && !approvedExcusedUserIds.has(p.id)
    );
  }, [allPractitioners, presentUserIds, approvedExcusedUserIds]);

  // Filter berdasarkan teks pencarian
  const filteredPresent = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    if (!queryText) return attendanceRecords;
    return attendanceRecords.filter(
      (a) =>
        a.userName.toLowerCase().includes(queryText) ||
        a.userEmail.toLowerCase().includes(queryText)
    );
  }, [attendanceRecords, searchQuery]);

  const filteredAbsent = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    if (!queryText) return absentPractitioners;
    return absentPractitioners.filter(
      (p) =>
        p.name.toLowerCase().includes(queryText) ||
        p.email.toLowerCase().includes(queryText)
    );
  }, [absentPractitioners, searchQuery]);

  const filteredLeaves = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    return sessionLeaveRequests.filter((l) => {
      const matchFilter = leaveFilter === 'ALL' || l.status === leaveFilter;
      const matchQuery =
        !queryText ||
        l.userName.toLowerCase().includes(queryText) ||
        l.userEmail.toLowerCase().includes(queryText) ||
        l.reason.toLowerCase().includes(queryText);
      return matchFilter && matchQuery;
    });
  }, [sessionLeaveRequests, leaveFilter, searchQuery]);

  // Sinkronkan modal peninjauan izin jika datanya berubah
  const currentReviewModalRequest = useMemo(() => {
    if (!activeReviewRequest) return null;
    return (
      sessionLeaveRequests.find((l) => l.id === activeReviewRequest.id) ?? null
    );
  }, [sessionLeaveRequests, activeReviewRequest]);

  const handleQuickDecision = async (
    requestId: string,
    decision: Exclude<LeaveStatus, 'PENDING'>
  ) => {
    await reviewLeaveRequest(requestId, decision, undefined, currentAssistantId);
  };

  const handleSubmitModalDecision = async (
    requestId: string,
    decision: Exclude<LeaveStatus, 'PENDING'>,
    reviewerNote?: string
  ) => {
    await reviewLeaveRequest(requestId, decision, reviewerNote, currentAssistantId);
  };

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
  };

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: Math.max(insets.top, Spacing.four),
          paddingBottom: insets.bottom,
        },
      ]}>
      <View style={styles.container}>
        {/* Header Title Section */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.badgeRole}>
              <ThemedText type="smallBold" style={styles.badgeRoleText}>
                PANEL ASISTEN LABORATORIUM
              </ThemedText>
            </View>

            {/* SRS-09: Indikator Real-Time Listener onSnapshot */}
            <View style={styles.realtimeBadge}>
              <View style={styles.pulseDot} />
              <ThemedText type="smallBold" style={styles.realtimeBadgeText}>
                {isFirestoreConnected
                  ? 'onSnapshot Live (Firestore)'
                  : 'onSnapshot Ready'}
              </ThemedText>
            </View>
          </View>

          <ThemedText type="title" style={styles.title}>
            Rekap Presensi & Keputusan Izin
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            SRS-09 & SRS-10: Pantau rekap presensi real-time berbasis onSnapshot serta tinjau dan putuskan permohonan izin praktikan (APPROVED/REJECTED).
          </ThemedText>

          <View style={styles.syncMetaBar}>
            <ThemedText type="small" style={styles.syncMetaText}>
              🔄 Sinkronisasi Real-Time Terakhir: {formatSyncTime(effectiveSyncTimestamp)} ({realtimeEventCount} pembaruan)
            </ThemedText>
          </View>
        </View>

        {/* Horizontal Session Selector */}
        <View style={styles.selectorWrapper}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            Pilih Sesi Praktikum:
          </ThemedText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sessionPillsScroll}>
            {sessions.map((sess) => {
              const sch = schedules.find((s) => s.id === sess.scheduleId);
              const isSelected = sess.id === effectiveSessionId;
              const sessPendingLeaves = getSessionLeaveRequests(sess.id).filter(
                (l) => l.status === 'PENDING'
              ).length;

              return (
                <Pressable
                  key={sess.id}
                  onPress={() => setSelectedSessionId(sess.id)}
                  style={[
                    styles.sessionPill,
                    isSelected && styles.sessionPillActive,
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={[
                      styles.sessionPillCode,
                      isSelected && styles.sessionPillTextActive,
                    ]}>
                    {sch?.courseCode ?? 'LAB'}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={[
                      styles.sessionPillTitle,
                      isSelected && styles.sessionPillTextActive,
                    ]}
                    numberOfLines={1}>
                    {sch?.title ?? 'Sesi'}
                  </ThemedText>
                  {sessPendingLeaves > 0 ? (
                    <View style={styles.pendingPillCounter}>
                      <ThemedText type="smallBold" style={styles.pendingPillCounterText}>
                        {sessPendingLeaves} Izin
                      </ThemedText>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.dotStatus,
                      sess.status === 'OPEN' ? styles.dotOpen : styles.dotClosed,
                    ]}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected Session Info Banner */}
        {selectedSchedule && selectedSession && (
          <ThemedView type="backgroundElement" style={styles.sessionBanner}>
            <View style={styles.bannerHeader}>
              <View style={styles.bannerTitleCol}>
                <ThemedText type="small" style={styles.courseCodeText}>
                  {selectedSchedule.courseCode}
                  {selectedSchedule.className ? ` • ${selectedSchedule.className}` : ''}
                </ThemedText>
                <ThemedText type="subtitle" style={styles.courseTitleText}>
                  {selectedSchedule.title}
                </ThemedText>
              </View>
              <SessionStatusBadge status={selectedSession.status} size="small" />
            </View>

            <View style={styles.bannerMetaRow}>
              <ThemedText type="small" themeColor="textSecondary">
                📍 {selectedSchedule.room}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                📅 {selectedSchedule.date} ({selectedSchedule.startTime} - {selectedSchedule.endTime})
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                👤 Asisten: {selectedAssistant?.name ?? '-'}
              </ThemedText>
            </View>
          </ThemedView>
        )}

        {/* Summary Metrics Cards (SRS-09 & SRS-10) */}
        {selectedSession && (
          <AttendanceSummaryCards
            presentCount={attendanceRecords.length}
            approvedLeaveCount={approvedExcusedUserIds.size}
            pendingLeaveCount={pendingLeaveCount}
            absentCount={absentPractitioners.length}
            totalStudents={allPractitioners.length}
            sessionStatus={selectedSession.status}
          />
        )}

        {/* Search Bar & 3-Tab Filter (Hadir | Pengajuan Izin | Belum Hadir) */}
        <View style={styles.listSection}>
          <View style={styles.searchContainer}>
            <ThemedText style={styles.searchIcon}>🔍</ThemedText>
            <TextInput
              style={[
                styles.searchInput,
                { color: theme.text, backgroundColor: 'transparent' },
              ]}
              placeholder="Cari nama, email, atau alasan izin..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <ThemedText style={styles.clearButtonText}>✕</ThemedText>
              </Pressable>
            )}
          </View>

          {/* View Mode Tabs */}
          <View style={styles.tabBar}>
            <Pressable
              onPress={() => setActiveTab('PRESENT')}
              style={[styles.tabItem, activeTab === 'PRESENT' && styles.tabItemActive]}>
              <ThemedText
                type="smallBold"
                style={[
                  styles.tabItemText,
                  activeTab === 'PRESENT' && styles.tabItemTextActive,
                ]}>
                🟢 Hadir ({filteredPresent.length})
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('LEAVES')}
              style={[styles.tabItem, activeTab === 'LEAVES' && styles.tabItemActive]}>
              <ThemedText
                type="smallBold"
                style={[
                  styles.tabItemText,
                  activeTab === 'LEAVES' && styles.tabItemTextActive,
                ]}>
                📋 Izin ({sessionLeaveRequests.length})
                {pendingLeaveCount > 0 ? ` • ${pendingLeaveCount} Baru` : ''}
              </ThemedText>
            </Pressable>

            <Pressable
              onPress={() => setActiveTab('ABSENT')}
              style={[styles.tabItem, activeTab === 'ABSENT' && styles.tabItemActive]}>
              <ThemedText
                type="smallBold"
                style={[
                  styles.tabItemText,
                  activeTab === 'ABSENT' && styles.tabItemTextActive,
                ]}>
                ⚪ Belum Hadir ({filteredAbsent.length})
              </ThemedText>
            </Pressable>
          </View>

          {/* Sub-Filter Status Izin pada Tab LEAVES (SRS-10) */}
          {activeTab === 'LEAVES' ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.leaveFilterRow}>
              {(
                [
                  { key: 'ALL', label: `Semua (${sessionLeaveRequests.length})` },
                  {
                    key: 'PENDING',
                    label: `⏳ Menunggu (${sessionLeaveRequests.filter((l) => l.status === 'PENDING').length})`,
                  },
                  {
                    key: 'APPROVED',
                    label: `✅ Disetujui (${sessionLeaveRequests.filter((l) => l.status === 'APPROVED').length})`,
                  },
                  {
                    key: 'REJECTED',
                    label: `❌ Ditolak (${sessionLeaveRequests.filter((l) => l.status === 'REJECTED').length})`,
                  },
                ] as { key: LeaveFilter; label: string }[]
              ).map((item) => {
                const isSelected = leaveFilter === item.key;
                return (
                  <Pressable
                    key={item.key}
                    onPress={() => setLeaveFilter(item.key)}
                    style={[
                      styles.leaveFilterPill,
                      isSelected && styles.leaveFilterPillActive,
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={[
                        styles.leaveFilterText,
                        isSelected && styles.leaveFilterTextActive,
                      ]}>
                      {item.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}

          {/* List Content */}
          <View style={styles.recordsList}>
            {activeTab === 'PRESENT' ? (
              filteredPresent.length === 0 ? (
                <ThemedView type="backgroundElement" style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyIcon}>📋</ThemedText>
                  <ThemedText type="subtitle" style={styles.emptyTitle}>
                    {searchQuery
                      ? 'Praktikan tidak ditemukan'
                      : 'Belum ada data presensi'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                    {searchQuery
                      ? `Tidak ada praktikan hadir yang cocok dengan pencarian "${searchQuery}".`
                      : 'Belum ada praktikan yang melakukan presensi pada sesi praktikum ini.'}
                  </ThemedText>
                </ThemedView>
              ) : (
                filteredPresent.map((rec, index) => (
                  <AttendanceRecordCard key={rec.id} record={rec} index={index} />
                ))
              )
            ) : activeTab === 'LEAVES' ? (
              filteredLeaves.length === 0 ? (
                <ThemedView type="backgroundElement" style={styles.emptyContainer}>
                  <ThemedText style={styles.emptyIcon}>📨</ThemedText>
                  <ThemedText type="subtitle" style={styles.emptyTitle}>
                    Tidak ada pengajuan izin
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                    Tidak ada permohonan izin praktikan yang sesuai dengan filter pada sesi ini.
                  </ThemedText>
                </ThemedView>
              ) : (
                filteredLeaves.map((req) => (
                  <LeaveRequestCard
                    key={req.id}
                    request={req}
                    isPresentInSession={presentUserIds.has(req.userId)}
                    isReviewing={reviewingLeaveIds.includes(req.id)}
                    onQuickDecision={handleQuickDecision}
                    onOpenReviewModal={setActiveReviewRequest}
                  />
                ))
              )
            ) : filteredAbsent.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.emptyContainer}>
                <ThemedText style={styles.emptyIcon}>🎉</ThemedText>
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  Semua praktikan telah hadir / terkonfirmasi izin
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Seluruh praktikan terdaftar sudah tercatat hadir atau memiliki izin yang disetujui (APPROVED) pada sesi ini.
                </ThemedText>
              </ThemedView>
            ) : (
              filteredAbsent.map((student, index) => (
                <AbsentPractitionerCard
                  key={student.id}
                  user={student}
                  index={index}
                  leaveStatus={leaveStatusByUserId.get(student.id)}
                />
              ))
            )}
          </View>
        </View>
      </View>

      {/* Modal Peninjauan & Keputusan Izin (SRS-10) */}
      <LeaveReviewModal
        visible={!!currentReviewModalRequest}
        request={currentReviewModalRequest}
        sessionTitle={selectedSchedule?.title}
        isSubmitting={
          currentReviewModalRequest
            ? reviewingLeaveIds.includes(currentReviewModalRequest.id)
            : false
        }
        onClose={() => setActiveReviewRequest(null)}
        onSubmitDecision={handleSubmitModalDecision}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  container: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.four,
  },
  header: {
    gap: 8,
    marginTop: Spacing.two,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badgeRole: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  badgeRoleText: {
    color: '#4F46E5',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  realtimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  realtimeBadgeText: {
    color: '#15803D',
    fontSize: 11,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
  },
  syncMetaBar: {
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  syncMetaText: {
    color: '#0369A1',
    fontSize: 11,
  },
  selectorWrapper: {
    gap: 8,
  },
  sessionPillsScroll: {
    gap: Spacing.two,
    paddingVertical: 2,
  },
  sessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  sessionPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  sessionPillCode: {
    color: '#0369A1',
    fontSize: 12,
  },
  sessionPillTitle: {
    color: '#334155',
    fontSize: 13,
    maxWidth: 150,
  },
  sessionPillTextActive: {
    color: '#FFFFFF',
  },
  pendingPillCounter: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pendingPillCounterText: {
    color: '#B45309',
    fontSize: 10,
  },
  dotStatus: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotOpen: {
    backgroundColor: '#22C55E',
  },
  dotClosed: {
    backgroundColor: '#94A3B8',
  },
  sessionBanner: {
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  bannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerTitleCol: {
    flex: 1,
    gap: 2,
  },
  courseCodeText: {
    color: '#0284C7',
    fontWeight: 'bold',
    fontSize: 12,
  },
  courseTitleText: {
    fontSize: 17,
  },
  bannerMetaRow: {
    gap: 4,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  listSection: {
    gap: Spacing.three,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  clearButton: {
    padding: 6,
  },
  clearButtonText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  tabItemActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabItemText: {
    color: '#64748B',
    fontSize: 11,
    textAlign: 'center',
  },
  tabItemTextActive: {
    color: '#0F172A',
  },
  leaveFilterRow: {
    gap: 8,
    paddingVertical: 2,
  },
  leaveFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  leaveFilterPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  leaveFilterText: {
    color: '#475569',
    fontSize: 11,
  },
  leaveFilterTextActive: {
    color: '#FFFFFF',
  },
  recordsList: {
    gap: Spacing.two,
  },
  emptyContainer: {
    padding: Spacing.five,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
    maxWidth: 320,
  },
});
