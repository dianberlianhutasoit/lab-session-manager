import React, { useState, useMemo, useEffect } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { LeaveRequestCard } from '@/components/asisten/leave-request-card';
import { LeaveReviewModal } from '@/components/asisten/leave-review-modal';
import { BottomTabInset, LaboraColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/auth-context';
import { useSessionContext } from '@/context/session-context';
import { isFirebaseConfigured } from '@/config/firebase';
import {
  evaluateLeaveActionState,
  filterSessionsForAsprak,
  getEffectiveSessionStatus,
  isAsprakAssignedToSession,
} from '@/features/asprak/asprak-dashboard-helpers';
import {
  subscribeToSprint4SessionAttendances,
  subscribeToSprint4SessionFines,
} from '@/features/asprak/services/session-snapshot-service';
import {
  subscribeToSessionAttendance,
  subscribeToSessionLeaveRequests,
} from '@/services/firestore-service';
import type { FineStatus, LeaveRequest, LeaveStatus } from '@/types';

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

function getFineBadgeColors(status: FineStatus): {
  bg: string;
  text: string;
} {
  switch (status) {
    case 'unpaid':
      return { bg: '#FEE2E2', text: '#B91C1C' };
    case 'pending':
      return { bg: '#FEF3C7', text: '#B45309' };
    case 'paid':
      return { bg: '#DCFCE7', text: '#15803D' };
    case 'waived':
      return { bg: '#E0F2FE', text: '#0369A1' };
  }
}

export default function AttendanceRecapScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();
  const { profile } = useAuth();

  const {
    sessions,
    schedules,
    users,
    reviewingLeaveIds,
    lastRealtimeSyncAt,
    realtimeEventCount,
    isFirestoreConnected,
    currentAssistantId,
    loading,
    error,
    actionError,
    clearActionError,
    getCourseById,
    getSessionAttendanceRecords,
    getSessionLeaveRequests,
    getSessionRoster,
    getStudentFineForSession,
    reviewLeaveRequest,
  } = useSessionContext();

  const loggedInAsprakId = profile?.id ?? currentAssistantId;

  // Hanya sesi yang ditugaskan kepada Asprak yang sedang login
  const mySessions = useMemo(
    () => filterSessionsForAsprak(sessions, loggedInAsprakId),
    [sessions, loggedInAsprakId]
  );

  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    return mySessions.length > 0 ? mySessions[0].id : '';
  });

  const [activeTab, setActiveTab] = useState<ViewTab>('LEAVES');
  const [leaveFilter, setLeaveFilter] = useState<LeaveFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeReviewRequest, setActiveReviewRequest] = useState<LeaveRequest | null>(
    null
  );
  const [sessionRealtimeTick, setSessionRealtimeTick] = useState<string | null>(null);
  const [listenerError, setListenerError] = useState<string | null>(null);

  // Info sesi terpilih (selalu dari daftar sesi milik Asprak)
  const selectedSession = useMemo(() => {
    return mySessions.find((s) => s.id === selectedSessionId) ?? mySessions[0];
  }, [mySessions, selectedSessionId]);

  const effectiveSessionId = selectedSession?.id ?? '';

  // Berlangganan spesifik per sesi dengan query + onSnapshot (legacy + Sprint 4 attendances & fines)
  useEffect(() => {
    if (!isFirebaseConfigured || !effectiveSessionId) return;

    const onSync = () => {
      setListenerError(null);
      setSessionRealtimeTick(new Date().toISOString());
    };
    const onErr = (err: Error) => setListenerError(err.message);

    const unsubAtt = subscribeToSessionAttendance(effectiveSessionId, onSync, onErr);
    const unsubLeaves = subscribeToSessionLeaveRequests(effectiveSessionId, onSync, onErr);
    const unsubSprint4Att = subscribeToSprint4SessionAttendances(effectiveSessionId, onSync, onErr);
    const unsubSprint4Fines = subscribeToSprint4SessionFines(effectiveSessionId, onSync, onErr);

    return () => {
      unsubAtt?.();
      unsubLeaves?.();
      unsubSprint4Att?.();
      unsubSprint4Fines?.();
    };
  }, [effectiveSessionId]);

  const effectiveSyncTimestamp = sessionRealtimeTick ?? lastRealtimeSyncAt;
  const isSessionAuthorized = isAsprakAssignedToSession(selectedSession, loggedInAsprakId);
  const isOnlineReady = !isFirebaseConfigured || isFirestoreConnected;

  const selectedSchedule = useMemo(() => {
    if (!selectedSession) return undefined;
    return schedules.find((sch) => sch.id === selectedSession.scheduleId);
  }, [schedules, selectedSession]);

  const selectedCourse = selectedSession
    ? getCourseById(selectedSession.courseId)
    : undefined;

  const selectedAssistant = useMemo(() => {
    if (!selectedSession) return undefined;
    return users.find((u) => u.id === (selectedSession.asprakId || selectedSession.assistantId));
  }, [users, selectedSession]);

  // Daftar monitoring kehadiran real-time berbasis skema Sprint 4
  const sessionRoster = useMemo(() => {
    if (!effectiveSessionId) return [];
    return getSessionRoster(effectiveSessionId);
  }, [effectiveSessionId, getSessionRoster]);

  const attendanceRecords = useMemo(() => {
    if (!effectiveSessionId) return [];
    return getSessionAttendanceRecords(effectiveSessionId);
  }, [effectiveSessionId, getSessionAttendanceRecords]);

  // SRS-10: Daftar pengajuan izin praktikan pada sesi terpilih
  const sessionLeaveRequests = useMemo(() => {
    if (!effectiveSessionId) return [];
    return getSessionLeaveRequests(effectiveSessionId);
  }, [effectiveSessionId, getSessionLeaveRequests]);

  const presentRoster = useMemo(
    () => sessionRoster.filter((r) => r.attendanceStatus === 'PRESENT'),
    [sessionRoster]
  );

  const excusedRoster = useMemo(
    () => sessionRoster.filter((r) => r.attendanceStatus === 'EXCUSED'),
    [sessionRoster]
  );

  const absentOrPendingRoster = useMemo(
    () =>
      sessionRoster.filter(
        (r) => r.attendanceStatus === 'ABSENT' || r.attendanceStatus === 'PENDING_CHECKIN'
      ),
    [sessionRoster]
  );

  const presentUserIds = useMemo(
    () => new Set(presentRoster.map((r) => r.studentId)),
    [presentRoster]
  );

  const pendingLeaveCount = useMemo(
    () => sessionLeaveRequests.filter((l) => l.status === 'PENDING').length,
    [sessionLeaveRequests]
  );

  // Filter berdasarkan teks pencarian
  const filteredPresent = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    if (!queryText) return presentRoster;
    return presentRoster.filter(
      (a) =>
        a.name.toLowerCase().includes(queryText) ||
        a.nim.toLowerCase().includes(queryText) ||
        a.email.toLowerCase().includes(queryText)
    );
  }, [presentRoster, searchQuery]);

  const filteredAbsent = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    if (!queryText) return absentOrPendingRoster;
    return absentOrPendingRoster.filter(
      (p) =>
        p.name.toLowerCase().includes(queryText) ||
        p.nim.toLowerCase().includes(queryText) ||
        p.email.toLowerCase().includes(queryText)
    );
  }, [absentOrPendingRoster, searchQuery]);

  const filteredLeaves = useMemo(() => {
    const queryText = searchQuery.trim().toLowerCase();
    return sessionLeaveRequests.filter((l) => {
      const matchFilter = leaveFilter === 'ALL' || l.status === leaveFilter;
      const student = users.find((u) => u.id === l.userId);
      const matchQuery =
        !queryText ||
        l.userName.toLowerCase().includes(queryText) ||
        (student?.nim ?? '').toLowerCase().includes(queryText) ||
        l.userEmail.toLowerCase().includes(queryText) ||
        l.reason.toLowerCase().includes(queryText);
      return matchFilter && matchQuery;
    });
  }, [sessionLeaveRequests, leaveFilter, searchQuery, users]);

  // Sinkronkan modal peninjauan izin jika datanya berubah
  const currentReviewModalRequest = useMemo(() => {
    if (!activeReviewRequest) return null;
    return (
      sessionLeaveRequests.find((l) => l.id === activeReviewRequest.id) ?? null
    );
  }, [sessionLeaveRequests, activeReviewRequest]);

  const currentReviewStudent = currentReviewModalRequest
    ? users.find((u) => u.id === currentReviewModalRequest.userId)
    : undefined;

  const currentReviewFine = currentReviewModalRequest
    ? getStudentFineForSession(
        currentReviewModalRequest.sessionId,
        currentReviewModalRequest.userId
      ) ?? null
    : null;

  const handleQuickDecision = async (
    requestId: string,
    decision: Exclude<LeaveStatus, 'PENDING'>
  ) => {
    const req = sessionLeaveRequests.find((l) => l.id === requestId);
    if (!req) return;

    const relatedFine = getStudentFineForSession(req.sessionId, req.userId) ?? null;
    const actionState = evaluateLeaveActionState({
      request: req,
      relatedFine,
      isAuthorized: isSessionAuthorized,
      isOnline: isOnlineReady,
      isSubmitting: reviewingLeaveIds.includes(requestId),
    });

    if (!actionState.canAct) {
      if (Platform.OS === 'web') {
        window.alert(actionState.blockReason ?? 'Aksi tidak diizinkan.');
      } else {
        Alert.alert('Tidak Dapat Memproses Izin', actionState.blockReason ?? 'Aksi tidak diizinkan.');
      }
      return;
    }

    await reviewLeaveRequest(requestId, decision, undefined, loggedInAsprakId);
  };

  const handleSubmitModalDecision = async (
    requestId: string,
    decision: Exclude<LeaveStatus, 'PENDING'>,
    reviewerNote?: string
  ) => {
    await reviewLeaveRequest(requestId, decision, reviewerNote, loggedInAsprakId);
  };

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
  };

  const activeErrorMessage = actionError || listenerError || error;

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
                PANEL ASPRAK
              </ThemedText>
            </View>

            {/* SRS-09: Indikator Real-Time Listener onSnapshot */}
            <View
              style={[
                styles.realtimeBadge,
                !isOnlineReady && { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
              ]}>
              <View
                style={[
                  styles.pulseDot,
                  !isOnlineReady && { backgroundColor: '#EF4444' },
                ]}
              />
              <ThemedText
                type="smallBold"
                style={[
                  styles.realtimeBadgeText,
                  !isOnlineReady && { color: '#B91C1C' },
                ]}>
                {isFirestoreConnected
                  ? 'onSnapshot Live (Firestore)'
                  : isFirebaseConfigured
                    ? 'Koneksi Terputus'
                    : 'Mode Lokal'}
              </ThemedText>
            </View>
          </View>

          <ThemedText type="title" style={styles.title}>
            Monitoring Kehadiran & Approval Izin
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Pantau kehadiran praktikan (PRESENT/EXCUSED/ABSENT), keterlambatan, status denda, serta putuskan permohonan izin secara real-time.
          </ThemedText>

          <View style={styles.syncMetaBar}>
            <ThemedText type="small" style={styles.syncMetaText}>
              🔄 Sinkronisasi Real-Time Terakhir: {formatSyncTime(effectiveSyncTimestamp)} ({realtimeEventCount} pembaruan)
            </ThemedText>
          </View>
        </View>

        {/* Error & Offline Banner */}
        {activeErrorMessage ? (
          <View style={styles.errorBanner}>
            <ThemedText style={styles.errorBannerText}>
              ⚠️ {activeErrorMessage}
            </ThemedText>
            {actionError ? (
              <Pressable onPress={clearActionError}>
                <ThemedText style={{ fontSize: 12, fontWeight: '700', color: '#B91C1C' }}>Tutup</ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {loading ? (
          <ThemedView type="backgroundElement" style={styles.emptyContainer}>
            <ActivityIndicator color={LaboraColors.primary} size="large" />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Memuat data sesi & perizinan…
            </ThemedText>
          </ThemedView>
        ) : mySessions.length === 0 ? (
          <ThemedView type="backgroundElement" style={styles.emptyContainer}>
            <ThemedText style={styles.emptyIcon}>📂</ThemedText>
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              Belum ada sesi yang ditugaskan
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Anda hanya dapat memantau kehadiran dan izin untuk sesi praktikum yang ditugaskan kepada akun Asprak Anda.
            </ThemedText>
          </ThemedView>
        ) : (
          <>
            {/* Horizontal Session Selector (Strictly scoped to logged-in Asprak) */}
            <View style={styles.selectorWrapper}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Pilih Sesi Tugas Anda ({mySessions.length}):
              </ThemedText>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sessionPillsScroll}>
                {mySessions.map((sess) => {
                  const sch = schedules.find((s) => s.id === sess.scheduleId);
                  const course = getCourseById(sess.courseId);
                  const isSelected = sess.id === effectiveSessionId;
                  const sessPendingLeaves = getSessionLeaveRequests(sess.id).filter(
                    (l) => l.status === 'PENDING'
                  ).length;
                  const effStatus = getEffectiveSessionStatus(sess);

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
                        {course?.code ?? sch?.courseCode ?? 'LAB'}
                      </ThemedText>
                      <ThemedText
                        type="small"
                        style={[
                          styles.sessionPillTitle,
                          isSelected && styles.sessionPillTextActive,
                        ]}
                        numberOfLines={1}>
                        {course?.name ?? sch?.title ?? 'Sesi'}
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
                          effStatus === 'OPEN' ? styles.dotOpen : styles.dotClosed,
                        ]}
                      />
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            {/* Selected Session Info Banner */}
            {selectedSession && (
              <ThemedView type="backgroundElement" style={styles.sessionBanner}>
                <View style={styles.bannerHeader}>
                  <View style={styles.bannerTitleCol}>
                    <ThemedText type="small" style={styles.courseCodeText}>
                      {selectedCourse?.code ?? selectedSchedule?.courseCode ?? 'LAB'}
                      {selectedSchedule?.className ? ` • ${selectedSchedule.className}` : ''}
                    </ThemedText>
                    <ThemedText type="subtitle" style={styles.courseTitleText}>
                      {selectedCourse?.name ?? selectedSchedule?.title ?? 'Sesi Praktikum'}
                    </ThemedText>
                  </View>
                  <SessionStatusBadge status={getEffectiveSessionStatus(selectedSession)} size="small" />
                </View>

                <View style={styles.bannerMetaRow}>
                  <ThemedText type="small" themeColor="textSecondary">
                    📍 {selectedSchedule?.room ?? selectedSession.labId ?? '-'}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    📅 {selectedSchedule?.date ?? '-'} ({selectedSchedule?.startTime ?? '-'} - {selectedSchedule?.endTime ?? '-'})
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    👤 Asprak: {selectedAssistant?.name ?? profile?.name ?? '-'}
                  </ThemedText>
                </View>
              </ThemedView>
            )}

            {/* Summary Metrics Cards */}
            {selectedSession && (
              <AttendanceSummaryCards
                presentCount={presentRoster.length || attendanceRecords.length}
                approvedLeaveCount={excusedRoster.length}
                pendingLeaveCount={pendingLeaveCount}
                absentCount={absentOrPendingRoster.length}
                totalStudents={sessionRoster.length}
                sessionStatus={selectedSession.status}
              />
            )}

            {/* Search Bar & 3-Tab Filter */}
            <View style={styles.listSection}>
              <View style={styles.searchContainer}>
                <ThemedText style={styles.searchIcon}>🔍</ThemedText>
                <TextInput
                  style={[
                    styles.searchInput,
                    { color: theme.text, backgroundColor: 'transparent' },
                  ]}
                  placeholder="Cari nama, NIM, email, atau alasan izin..."
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
                    ⚪ Tidak / Belum ({filteredAbsent.length})
                  </ThemedText>
                </Pressable>
              </View>

              {/* Sub-Filter Status Izin pada Tab LEAVES */}
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
                        label: `⏳ PENDING (${sessionLeaveRequests.filter((l) => l.status === 'PENDING').length})`,
                      },
                      {
                        key: 'APPROVED',
                        label: `✅ APPROVED (${sessionLeaveRequests.filter((l) => l.status === 'APPROVED').length})`,
                      },
                      {
                        key: 'REJECTED',
                        label: `❌ REJECTED (${sessionLeaveRequests.filter((l) => l.status === 'REJECTED').length})`,
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
                          : 'Belum ada praktikan yang melakukan check-in pada sesi praktikum ini.'}
                      </ThemedText>
                    </ThemedView>
                  ) : (
                    filteredPresent.map((item) => {
                      const fineColors = item.fine
                        ? getFineBadgeColors(item.fine.status)
                        : null;
                      return (
                        <ThemedView
                          key={item.studentId}
                          type="backgroundElement"
                          style={styles.rosterCard}>
                          <View style={styles.rosterTopRow}>
                            <View style={{ flex: 1 }}>
                              <ThemedText type="smallBold">{item.name}</ThemedText>
                              <ThemedText type="small" themeColor="textSecondary">
                                NIM: {item.nim} • {item.email}
                              </ThemedText>
                            </View>
                            <View
                              style={[
                                styles.rosterStatusBadge,
                                item.isLate
                                  ? { backgroundColor: '#FEF3C7' }
                                  : { backgroundColor: '#DCFCE7' },
                              ]}>
                              <ThemedText
                                type="smallBold"
                                style={{
                                  fontSize: 10,
                                  color: item.isLate ? '#B45309' : '#15803D',
                                }}>
                                {item.isLate
                                  ? `PRESENT • Terlambat ${item.lateMinutes} mnt`
                                  : 'PRESENT • Tepat Waktu'}
                              </ThemedText>
                            </View>
                          </View>

                          <View style={styles.rosterMetaRow}>
                            <ThemedText type="small" themeColor="textSecondary">
                              🕒 Check-in: {formatSyncTime(item.checkedInAt ?? '')}
                            </ThemedText>
                            {item.fine && fineColors ? (
                              <View
                                style={[
                                  styles.fineBadge,
                                  { backgroundColor: fineColors.bg },
                                ]}>
                                <ThemedText
                                  type="smallBold"
                                  style={{ fontSize: 10, color: fineColors.text }}>
                                  Fine: {item.fine.status} (Rp{item.fine.amount.toLocaleString('id-ID')})
                                </ThemedText>
                              </View>
                            ) : null}
                          </View>
                        </ThemedView>
                      );
                    })
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
                    filteredLeaves.map((req) => {
                      const relatedFine =
                        getStudentFineForSession(req.sessionId, req.userId) ?? null;
                      const fineColors = relatedFine
                        ? getFineBadgeColors(relatedFine.status)
                        : null;
                      return (
                        <View key={req.id} style={{ gap: 4 }}>
                          <LeaveRequestCard
                            request={req}
                            isPresentInSession={presentUserIds.has(req.userId)}
                            isReviewing={reviewingLeaveIds.includes(req.id)}
                            onQuickDecision={handleQuickDecision}
                            onOpenReviewModal={setActiveReviewRequest}
                          />
                          {relatedFine && fineColors ? (
                            <View
                              style={[
                                styles.fineHintBar,
                                { backgroundColor: fineColors.bg },
                              ]}>
                              <ThemedText
                                type="smallBold"
                                style={{ fontSize: 11, color: fineColors.text }}>
                                Status Denda Sesi Ini: {relatedFine.status} (Rp
                                {relatedFine.amount.toLocaleString('id-ID')})
                              </ThemedText>
                            </View>
                          ) : null}
                        </View>
                      );
                    })
                  )
                ) : filteredAbsent.length === 0 ? (
                  <ThemedView type="backgroundElement" style={styles.emptyContainer}>
                    <ThemedText style={styles.emptyIcon}>🎉</ThemedText>
                    <ThemedText type="subtitle" style={styles.emptyTitle}>
                      Semua praktikan telah hadir / terkonfirmasi izin
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                      Seluruh praktikan terdaftar sudah tercatat PRESENT atau EXCUSED pada sesi ini.
                    </ThemedText>
                  </ThemedView>
                ) : (
                  filteredAbsent.map((student) => (
                    <ThemedView
                      key={student.studentId}
                      type="backgroundElement"
                      style={styles.rosterCard}>
                      <View style={styles.rosterTopRow}>
                        <View style={{ flex: 1 }}>
                          <ThemedText type="smallBold">{student.name}</ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            NIM: {student.nim} • {student.email}
                          </ThemedText>
                        </View>
                        <View
                          style={[
                            styles.rosterStatusBadge,
                            { backgroundColor: '#F1F5F9' },
                          ]}>
                          <ThemedText
                            type="smallBold"
                            style={{ fontSize: 10, color: '#475569' }}>
                            {student.attendanceStatus === 'ABSENT'
                              ? 'ABSENT'
                              : 'BELUM CHECK-IN'}
                          </ThemedText>
                        </View>
                      </View>
                    </ThemedView>
                  ))
                )}
              </View>
            </View>
          </>
        )}
      </View>

      {/* Modal Peninjauan & Keputusan Izin (SRS-10 & Sprint 4 Waiver Guard) */}
      <LeaveReviewModal
        visible={!!currentReviewModalRequest}
        request={currentReviewModalRequest}
        sessionTitle={selectedCourse?.name ?? selectedSchedule?.title}
        courseCode={selectedCourse?.code ?? selectedSchedule?.courseCode}
        studentNim={currentReviewStudent?.nim}
        relatedFine={currentReviewFine}
        isAuthorized={isSessionAuthorized}
        isOnline={isOnlineReady}
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
  errorBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
  },
  errorBannerText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  rosterCard: {
    borderRadius: 14,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  rosterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  rosterStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  rosterMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  fineBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fineHintBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
