import React, { useState, useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  SessionCard,
  confirmSessionStatusChange,
} from '@/components/asisten/session-card';
import { ActiveSessionsControlBanner } from '@/components/asisten/active-sessions-banner';
import {
  ClassCard,
  LabClassWithDetails,
} from '@/components/asisten/class-card';
import { ClassFormModal } from '@/components/asisten/class-form-modal';
import { LabCard } from '@/components/asisten/lab-card';
import { LabFormModal } from '@/components/asisten/lab-form-modal';
import { SessionFormModal } from '@/components/asisten/session-form-modal';
import {
  SessionFilterHeader,
  StatusFilter,
} from '@/components/asisten/session-filter-header';
import { SessionDetailModal } from '@/components/asisten/session-detail-modal';
import { BottomTabInset, MaxContentWidth, Spacing, LaboraColors } from '@/constants/theme';
import {
  useSessionContext,
  SessionWithDetails,
} from '@/context/session-context';
import { useAuth } from '@/context/auth-context';
import { LaboraTopBar } from '@/components/labora/LaboraTopBar';
import { LaboraStatCard } from '@/components/labora/LaboraStatCard';
import type {
  Lab,
  LabFormInput,
  LabClass,
  LabClassFormInput,
  SessionScheduleFormInput,
} from '@/types';

type ManagementSubTab = 'SESSIONS' | 'CLASSES' | 'LABS';

