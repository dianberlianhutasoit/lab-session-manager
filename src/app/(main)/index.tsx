import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActiveSessionsControlBanner } from '@/components/asisten/active-sessions-banner';
import {
  ClassCard,
  LabClassWithDetails,
} from '@/components/asisten/class-card';
import { ClassFormModal } from '@/components/asisten/class-form-modal';
import { LabCard } from '@/components/asisten/lab-card';
import { LabFormModal } from '@/components/asisten/lab-form-modal';
import {
  SessionCard,
  confirmSessionStatusChange,
} from '@/components/asisten/session-card';
import { SessionDetailModal } from '@/components/asisten/session-detail-modal';
import {
  SessionFilterHeader,
  StatusFilter,
} from '@/components/asisten/session-filter-header';
import { SessionFormModal } from '@/components/asisten/session-form-modal';
import { LaboraStatCard } from '@/components/labora/LaboraStatCard';
import { LaboraTopBar } from '@/components/labora/LaboraTopBar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, LaboraColors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { SessionWithDetails, useSessionContext } from '@/context/session-context';
import {
  filterSessionsForAsprak,
  getEffectiveSessionStatus,
} from '@/features/asprak/asprak-dashboard-helpers';
import { isAsprakRole } from '@/features/asprak/role-utils';
import { resolveSessionConfigSnapshotOptional } from '@/features/asprak/services/session-snapshot-helpers';
import { findLabForRoom } from '@/utils/attendance-location';
import type {
  Lab,
  LabClass,
  LabClassFormInput,
  LabFormInput,
  SessionScheduleFormInput,
} from '@/types';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';

type ManagementSubTab = 'SESSIONS' | 'CLASSES' | 'LABS';

