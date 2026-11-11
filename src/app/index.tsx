import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  Pressable,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SessionCard } from '@/components/asisten/session-card';
import {
  ClassCard,
  LabClassWithDetails,
} from '@/components/asisten/class-card';
import { ClassFormModal } from '@/components/asisten/class-form-modal';
import { SessionFormModal } from '@/components/asisten/session-form-modal';
import {
  SessionFilterHeader,
  StatusFilter,
} from '@/components/asisten/session-filter-header';
import { SessionDetailModal } from '@/components/asisten/session-detail-modal';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  useSessionContext,
  SessionWithDetails,
} from '@/context/session-context';
import type {
  LabClass,
  LabClassFormInput,
  SessionScheduleFormInput,
} from '@/types';

type ManagementSubTab = 'SESSIONS' | 'CLASSES';

export default function HomeScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const {
    classes,
    users,
    isFirestoreConnected,
    createClass,
    updateClass,
    deleteClass,
    createSessionSchedule,
    updateSessionSchedule,
    deleteSessionSchedule,
    toggleSessionStatus,
    getClassesWithDetails,
    getSessionsWithDetails,
  } = useSessionContext();

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

  const assistants = useMemo(
    () => users.filter((u) => u.role === 'asisten'),
    [users]
  );

  const allClassesWithDetails = getClassesWithDetails();
  const allSessionsWithDetails = getSessionsWithDetails();

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

  const handleOpenDetail = (session: SessionWithDetails) => {
    setActiveModalSession(session);
  };

  const handleCloseDetail = () => {
    setActiveModalSession(null);
  };

  const handleToggleStatus = (sessionId: string) => {
    toggleSessionStatus(sessionId);
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
          <View style={styles.headerBadgeRow}>
            <View style={styles.badgeRole}>
              <ThemedText type="smallBold" style={styles.badgeRoleText}>
                PANEL ASISTEN LABORATORIUM
              </ThemedText>
            </View>

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
                {isFirestoreConnected ? 'Firestore Aktif' : 'Firestore Siap'}
              </ThemedText>
            </View>
          </View>

          <ThemedText type="title" style={styles.title}>
            Manajemen Praktikum & Jadwal
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            SRS-07: Kelola data kelas praktikum (classes) serta jadwal sesi pertemuan (sessions), dan pantau status sesi secara real-time.
          </ThemedText>
        </View>

        {/* Sub-Tab Switcher: Jadwal Sesi vs Data Kelas (SRS-07) */}
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
        </View>

        {/* Filter & Overview Component */}
        <SessionFilterHeader
          assistants={assistants}
          selectedAssistantId={selectedAssistantId}
          onSelectAssistant={setSelectedAssistantId}
          statusFilter={statusFilter}
          onSelectStatusFilter={setStatusFilter}
          counts={counts}
        />

        {activeSubTab === 'SESSIONS' ? (
          /* TAB 1: JADWAL SESI PRAKTIKUM */
          <View style={styles.sessionList}>
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

            {filteredSessions.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.emptyContainer}>
                <ThemedText style={styles.emptyIcon}>📂</ThemedText>
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  Tidak ada sesi praktikum
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Belum ada data jadwal sesi yang cocok dengan filter, atau tambahkan sesi baru.
                </ThemedText>
              </ThemedView>
            ) : (
              filteredSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
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
      </View>

      {/* Modal Detail Sesi Praktikum */}
      <SessionDetailModal
        session={currentModalSession}
        visible={!!currentModalSession}
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
    fontSize: 26,
    lineHeight: 32,
  },
  subTabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subTabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  subTabButtonActive: {
    backgroundColor: '#0284C7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
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
    backgroundColor: '#0284C7',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  primaryAddButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
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
