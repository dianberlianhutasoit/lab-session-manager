import React, { useState, useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
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
import { BottomTabInset, MaxContentWidth, MemphisColors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useSessionContext,
  SessionWithDetails,
} from '@/context/session-context';
import { useAuth } from '@/context/auth-context';
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
  const theme = useTheme();

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
        {/* 1. Top Profile Bar (sesuai Mockup Kiri) */}
        <View style={styles.topProfileBar}>
          <View style={styles.profileLeft}>
            <View style={styles.avatarCircle}>
              <ThemedText style={styles.avatarInitial}>
                {profile?.name?.trim().charAt(0).toUpperCase() || 'A'}
              </ThemedText>
            </View>
            <View style={styles.greetingCol}>
              <ThemedText style={styles.greetingText}>Good Morning,</ThemedText>
              <ThemedText style={styles.userName} numberOfLines={1}>
                {profile?.name ?? 'Asisten Lab'}
              </ThemedText>
            </View>
          </View>

          <View style={styles.profileRight}>
            <View
              style={[
                styles.dbBadge,
                isFirestoreConnected ? styles.dbBadgeOnline : styles.dbBadgeLocal,
              ]}>
              <View
                style={[
                  styles.dbDot,
                  isFirestoreConnected ? styles.dbDotOnline : styles.dbDotLocal,
                ]}
              />
              <ThemedText
                type="smallBold"
                style={[
                  styles.dbBadgeText,
                  isFirestoreConnected ? styles.dbTextOnline : styles.dbTextLocal,
                ]}>
                {isFirestoreConnected ? 'Online' : 'Offline'}
              </ThemedText>
            </View>

            <Pressable
              onPress={() => void logout()}
              style={styles.logoutIconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="log-out" size={17} color={MemphisColors.error} />
            </Pressable>
          </View>
        </View>

        {/* 2. Hero Card: "Status Sesi Laboratorium Aktif" */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <ThemedText style={styles.heroSubtitle}>STATUS OPERASIONAL LAB</ThemedText>
            <ThemedText style={styles.heroDateNumber}>
              {openSessions.length > 0 ? String(openSessions.length).padStart(2, '0') : '00'}
            </ThemedText>
            <ThemedText style={styles.heroDateSub}>
              {openSessions.length > 0
                ? `${openSessions.length} Sesi Aktif Sedang Buka`
                : 'Tidak Ada Sesi Terbuka Saat Ini'}
            </ThemedText>
            <ThemedText style={styles.heroCourseTitle} numberOfLines={1}>
              {openSessions.length > 0
                ? openSessions[0].schedule?.title ?? 'Sesi Praktikum Aktif'
                : 'Laboratorium Siap Digunakan'}
            </ThemedText>
            <View style={styles.heroBadgeRow}>
              <View
                style={[
                  styles.heroStatusBadge,
                  openSessions.length > 0
                    ? styles.heroStatusOpen
                    : styles.heroStatusClosed,
                ]}
              >
                <ThemedText
                  style={[
                    styles.heroStatusText,
                    openSessions.length > 0
                      ? styles.heroStatusOpenText
                      : styles.heroStatusClosedText,
                  ]}
                >
                  {openSessions.length > 0 ? 'SESI TERBUKA' : 'STANDBY'}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.heroRight}>
            <View style={styles.heroGraphicCircle}>
              <Ionicons name="hardware-chip-outline" size={42} color="#93C5FD" />
            </View>
          </View>
        </View>

        {/* 3. Overview Card: "Ringkasan Operasional" */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <ThemedText style={styles.overviewTitle}>Ringkasan Laboratorium</ThemedText>
            <View style={styles.dropdownPill}>
              <ThemedText style={styles.dropdownPillText}>Hari Ini ⌄</ThemedText>
            </View>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCol}>
              <ThemedText style={styles.metricLabel}>Total Sesi</ThemedText>
              <View style={styles.metricValueRow}>
                <ThemedText style={styles.metricNumber}>
                  {allSessionsWithDetails.length}
                </ThemedText>
                <ThemedText style={styles.metricUnit}>sesi</ThemedText>
              </View>
              <Feather name="calendar" size={14} color={MemphisColors.teal} />
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricCol}>
              <ThemedText style={styles.metricLabel}>Sesi Buka</ThemedText>
              <View style={styles.metricValueRow}>
                <ThemedText style={styles.metricNumber}>{openSessions.length}</ThemedText>
                <ThemedText style={styles.metricUnit}>aktif</ThemedText>
              </View>
              <Feather name="activity" size={14} color="#10B981" />
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricCol}>
              <ThemedText style={styles.metricLabel}>Ruang Lab</ThemedText>
              <View style={styles.metricValueRow}>
                <ThemedText style={styles.metricNumber}>{labs.length}</ThemedText>
                <ThemedText style={styles.metricUnit}>ruang</ThemedText>
              </View>
              <Feather name="map-pin" size={14} color="#F59E0B" />
            </View>
          </View>
        </View>

        {/* 4. Quick Access Shortcuts */}
        <View style={styles.quickAccessSection}>
          <ThemedText style={styles.quickAccessHeading}>Aksi Cepat Asisten</ThemedText>
          <View style={styles.quickAccessRow}>
            <Pressable
              style={styles.quickActionItem}
              onPress={() => handleOpenCreateSession()}
            >
              <View style={[styles.quickActionCircle, styles.quickActionCircleActive]}>
                <Feather name="plus-circle" size={20} color={MemphisColors.teal} />
              </View>
              <ThemedText style={styles.quickActionLabel}>Buat Sesi</ThemedText>
            </Pressable>

            <Pressable
              style={styles.quickActionItem}
              onPress={handleOpenCreateClass}
            >
              <View style={styles.quickActionCircle}>
                <Feather name="book-open" size={20} color={MemphisColors.slate} />
              </View>
              <ThemedText style={styles.quickActionLabel}>Buat Kelas</ThemedText>
            </Pressable>

            <Pressable
              style={styles.quickActionItem}
              onPress={() => {
                setEditingLab(null);
                setIsLabFormVisible(true);
              }}
            >
              <View style={styles.quickActionCircle}>
                <Feather name="grid" size={20} color={MemphisColors.slate} />
              </View>
              <ThemedText style={styles.quickActionLabel}>Tambah Lab</ThemedText>
            </Pressable>

            <Pressable
              style={styles.quickActionItem}
              onPress={() => router.push('/maps' as any)}
            >
              <View style={styles.quickActionCircle}>
                <Feather name="map-pin" size={20} color={MemphisColors.slate} />
              </View>
              <ThemedText style={styles.quickActionLabel}>Peta Lab</ThemedText>
            </Pressable>
          </View>
        </View>

        {/* Sub-Tab Switcher: Jadwal Sesi vs Data Kelas vs Lokasi Lab (SRS-07) */}
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
                Daftar Jadwal Sesi ({filteredSessions.length})
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
        ) : (
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
                  Belum ada kelas praktikum
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Silakan klik tombol &quot;+ Tambah Kelas&quot; untuk menambahkan kelas praktikum baru.
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
        )}

        {activeSubTab === 'LABS' && (
          /* TAB 3: PENGELOLAAN LOKASI LABORATORIUM (SRS-07) */
          <View style={styles.sessionList}>
            <View style={styles.listHeader}>
              <ThemedText type="subtitle" style={styles.listTitle}>
                Daftar Laboratorium Informatika ({labs.length})
              </ThemedText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  onPress={() => router.push('/maps' as any)}
                  style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" style={{ color: '#0284C7' }}>
                    🗺️ Buka Peta
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={handleOpenCreateLab}
                  style={({ pressed }) => [styles.primaryAddButton, pressed && styles.pressed]}>
                  <ThemedText type="smallBold" style={styles.primaryAddButtonText}>
                    + Tambah Lab
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {labs.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.emptyContainer}>
                <ThemedText style={styles.emptyIcon}>🏢</ThemedText>
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  Belum ada laboratorium
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Silakan klik tombol &quot;+ Tambah Lab&quot; untuk mendaftarkan lokasi dan koordinat laboratorium baru.
                </ThemedText>
              </ThemedView>
            ) : (
              labs.map((lab) => (
                <LabCard
                  key={lab.id}
                  lab={lab}
                  onEdit={handleOpenEditLab}
                  onDelete={deleteLab}
                  onViewOnMap={() => router.push('/maps' as any)}
                />
              ))
            )}
          </View>
        )}
      </View>

      {/* Modal Detail Sesi & Riwayat Status (SRS-08) */}
      <SessionDetailModal
        session={currentModalSession}
        visible={!!currentModalSession}
        selectedAssistantId={selectedAssistantId}
        activeAssistant={activeAssistant}
        isUpdating={
          currentModalSession
            ? updatingSessionIds.includes(currentModalSession.id)
            : false
        }
        statusLogs={currentModalLogs}
        onClose={handleCloseDetail}
        onToggleStatus={handleToggleStatus}
        onEditSession={handleOpenEditSession}
      />

      {/* Modal Form Tambah / Edit Kelas Praktikum (SRS-07) */}
      <ClassFormModal
        visible={isClassFormVisible}
        initialData={editingClass}
        assistants={assistants}
        onClose={() => setIsClassFormVisible(false)}
        onSubmit={handleClassFormSubmit}
      />

      {/* Modal Form Tambah / Edit Jadwal Sesi Praktikum (SRS-07) */}
      <SessionFormModal
        visible={isSessionFormVisible}
        initialSession={editingSession}
        preselectedClass={preselectedClassForSession}
        classes={classes}
        assistants={assistants}
        onClose={() => setIsSessionFormVisible(false)}
        onSubmit={handleSessionFormSubmit}
      />

      {/* Modal Form Tambah / Edit Laboratorium (SRS-07 Sprint 3) */}
      <LabFormModal
        visible={isLabFormVisible}
        initialData={editingLab}
        onClose={() => {
          setIsLabFormVisible(false);
          setEditingLab(null);
        }}
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
  header: {
    gap: 8,
    marginTop: Spacing.two,
  },
  headerBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  topProfileBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 4,
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#0B192C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: MemphisColors.teal,
  },
  greetingCol: {
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 13,
    color: MemphisColors.muted,
    fontWeight: '500',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: MemphisColors.navy,
  },
  profileRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoutIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCard: {
    backgroundColor: MemphisColors.navy,
    borderRadius: 24,
    padding: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    shadowColor: MemphisColors.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 10,
  },
  heroSubtitle: {
    color: '#93C5FD',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroDateNumber: {
    color: '#FFFFFF',
    fontSize: 38,
    fontWeight: '800',
    lineHeight: 44,
  },
  heroDateSub: {
    color: '#E2E8F0',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  heroCourseTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  heroStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  heroStatusOpen: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  heroStatusOpenText: {
    color: '#34D399',
    fontSize: 10,
    fontWeight: '800',
  },
  heroStatusClosed: {
    backgroundColor: 'rgba(148, 163, 184, 0.2)',
  },
  heroStatusClosedText: {
    color: '#CBD5E1',
    fontSize: 10,
    fontWeight: '700',
  },
  heroStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  heroRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGraphicCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overviewCard: {
    backgroundColor: MemphisColors.mintSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 18,
    marginBottom: 20,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  overviewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: MemphisColors.navy,
  },
  dropdownPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  dropdownPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: MemphisColors.teal,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#DBEAFE',
  },
  metricLabel: {
    fontSize: 12,
    color: MemphisColors.muted,
    fontWeight: '500',
    marginBottom: 4,
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginBottom: 4,
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '800',
    color: MemphisColors.navy,
  },
  metricUnit: {
    fontSize: 11,
    color: MemphisColors.muted,
    fontWeight: '600',
  },
  quickAccessSection: {
    marginBottom: 20,
  },
  quickAccessHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: MemphisColors.navy,
    marginBottom: 14,
  },
  quickAccessRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickActionItem: {
    alignItems: 'center',
    width: 72,
  },
  quickActionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: MemphisColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#0B192C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionCircleActive: {
    backgroundColor: MemphisColors.blueActiveCircle,
    borderColor: '#BFDBFE',
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: MemphisColors.slate,
    textAlign: 'center',
  },
  dbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  dbBadgeOnline: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  dbBadgeLocal: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  dbDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dbDotOnline: {
    backgroundColor: '#16A34A',
  },
  dbDotLocal: {
    backgroundColor: '#0284C7',
  },
  dbBadgeText: {
    fontSize: 11,
  },
  dbTextOnline: {
    color: '#15803D',
  },
  dbTextLocal: {
    color: '#0369A1',
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: MemphisColors.navy,
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: MemphisColors.surface,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: MemphisColors.cardBorder,
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  subTabButtonActive: {
    backgroundColor: MemphisColors.navy,
    shadowColor: MemphisColors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  subTabText: {
    color: '#475569',
    fontSize: 13,
  },
  subTabTextActive: {
    color: '#FFFFFF',
  },
  sessionList: {
    gap: Spacing.three,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: Spacing.two,
  },
  listTitle: {
    fontSize: 18,
    flex: 1,
  },
  primaryAddButton: {
    backgroundColor: MemphisColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: MemphisColors.primaryPressed,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  primaryAddButtonText: {
    color: MemphisColors.navy,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  pressed: {
    opacity: 0.75,
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
    fontSize: 40,
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
});