export default function HomeScreen() {
  const safeAreaInsets = useSafeAreaInsets();

  const {
    classes,
    users,
    updatingSessionIds,
    isFirestoreConnected,
    currentAssistantId,
    createClass,
    updateClass,
    deleteClass,
    createSessionSchedule,
    updateSessionSchedule,
    deleteSessionSchedule,
    toggleSessionStatus,
    closeAllOpenSessions,
    getSessionStatusLogs,
    getClassesWithDetails,
    getSessionsWithDetails,
    getCourseById,
    getLabById,
    getSessionRoster,
    labs,
    createLab,
    updateLab,
    deleteLab,
    leaveRequests,
    actionError,
    clearActionError,
    loading,
    error,
  } = useSessionContext();
  const { profile, logout } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<ManagementSubTab>('SESSIONS');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [activeModalSession, setActiveModalSession] = useState<SessionWithDetails | null>(
    null
  );

  // State Modal CRUD Kelas (SRS-07)
  const [isClassFormVisible, setIsClassFormVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<LabClass | null>(null);

  // State Modal CRUD Sesi & Jadwal (SRS-07)
  const [isSessionFormVisible, setIsSessionFormVisible] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionWithDetails | null>(null);
  const [preselectedClassForSession, setPreselectedClassForSession] =
    useState<LabClass | null>(null);

  // State Modal CRUD Laboratorium (SRS-07 Sprint 3)
  const [isLabFormVisible, setIsLabFormVisible] = useState(false);
  const [editingLab, setEditingLab] = useState<Lab | null>(null);

  const loggedInAsprakId = profile?.id ?? currentAssistantId;

  const assistants = useMemo(
    () => users.filter((u) => isAsprakRole(u.role)),
    [users]
  );

  const activeAssistant = useMemo(
    () => profile ?? assistants.find((a) => a.id === loggedInAsprakId),
    [profile, assistants, loggedInAsprakId]
  );

  const allClassesWithDetails = getClassesWithDetails();
  const allSessionsWithDetails = getSessionsWithDetails();

  // Hanya tampilkan sesi yang ditugaskan kepada Asprak yang sedang login
  const assignedSessions = useMemo(
    () => filterSessionsForAsprak(allSessionsWithDetails, loggedInAsprakId),
    [allSessionsWithDetails, loggedInAsprakId]
  );

  const scheduledSessions = useMemo(
    () => assignedSessions.filter((s) => getEffectiveSessionStatus(s) === 'SCHEDULED'),
    [assignedSessions]
  );

  const openSessions = useMemo(
    () => assignedSessions.filter((s) => getEffectiveSessionStatus(s) === 'OPEN'),
    [assignedSessions]
  );

  const closedSessions = useMemo(
    () => assignedSessions.filter((s) => getEffectiveSessionStatus(s) === 'CLOSED'),
    [assignedSessions]
  );

  // Total praktikan relevan pada sesi Asprak (diambil dari data nyata, tanpa angka dummy)
  const totalStudentsCount = useMemo(() => {
    const uniqueStudentIds = new Set<string>();
    for (const sess of assignedSessions) {
      for (const item of getSessionRoster(sess.id)) {
        uniqueStudentIds.add(item.studentId);
      }
    }
    return uniqueStudentIds.size;
  }, [assignedSessions, getSessionRoster]);

  // Izin yang menunggu review pada sesi milik Asprak ini
  const pendingLeavesForAsprak = useMemo(() => {
    const mySessionIds = new Set(assignedSessions.map((s) => s.id));
    return leaveRequests.filter(
      (l) => l.status === 'PENDING' && mySessionIds.has(l.sessionId)
    );
  }, [leaveRequests, assignedSessions]);

  const counts = useMemo(
    () => ({
      total: assignedSessions.length,
      scheduled: scheduledSessions.length,
      open: openSessions.length,
      closed: closedSessions.length,
    }),
    [assignedSessions.length, scheduledSessions.length, openSessions.length, closedSessions.length]
  );

  // Filter daftar sesi berdasarkan status (SCHEDULED / OPEN / CLOSED)
  const filteredSessions = useMemo(() => {
    return assignedSessions.filter((s) => {
      if (statusFilter === 'ALL') return true;
      return getEffectiveSessionStatus(s) === statusFilter;
    });
  }, [assignedSessions, statusFilter]);

  // Filter daftar kelas berdasarkan Asprak yang sedang login
  const filteredClasses = useMemo(() => {
    return allClassesWithDetails.filter((c) => c.assistantId === loggedInAsprakId);
  }, [allClassesWithDetails, loggedInAsprakId]);

  // Sync active modal session jika datanya berubah secara real-time saat modal terbuka
  const currentModalSession = useMemo(() => {
    if (!activeModalSession) return null;
    return (
      assignedSessions.find((s) => s.id === activeModalSession.id) ?? null
    );
  }, [assignedSessions, activeModalSession]);

  const currentModalLogs = useMemo(() => {
    if (!currentModalSession) return [];
    return getSessionStatusLogs(currentModalSession.id);
  }, [currentModalSession, getSessionStatusLogs]);

  const handleOpenDetail = (session: SessionWithDetails) => {
    setActiveModalSession(session);
  };

  const handleCloseDetail = () => {
    setActiveModalSession(null);
  };

  // SRS-08 & Sprint 4: Toggle status sesi menggunakan identitas Asprak yang sedang login
  const handleToggleStatus = (sessionId: string) => {
    void toggleSessionStatus(sessionId, loggedInAsprakId);
  };

  const handleBannerCloseSingle = (session: SessionWithDetails) => {
    confirmSessionStatusChange({
      session,
      selectedAssistantId: loggedInAsprakId,
      activeAssistant,
      onConfirm: () => {
        void toggleSessionStatus(session.id, loggedInAsprakId);
      },
    });
  };

  const handleCloseAllOpenSessions = () => {
    void closeAllOpenSessions(loggedInAsprakId, loggedInAsprakId);
  };

  // Handlers CRUD Kelas (SRS-07)
  const handleOpenCreateClass = () => {
    setEditingClass(null);
    setIsClassFormVisible(true);
  };

  const handleOpenEditClass = (labClass: LabClassWithDetails) => {
    setEditingClass(labClass);
    setIsClassFormVisible(true);
  };

  const handleClassFormSubmit = async (input: LabClassFormInput) => {
    if (editingClass) {
      await updateClass(editingClass.id, input);
    } else {
      await createClass(input);
    }
  };

  // Handlers CRUD Sesi & Jadwal (SRS-07)
  const handleOpenCreateSession = (preselected?: LabClass) => {
    setEditingSession(null);
    setPreselectedClassForSession(preselected ?? null);
    setIsSessionFormVisible(true);
  };

  const handleOpenEditSession = (session: SessionWithDetails) => {
    setEditingSession(session);
    setPreselectedClassForSession(null);
    setIsSessionFormVisible(true);
  };

  const handleSessionFormSubmit = async (input: SessionScheduleFormInput) => {
    if (editingSession) {
      await updateSessionSchedule(editingSession.id, input);
    } else {
      await createSessionSchedule(input);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    await deleteSessionSchedule(sessionId);
  };

  // Handlers CRUD Laboratorium (SRS-07 Sprint 3)
  const handleOpenCreateLab = () => {
    setEditingLab(null);
    setIsLabFormVisible(true);
  };

  const handleOpenEditLab = (lab: Lab) => {
    setEditingLab(lab);
    setIsLabFormVisible(true);
  };

  const handleLabFormSubmit = async (data: LabFormInput) => {
    if (editingLab) {
      await updateLab(editingLab.id, data);
    } else {
      await createLab(data);
    }
  };

  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.four,
  };

  // Current primary active session for Screen 1 Hero (strictly from assigned sessions)
  const primaryLiveSession =
    openSessions[0] ?? scheduledSessions[0] ?? assignedSessions[0] ?? null;
  const primaryRoster = useMemo(
    () => (primaryLiveSession ? getSessionRoster(primaryLiveSession.id) : []),
    [primaryLiveSession, getSessionRoster]
  );
  const primaryPresentCount = useMemo(
    () => primaryRoster.filter((r) => r.attendanceStatus === 'PRESENT').length,
    [primaryRoster]
  );
  const primaryAttendancePct =
    primaryRoster.length > 0
      ? Math.round((primaryPresentCount / primaryRoster.length) * 1000) / 10
      : 0;
  const primaryCourse = primaryLiveSession
    ? getCourseById(primaryLiveSession.courseId)
    : undefined;
  const primaryLab = primaryLiveSession
    ? (primaryLiveSession.labId ? getLabById(primaryLiveSession.labId) : undefined) ??
      findLabForRoom(labs, primaryLiveSession.schedule?.room)
    : undefined;
  const primaryConfigSnapshot = primaryLiveSession
    ? resolveSessionConfigSnapshotOptional(primaryLab, primaryLiveSession.configSnapshot)
    : null;
  const primaryEffectiveStatus = primaryLiveSession
    ? getEffectiveSessionStatus(primaryLiveSession)
    : null;
  const nextPendingLeave = pendingLeavesForAsprak[0] ?? null;
  const nextPendingStudent = nextPendingLeave
    ? users.find((u) => u.id === nextPendingLeave.userId)
    : undefined;
  const nextPendingSession = nextPendingLeave
    ? assignedSessions.find((s) => s.id === nextPendingLeave.sessionId)
    : undefined;

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: LaboraColors.background }]}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: Math.max(insets.top, Spacing.three),
          paddingBottom: insets.bottom,
        },
      ]}>
      <View style={styles.container}>
        {/* 1. Google Stitch LABORA TopBar */}
        <LaboraTopBar
          title="Dashboard Asprak"
          subtitle={profile?.email ?? 'Portal Asisten Praktikum'}
          roleBadge="Asprak"
          userName={profile?.name ?? 'Asisten Praktikum'}
          isOnline={isFirestoreConnected}
          onRoleBadgePress={() => router.push('/explore' as any)}
          onProfilePress={() => void logout()}
        />

        {/* Error Banner (Firestore atau Aksi Sesi) */}
        {(actionError || error) ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-circle" size={16} color={LaboraColors.danger} style={{ marginTop: 2 }} />
            <ThemedText style={styles.errorBannerText}>
              {actionError ?? error}
            </ThemedText>
            {actionError ? (
              <Pressable onPress={clearActionError} style={styles.errorDismissBtn}>
                <Feather name="x" size={14} color={LaboraColors.danger} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* 2. 4 Stat Cards Grid (2x2) berbasis data nyata Asprak */}
        <View style={styles.statGrid}>
          <View style={styles.statRow}>
            <View style={styles.statCol}>
              <LaboraStatCard
                value={assignedSessions.length}
                label="Sesi Ditugaskan"
                subLabel={`${scheduledSessions.length} Terjadwal`}
                iconName="calendar"
              />
            </View>
            <View style={styles.statCol}>
              <LaboraStatCard
                value={openSessions.length}
                label="Sesi Berlangsung"
                badgeText={openSessions.length > 0 ? 'LIVE' : 'IDLE'}
                badgeType="live"
                iconName="activity"
              />
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statCol}>
              <LaboraStatCard
                value={totalStudentsCount}
                label="Praktikan Terdaftar"
                badgeText="Aktif"
                badgeType="active"
                iconName="users"
              />
            </View>
            <View style={styles.statCol}>
              <LaboraStatCard
                value={pendingLeavesForAsprak.length}
                label="Izin Menunggu"
                badgeText={pendingLeavesForAsprak.length > 0 ? 'Review' : 'Aman'}
                badgeType="review"
                iconName="clipboard"
              />
            </View>
          </View>
        </View>

        {/* 3. Hero Card: Sesi Utama Milik Asprak */}
        {primaryLiveSession ? (
          <View style={styles.heroCard}>
            {/* Top row: Status dot + Time pill */}
            <View style={styles.heroTopRow}>
              <View style={styles.liveIndicatorRow}>
                <View
                  style={[
                    styles.liveDot,
                    primaryEffectiveStatus !== 'OPEN' && {
                      backgroundColor:
                        primaryEffectiveStatus === 'SCHEDULED'
                          ? LaboraColors.warning
                          : LaboraColors.textMuted,
                    },
                  ]}
                />
                <ThemedText style={styles.liveLabel}>
                  {primaryEffectiveStatus === 'OPEN'
                    ? 'SESI BERLANGSUNG SEKARANG'
                    : primaryEffectiveStatus === 'SCHEDULED'
                      ? 'SESI TERJADWAL BERIKUTNYA'
                      : 'SESI TERAKHIR SELESAI'}
                </ThemedText>
              </View>
              <View style={styles.heroTimePill}>
                <Feather name="clock" size={13} color="#047857" style={{ marginRight: 4 }} />
                <ThemedText style={styles.heroTimeText}>
                  {primaryLiveSession.schedule?.startTime ?? '-'} - {primaryLiveSession.schedule?.endTime ?? '-'} WIB
                </ThemedText>
              </View>
            </View>

            {/* Course & Lab Info */}
            <ThemedText style={styles.heroCourseTitle}>
              {primaryCourse?.name ?? primaryLiveSession.schedule?.title ?? 'Sesi Praktikum'}
            </ThemedText>

            <View style={styles.heroMetaRow}>
              {(primaryCourse?.code || primaryLiveSession.schedule?.courseCode) ? (
                <View style={styles.heroCodeBadge}>
                  <ThemedText style={styles.heroCodeText}>
                    {primaryCourse?.code ?? primaryLiveSession.schedule?.courseCode}
                  </ThemedText>
                </View>
              ) : null}
              {primaryLiveSession.schedule?.className ? (
                <View style={styles.heroMetaItem}>
                  <Feather name="book" size={13} color={LaboraColors.textMuted} />
                  <ThemedText style={styles.heroMetaText}>
                    {primaryLiveSession.schedule.className}
                  </ThemedText>
                </View>
              ) : null}
              <ThemedText style={styles.heroMetaDot}>•</ThemedText>
              <View style={styles.heroMetaItem}>
                <Feather name="map-pin" size={13} color={LaboraColors.textMuted} />
                <ThemedText style={styles.heroMetaText}>
                  {primaryLab?.name ?? primaryLiveSession.schedule?.room ?? 'Lab belum ditentukan'}
                </ThemedText>
              </View>
            </View>

            {/* Attendance Progress Bar Container */}
            <View style={styles.attendanceProgressBox}>
              <View style={styles.attendanceProgressHeader}>
                <View style={styles.attendanceProgressTitleRow}>
                  <Feather name="user-check" size={14} color={LaboraColors.primary} />
                  <ThemedText style={styles.attendanceProgressLabel}>
                    Kehadiran Praktikan
                  </ThemedText>
                </View>
                <ThemedText style={styles.attendanceProgressNumbers}>
                  <ThemedText style={styles.attendanceProgressBold}>
                    {primaryPresentCount}
                  </ThemedText> / {primaryRoster.length} Mahasiswa ({primaryAttendancePct}%)
                </ThemedText>
              </View>

              {/* Progress bar track */}
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(100, primaryAttendancePct)}%` },
                  ]}
                />
              </View>

              <View style={styles.progressFooterRow}>
                <ThemedText
                  style={[
                    styles.progressToleranceText,
                    !primaryConfigSnapshot && { color: LaboraColors.danger },
                  ]}>
                  {primaryConfigSnapshot
                    ? `Toleransi: ${primaryConfigSnapshot.gracePeriodMinutes} mnt • Denda Rp${primaryConfigSnapshot.lateFineAmount.toLocaleString('id-ID')}`
                    : 'Aturan toleransi & denda Lab belum dikonfigurasi Aslab'}
                </ThemedText>
                <ThemedText style={styles.progressRemainingText}>
                  Belum hadir: {Math.max(0, primaryRoster.length - primaryPresentCount)}
                </ThemedText>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.heroActionRow}>
              <Pressable
                style={styles.heroPrimaryBtn}
                onPress={() => handleOpenDetail(primaryLiveSession)}>
                <Feather name="activity" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <ThemedText style={styles.heroPrimaryBtnText}>Pantau Presensi</ThemedText>
              </Pressable>

              <Pressable
                disabled={updatingSessionIds.includes(primaryLiveSession.id)}
                style={[
                  styles.heroSecondaryBtn,
                  updatingSessionIds.includes(primaryLiveSession.id) && { opacity: 0.6 },
                ]}
                onPress={() => handleBannerCloseSingle(primaryLiveSession)}>
                <Feather
                  name={primaryEffectiveStatus === 'OPEN' ? 'stop-circle' : 'play-circle'}
                  size={16}
                  color={LaboraColors.primary}
                  style={{ marginRight: 6 }}
                />
                <ThemedText style={styles.heroSecondaryBtnText}>
                  {updatingSessionIds.includes(primaryLiveSession.id)
                    ? 'Memproses...'
                    : primaryEffectiveStatus === 'OPEN'
                      ? 'Tutup Sesi'
                      : 'Buka Sesi'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* 4. Quick Approval Alert: Berbasis data nyata izin yang menunggu */}
        {nextPendingLeave ? (
          <View style={styles.quickApprovalCard}>
            <View style={styles.quickApprovalAccent} />
            <View style={styles.quickApprovalBody}>
              <View style={styles.quickApprovalTopRow}>
                <View style={styles.quickApprovalIconCircle}>
                  <Feather name="briefcase" size={16} color={LaboraColors.warning} />
                </View>
                <View style={styles.quickApprovalHeaderCol}>
                  <View style={styles.quickApprovalBadgeRow}>
                    <ThemedText style={styles.quickApprovalTag}>PERLU PERSETUJUAN ({pendingLeavesForAsprak.length})</ThemedText>
                    <ThemedText style={styles.quickApprovalTime}>
                      {nextPendingLeave.category}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.quickApprovalName}>
                    {nextPendingLeave.userName} {nextPendingStudent?.nim ? `(${nextPendingStudent.nim})` : ''}
                  </ThemedText>
                </View>
              </View>

              <ThemedText style={styles.quickApprovalReason} numberOfLines={2}>
                {nextPendingSession?.schedule?.title ? `${nextPendingSession.schedule.title}: ` : ''}
                {nextPendingLeave.reason}
              </ThemedText>

              <View style={styles.quickApprovalBtnRow}>
                <Pressable
                  style={styles.quickApproveBtn}
                  onPress={() => router.push('/explore' as any)}>
                  <Feather name="check-square" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <ThemedText style={styles.quickApproveBtnText}>Tinjau & Putuskan</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.quickApprovalEmpty}>
            <Feather name="check-circle" size={16} color={LaboraColors.successDark} />
            <ThemedText style={styles.quickApprovalEmptyText}>
              Tidak ada permohonan izin yang menunggu review pada sesi Anda.
            </ThemedText>
          </View>
        )}

        {/* 5. Aksi Cepat Asprak */}
        <View style={styles.quickAccessSection}>
          <ThemedText style={styles.sectionHeading}>Aksi Cepat Asprak</ThemedText>
          <View style={styles.quickAccessRow}>
            <Pressable
              style={styles.quickActionItem}
              onPress={() => handleOpenCreateSession()}>
              <View style={[styles.quickActionCircle, styles.quickActionCircleActive]}>
                <Feather name="plus-circle" size={20} color={LaboraColors.primary} />
              </View>
              <ThemedText style={styles.quickActionLabel}>Buat Sesi</ThemedText>
            </Pressable>

            <Pressable
              style={styles.quickActionItem}
              onPress={() => router.push('/explore' as any)}>
              <View style={styles.quickActionCircle}>
                <Feather name="check-circle" size={20} color={LaboraColors.textSecondary} />
              </View>
              <ThemedText style={styles.quickActionLabel}>Approval Izin</ThemedText>
            </Pressable>

            <Pressable
              style={styles.quickActionItem}
              onPress={handleOpenCreateClass}>
              <View style={styles.quickActionCircle}>
                <Feather name="book-open" size={20} color={LaboraColors.textSecondary} />
              </View>
              <ThemedText style={styles.quickActionLabel}>Buat Kelas</ThemedText>
            </Pressable>

            <Pressable
              style={styles.quickActionItem}
              onPress={() => router.push('/maps' as any)}>
              <View style={styles.quickActionCircle}>
                <Feather name="map-pin" size={20} color={LaboraColors.textSecondary} />
              </View>
              <ThemedText style={styles.quickActionLabel}>Peta Lab</ThemedText>
            </Pressable>
          </View>
        </View>

        {/* 6. Sub-Tab Switcher: Jadwal Sesi vs Data Kelas vs Lokasi Lab (SRS-07) */}
        <View style={styles.subTabContainer}>
          <Pressable
            onPress={() => setActiveSubTab('SESSIONS')}
            style={[
              styles.subTabButton,
              activeSubTab === 'SESSIONS' && styles.subTabButtonActive,
            ]}>
            <ThemedText
              type="smallBold"
              style={[
                styles.subTabText,
                activeSubTab === 'SESSIONS' && styles.subTabTextActive,
              ]}>
              📅 Sesi Saya ({assignedSessions.length})
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setActiveSubTab('CLASSES')}
            style={[
              styles.subTabButton,
              activeSubTab === 'CLASSES' && styles.subTabButtonActive,
            ]}>
            <ThemedText
              type="smallBold"
              style={[
                styles.subTabText,
                activeSubTab === 'CLASSES' && styles.subTabTextActive,
              ]}>
              🏫 Kelas Saya ({filteredClasses.length})
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setActiveSubTab('LABS')}
            style={[
              styles.subTabButton,
              activeSubTab === 'LABS' && styles.subTabButtonActive,
            ]}>
            <ThemedText
              type="smallBold"
              style={[
                styles.subTabText,
                activeSubTab === 'LABS' && styles.subTabTextActive,
              ]}>
              🏢 Lab ({labs.length})
            </ThemedText>
          </Pressable>
        </View>

        {/* Filter & Overview Component */}
        {activeSubTab !== 'LABS' ? (
          <SessionFilterHeader
            assistants={assistants}
            selectedAssistantId={loggedInAsprakId}
            onSelectAssistant={() => {}}
            statusFilter={statusFilter}
            onSelectStatusFilter={setStatusFilter}
            showAssistantFilter={false}
            counts={counts}
          />
        ) : null}

        {activeSubTab === 'SESSIONS' ? (
          /* TAB 1: JADWAL SESI & KONTROL STATUS (SRS-07 & SRS-08) */
          <View style={styles.sessionList}>
            {/* SRS-08: Banner Kontrol Cepat Sesi Aktif (OPEN) */}
            <ActiveSessionsControlBanner
              openSessions={openSessions}
              selectedAssistantId={loggedInAsprakId}
              activeAssistant={activeAssistant}
              updatingSessionIds={updatingSessionIds}
              onCloseSingleSession={handleBannerCloseSingle}
              onCloseAllSessions={handleCloseAllOpenSessions}
            />

            <View style={styles.listHeader}>
              <ThemedText type="subtitle" style={styles.listTitle}>
                Jadwal Sesi Praktikum Anda
              </ThemedText>
              <Pressable
                onPress={() => handleOpenCreateSession()}
                style={({ pressed }) => [styles.primaryAddButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.primaryAddButtonText}>
                  + Tambah Sesi
                </ThemedText>
              </Pressable>
            </View>

            {loading ? (
              <ThemedView type="backgroundElement" style={styles.emptyContainer}>
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  Memuat sesi…
                </ThemedText>
              </ThemedView>
            ) : filteredSessions.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.emptyContainer}>
                <ThemedText style={styles.emptyIcon}>📂</ThemedText>
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  Tidak ada sesi praktikum
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  {error ?? 'Belum ada sesi praktikum yang ditugaskan kepada Anda untuk filter ini.'}
                </ThemedText>
              </ThemedView>
            ) : (
              filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  selectedAssistantId={loggedInAsprakId}
                  activeAssistant={activeAssistant}
                  isUpdating={updatingSessionIds.includes(session.id)}
                  onOpenDetail={handleOpenDetail}
                  onToggleStatus={handleToggleStatus}
                  onEditSession={handleOpenEditSession}
                  onDeleteSession={handleDeleteSession}
                />
              ))
            )}
          </View>
        ) : activeSubTab === 'CLASSES' ? (
          /* TAB 2: DATA KELAS PRAKTIKUM (SRS-07) */
          <View style={styles.sessionList}>
            <View style={styles.listHeader}>
              <ThemedText type="subtitle" style={styles.listTitle}>
                Master Kelas Praktikum ({filteredClasses.length})
              </ThemedText>

              <Pressable
                onPress={handleOpenCreateClass}
                style={({ pressed }) => [styles.primaryAddButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.primaryAddButtonText}>
                  + Tambah Kelas
                </ThemedText>
              </Pressable>
            </View>

            {filteredClasses.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.emptyContainer}>
                <ThemedText style={styles.emptyIcon}>🏫</ThemedText>
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  Belum ada data kelas
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Tambahkan kelas praktikum baru menggunakan tombol di atas.
                </ThemedText>
              </ThemedView>
            ) : (
              filteredClasses.map((labClass) => (
                <ClassCard
                  key={labClass.id}
                  labClass={labClass}
                  onAddSession={(cls) => handleOpenCreateSession(cls)}
                  onEdit={handleOpenEditClass}
                  onDelete={deleteClass}
                />
              ))
            )}
          </View>
        ) : (
          /* TAB 3: MASTER RUANGAN LABORATORIUM (SRS-07 Sprint 3) */
          <View style={styles.sessionList}>
            <View style={styles.listHeader}>
              <ThemedText type="subtitle" style={styles.listTitle}>
                Data Laboratorium ({labs.length})
              </ThemedText>

              <Pressable
                onPress={handleOpenCreateLab}
                style={({ pressed }) => [styles.primaryAddButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.primaryAddButtonText}>
                  + Tambah Lab
                </ThemedText>
              </Pressable>
            </View>

            {labs.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.emptyContainer}>
                <ThemedText style={styles.emptyIcon}>🏢</ThemedText>
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  Belum ada data lab
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Tambahkan lokasi laboratorium baru untuk pemantauan GPS geofencing.
                </ThemedText>
              </ThemedView>
            ) : (
              labs.map((lab) => (
                <LabCard
                  key={lab.id}
                  lab={lab}
                  onEdit={handleOpenEditLab}
                  onDelete={deleteLab}
                />
              ))
            )}
          </View>
        )}
      </View>

      {/* MODAL 1: Detail & Log Sesi (SRS-08) */}
      <SessionDetailModal
        session={currentModalSession}
        visible={Boolean(activeModalSession)}
        selectedAssistantId={loggedInAsprakId}
        activeAssistant={activeAssistant}
        statusLogs={currentModalLogs}
        isUpdating={
          activeModalSession
            ? updatingSessionIds.includes(activeModalSession.id)
            : false
        }
        onClose={handleCloseDetail}
        onToggleStatus={handleToggleStatus}
        onEditSession={handleOpenEditSession}
      />

      {/* MODAL 2: Form Tambah/Ubah Kelas (SRS-07) */}
      <ClassFormModal
        visible={isClassFormVisible}
        initialData={editingClass}
        assistants={assistants}
        onClose={() => setIsClassFormVisible(false)}
        onSubmit={handleClassFormSubmit}
      />

      {/* MODAL 3: Form Tambah/Ubah Sesi & Jadwal (SRS-07) */}
      <SessionFormModal
        visible={isSessionFormVisible}
        initialSession={editingSession}
        classes={classes}
        assistants={assistants}
        preselectedClass={preselectedClassForSession}
        onClose={() => setIsSessionFormVisible(false)}
        onSubmit={handleSessionFormSubmit}
      />

      {/* MODAL 4: Form Tambah/Ubah Laboratorium (SRS-07 Sprint 3) */}
      <LabFormModal
        visible={isLabFormVisible}
        initialData={editingLab}
        onClose={() => setIsLabFormVisible(false)}
        onSubmit={handleLabFormSubmit}
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

  /* 2x2 Stat Grid */
  statGrid: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCol: {
    flex: 1,
  },

  /* Screen 1 Hero Card */
  heroCard: {
    backgroundColor: LaboraColors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    shadowColor: LaboraColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: LaboraColors.success,
  },
  liveLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.6,
    color: LaboraColors.primary,
  },
  heroTimePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  heroTimeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  heroCourseTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  heroCodeBadge: {
    backgroundColor: LaboraColors.blush,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  heroCodeText: {
    fontSize: 11,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  heroMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroMetaText: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
    fontWeight: '500',
  },
  heroMetaDot: {
    color: LaboraColors.textMuted,
    fontSize: 12,
  },

  /* Attendance Progress Box */
  attendanceProgressBox: {
    backgroundColor: LaboraColors.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  attendanceProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attendanceProgressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attendanceProgressLabel: {
    fontSize: 12,
    color: LaboraColors.textPrimary,
    fontWeight: '600',
  },
  attendanceProgressNumbers: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
  },
  attendanceProgressBold: {
    fontWeight: '800',
    color: LaboraColors.primary,
  },
  progressBarTrack: {
    height: 7,
    backgroundColor: '#F1E8EB',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: LaboraColors.primary,
    borderRadius: 9999,
  },
  progressFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressToleranceText: {
    fontSize: 11,
    color: LaboraColors.textMuted,
  },
  progressRemainingText: {
    fontSize: 11,
    fontWeight: '600',
    color: LaboraColors.primary,
  },

  /* Hero Action Row */
  heroActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  heroPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LaboraColors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: LaboraColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  heroPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  heroSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LaboraColors.blush,
    paddingVertical: 12,
    borderRadius: 12,
  },
  heroSecondaryBtnText: {
    color: LaboraColors.primary,
    fontWeight: '700',
    fontSize: 13,
  },

  /* Quick Approval Card */
  quickApprovalCard: {
    flexDirection: 'row',
    backgroundColor: LaboraColors.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  quickApprovalAccent: {
    width: 5,
    backgroundColor: LaboraColors.warning,
  },
  quickApprovalBody: {
    flex: 1,
    padding: 14,
    gap: 8,
  },
  quickApprovalTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  quickApprovalIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickApprovalHeaderCol: {
    flex: 1,
    gap: 2,
  },
  quickApprovalBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickApprovalTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  quickApprovalTime: {
    fontSize: 10,
    color: LaboraColors.textMuted,
  },
  quickApprovalName: {
    fontSize: 14,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  quickApprovalReason: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
    lineHeight: 16,
  },
  quickApprovalBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  quickApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#047857',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  quickApproveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  quickAttachmentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LaboraColors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  quickAttachmentBtnText: {
    color: LaboraColors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },

  /* Section Heading & Quick Access */
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
    marginBottom: 8,
  },
  quickAccessSection: {
    width: '100%',
  },
  quickAccessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  quickActionItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: LaboraColors.card,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  quickActionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LaboraColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickActionCircleActive: {
    backgroundColor: LaboraColors.blush,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: LaboraColors.textPrimary,
  },

  /* Sub Tabs */
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: LaboraColors.surfaceAlt,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  subTabButtonActive: {
    backgroundColor: LaboraColors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  subTabText: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
    fontWeight: '600',
  },
  subTabTextActive: {
    color: LaboraColors.primary,
    fontWeight: '800',
  },

  /* List & Headers */
  sessionList: {
    width: '100%',
    gap: 12,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
  primaryAddButton: {
    backgroundColor: LaboraColors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  primaryAddButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  pressed: {
    opacity: 0.8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    color: LaboraColors.textMuted,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: LaboraColors.dangerSoft,
    borderWidth: 1,
    borderColor: LaboraColors.dangerBorder,
    borderRadius: 14,
    padding: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: LaboraColors.danger,
    fontWeight: '600',
  },
  errorDismissBtn: {
    padding: 4,
  },
  quickApprovalEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: LaboraColors.successSoft,
    borderWidth: 1,
    borderColor: LaboraColors.successBorder,
    borderRadius: 14,
    padding: 12,
  },
  quickApprovalEmptyText: {
    flex: 1,
    fontSize: 12,
    color: LaboraColors.successDark,
    fontWeight: '600',
  },
});