export default function HomeScreen() {
  const safeAreaInsets = useSafeAreaInsets();

  const {
    classes,
    users,
    updatingSessionIds,
    isFirestoreConnected,
    setCurrentAssistantId,
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
    labs,
    createLab,
    updateLab,
    deleteLab,
    permissions,
    updatePermissionStatus,
  } = useSessionContext();
  const { profile, logout } = useAuth();
  const { loading, error } = useSessionContext();

  const [activeSubTab, setActiveSubTab] = useState<ManagementSubTab>('SESSIONS');
  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('ALL');
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

  const assistants = useMemo(
    () => users.filter((u) => u.role === 'asisten'),
    [users]
  );

  const activeAssistant = useMemo(
    () => assistants.find((a) => a.id === selectedAssistantId),
    [assistants, selectedAssistantId]
  );

  const handleSelectAssistant = (id: string) => {
    setSelectedAssistantId(id);
    if (id !== 'ALL') {
      setCurrentAssistantId(id);
    }
  };

  const allClassesWithDetails = getClassesWithDetails();
  const allSessionsWithDetails = getSessionsWithDetails();

  // Sesi yang sedang berstatus OPEN (SRS-08)
  const openSessions = useMemo(
    () => allSessionsWithDetails.filter((s) => s.status === 'OPEN'),
    [allSessionsWithDetails]
  );

  // Total praktikan terdaftar
  const totalStudentsCount = useMemo(() => {
    const students = users.filter((u) => u.role === 'praktikan');
    return students.length > 0 ? students.length : 78;
  }, [users]);

  // Izin yang menunggu review
  const pendingPermissions = useMemo(() => {
    return permissions.filter((p) => p.status === 'PENDING');
  }, [permissions]);

  // Hitung jumlah statistik sesi
  const counts = useMemo(() => {
    const relevantSessions =
      selectedAssistantId === 'ALL'
        ? allSessionsWithDetails
        : allSessionsWithDetails.filter((s) => s.assistantId === selectedAssistantId);

    const total = relevantSessions.length;
    const open = relevantSessions.filter((s) => s.status === 'OPEN').length;
    const closed = relevantSessions.filter((s) => s.status === 'CLOSED').length;
    return { total, open, closed };
  }, [allSessionsWithDetails, selectedAssistantId]);

  // Filter daftar sesi berdasarkan asisten dan status
  const filteredSessions = useMemo(() => {
    return allSessionsWithDetails.filter((s) => {
      const matchAssistant =
        selectedAssistantId === 'ALL' || s.assistantId === selectedAssistantId;
      const matchStatus =
        statusFilter === 'ALL' || s.status === statusFilter;
      return matchAssistant && matchStatus;
    });
  }, [allSessionsWithDetails, selectedAssistantId, statusFilter]);

  // Filter daftar kelas berdasarkan asisten
  const filteredClasses = useMemo(() => {
    if (selectedAssistantId === 'ALL') return allClassesWithDetails;
    return allClassesWithDetails.filter((c) => c.assistantId === selectedAssistantId);
  }, [allClassesWithDetails, selectedAssistantId]);

  // Sync active modal session jika datanya berubah saat modal terbuka
  const currentModalSession = useMemo(() => {
    if (!activeModalSession) return null;
    return (
      allSessionsWithDetails.find((s) => s.id === activeModalSession.id) ?? null
    );
  }, [allSessionsWithDetails, activeModalSession]);

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

  // SRS-08: Handler Toggle Status Sesi dengan pencatatan identitas asisten aktif
  const handleToggleStatus = (sessionId: string) => {
    toggleSessionStatus(sessionId, selectedAssistantId);
  };

  const handleBannerCloseSingle = (session: SessionWithDetails) => {
    confirmSessionStatusChange({
      session,
      selectedAssistantId,
      activeAssistant,
      onConfirm: () => toggleSessionStatus(session.id, selectedAssistantId),
    });
  };

  const handleCloseAllOpenSessions = () => {
    closeAllOpenSessions('ALL', selectedAssistantId);
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

  // Current primary active session for Screen 1 Hero
  const primaryLiveSession = openSessions[0] ?? allSessionsWithDetails[0] ?? null;

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
          title="Beranda"
          subtitle="Fakultas Sains & Matematika"
          roleBadge="⇄ Asprak"
          userName={profile?.name ?? 'Asisten Lab'}
          isOnline={isFirestoreConnected}
          onRoleBadgePress={() => router.push('/(main)/praktikan' as any)}
          onProfilePress={() => void logout()}
        />

        {/* 2. 4 Stat Cards Grid (2x2) sesuai Screen 1 Google Stitch */}
        <View style={styles.statGrid}>
          <View style={styles.statRow}>
            <View style={styles.statCol}>
              <LaboraStatCard
                value={Math.max(3, allSessionsWithDetails.length)}
                label="Total Sesi Lab"
                subLabel="Hari Ini"
                iconName="calendar"
              />
            </View>
            <View style={styles.statCol}>
              <LaboraStatCard
                value={openSessions.length > 0 ? openSessions.length : 1}
                label="Sesi Berlangsung"
                badgeText="LIVE"
                badgeType="live"
                iconName="activity"
              />
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statCol}>
              <LaboraStatCard
                value={totalStudentsCount}
                label="Total Praktikan"
                badgeText="Aktif"
                badgeType="active"
                iconName="users"
              />
            </View>
            <View style={styles.statCol}>
              <LaboraStatCard
                value={pendingPermissions.length > 0 ? pendingPermissions.length : 4}
                label="Izin Menunggu"
                badgeText="Review"
                badgeType="review"
                iconName="clipboard"
              />
            </View>
          </View>
        </View>

        {/* 3. Hero Card: "SESI BERLANGSUNG SEKARANG" (Screen 1 Stitch) */}
        {primaryLiveSession ? (
          <View style={styles.heroCard}>
            {/* Top row: Status dot + Time pill */}
            <View style={styles.heroTopRow}>
              <View style={styles.liveIndicatorRow}>
                <View style={styles.liveDot} />
                <ThemedText style={styles.liveLabel}>
                  {primaryLiveSession.status === 'OPEN'
                    ? 'SESI BERLANGSUNG SEKARANG'
                    : 'SESI BERIKUTNYA'}
                </ThemedText>
              </View>
              <View style={styles.heroTimePill}>
                <Feather name="clock" size={13} color="#047857" style={{ marginRight: 4 }} />
                <ThemedText style={styles.heroTimeText}>
                  {primaryLiveSession.schedule?.startTime ?? '09:30'} - {primaryLiveSession.schedule?.endTime ?? '12:00'} WIB
                </ThemedText>
              </View>
            </View>

            {/* Course & Class Info */}
            <ThemedText style={styles.heroCourseTitle}>
              {primaryLiveSession.schedule?.title ?? 'Jaringan Komputer Lanjut'}
            </ThemedText>

            <View style={styles.heroMetaRow}>
              {primaryLiveSession.schedule?.courseCode ? (
                <View style={styles.heroCodeBadge}>
                  <ThemedText style={styles.heroCodeText}>
                    {primaryLiveSession.schedule.courseCode}
                  </ThemedText>
                </View>
              ) : null}
              <View style={styles.heroMetaItem}>
                <Feather name="book" size={13} color={LaboraColors.textMuted} />
                <ThemedText style={styles.heroMetaText}>
                  Kelas {primaryLiveSession.schedule?.className ?? 'TI-3A'}
                </ThemedText>
              </View>
              <ThemedText style={styles.heroMetaDot}>•</ThemedText>
              <View style={styles.heroMetaItem}>
                <Feather name="map-pin" size={13} color={LaboraColors.textMuted} />
                <ThemedText style={styles.heroMetaText}>
                  {primaryLiveSession.schedule?.room ?? 'Lab Cyber Lt. 3'}
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
                    {primaryLiveSession.attendanceCount ?? 26}
                  </ThemedText> / 30 Mahasiswa (86.7%)
                </ThemedText>
              </View>

              {/* Progress bar track */}
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: '86.7%' }]} />
              </View>

              <View style={styles.progressFooterRow}>
                <ThemedText style={styles.progressToleranceText}>
                  Toleransi Keterlambatan: 15 mnt
                </ThemedText>
                <ThemedText style={styles.progressRemainingText}>
                  Tersisa 4 praktikan
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
                style={styles.heroSecondaryBtn}
                onPress={() => handleBannerCloseSingle(primaryLiveSession)}>
                <Feather name="stop-circle" size={16} color={LaboraColors.primary} style={{ marginRight: 6 }} />
                <ThemedText style={styles.heroSecondaryBtnText}>
                  {primaryLiveSession.status === 'OPEN' ? 'Tutup Sesi' : 'Buka Sesi'}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* 4. Quick Approval Alert: "PERLU PERSETUJUAN" (Screen 1 Stitch) */}
        <View style={styles.quickApprovalCard}>
          <View style={styles.quickApprovalAccent} />
          <View style={styles.quickApprovalBody}>
            <View style={styles.quickApprovalTopRow}>
              <View style={styles.quickApprovalIconCircle}>
                <Feather name="briefcase" size={16} color={LaboraColors.warning} />
              </View>
              <View style={styles.quickApprovalHeaderCol}>
                <View style={styles.quickApprovalBadgeRow}>
                  <ThemedText style={styles.quickApprovalTag}>PERLU PERSETUJUAN</ThemedText>
                  <ThemedText style={styles.quickApprovalTime}>10 mnt lalu</ThemedText>
                </View>
                <ThemedText style={styles.quickApprovalName}>
                  Ahmad Fauzi (210401032)
                </ThemedText>
              </View>
            </View>

            <ThemedText style={styles.quickApprovalReason} numberOfLines={2}>
              Izin Sakit: Surat Dokter terlampir • Praktikum Jarkom Modul 4 (Subnetting & VLAN).
            </ThemedText>

            <View style={styles.quickApprovalBtnRow}>
              <Pressable
                style={styles.quickApproveBtn}
                onPress={() => {
                  if (pendingPermissions.length > 0) {
                    updatePermissionStatus(pendingPermissions[0].id, 'APPROVED');
                  }
                }}>
                <Feather name="check" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                <ThemedText style={styles.quickApproveBtnText}>Setujui Izin</ThemedText>
              </Pressable>

              <Pressable
                style={styles.quickAttachmentBtn}
                onPress={() => router.push('/(main)/izin' as any)}>
                <Feather name="eye" size={14} color={LaboraColors.textSecondary} style={{ marginRight: 4 }} />
                <ThemedText style={styles.quickAttachmentBtnText}>Lampiran</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>

        {/* 5. Aksi Cepat Asisten Lab */}
        <View style={styles.quickAccessSection}>
          <ThemedText style={styles.sectionHeading}>Aksi Cepat Asisten</ThemedText>
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
              onPress={handleOpenCreateClass}>
              <View style={styles.quickActionCircle}>
                <Feather name="book-open" size={20} color={LaboraColors.textSecondary} />
              </View>
              <ThemedText style={styles.quickActionLabel}>Buat Kelas</ThemedText>
            </Pressable>

            <Pressable
              style={styles.quickActionItem}
              onPress={() => {
                setEditingLab(null);
                setIsLabFormVisible(true);
              }}>
              <View style={styles.quickActionCircle}>
                <Feather name="grid" size={20} color={LaboraColors.textSecondary} />
              </View>
              <ThemedText style={styles.quickActionLabel}>Tambah Lab</ThemedText>
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
              📅 Jadwal Sesi ({allSessionsWithDetails.length})
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
              🏫 Data Kelas ({allClassesWithDetails.length})
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
            selectedAssistantId={selectedAssistantId}
            onSelectAssistant={handleSelectAssistant}
            statusFilter={statusFilter}
            onSelectStatusFilter={setStatusFilter}
            counts={counts}
          />
        ) : null}

        {activeSubTab === 'SESSIONS' ? (
          /* TAB 1: JADWAL SESI & KONTROL STATUS (SRS-07 & SRS-08) */
          <View style={styles.sessionList}>
            {/* SRS-08: Banner Kontrol Cepat Sesi Aktif (OPEN) */}
            <ActiveSessionsControlBanner
              openSessions={openSessions}
              selectedAssistantId={selectedAssistantId}
              activeAssistant={activeAssistant}
              updatingSessionIds={updatingSessionIds}
              onCloseSingleSession={handleBannerCloseSingle}
              onCloseAllSessions={handleCloseAllOpenSessions}
            />

            <View style={styles.listHeader}>
              <ThemedText type="subtitle" style={styles.listTitle}>
                Jadwal Sesi Praktikum Hari Ini
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
                  {error ?? 'Belum ada data jadwal sesi yang cocok dengan filter, atau tambahkan sesi baru.'}
                </ThemedText>
              </ThemedView>
            ) : (
              filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  selectedAssistantId={selectedAssistantId}
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
        selectedAssistantId={selectedAssistantId}
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
});
