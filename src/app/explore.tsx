import React, { useState, useMemo } from 'react';
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
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSessionContext } from '@/context/session-context';

type ViewTab = 'PRESENT' | 'ABSENT';

export default function AttendanceRecapScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const {
    sessions,
    schedules,
    users,
    getSessionAttendanceRecords,
    getPractitioners,
  } = useSessionContext();

  // Pilih sesi default (jika ada sesi dengan attendance, utamakan)
  const [selectedSessionId, setSelectedSessionId] = useState<string>(() => {
    return sessions.length > 0 ? sessions[0].id : '';
  });

  const [activeTab, setActiveTab] = useState<ViewTab>('PRESENT');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Info sesi terpilih
  const selectedSession = useMemo(() => {
    return sessions.find((s) => s.id === selectedSessionId);
  }, [sessions, selectedSessionId]);

  const selectedSchedule = useMemo(() => {
    if (!selectedSession) return undefined;
    return schedules.find((sch) => sch.id === selectedSession.scheduleId);
  }, [schedules, selectedSession]);

  const selectedAssistant = useMemo(() => {
    if (!selectedSession) return undefined;
    return users.find((u) => u.id === selectedSession.assistantId);
  }, [users, selectedSession]);

  // Daftar data presensi praktikan pada sesi terpilih (SRS-08)
  const attendanceRecords = useMemo(() => {
    if (!selectedSessionId) return [];
    return getSessionAttendanceRecords(selectedSessionId);
  }, [selectedSessionId, getSessionAttendanceRecords]);

  // Daftar seluruh praktikan terdaftar
  const allPractitioners = useMemo(() => {
    return getPractitioners();
  }, [getPractitioners]);

  // Daftar praktikan yang belum presensi pada sesi terpilih
  const absentPractitioners = useMemo(() => {
    const presentUserIds = new Set(attendanceRecords.map((a) => a.userId));
    return allPractitioners.filter((p) => !presentUserIds.has(p.id));
  }, [allPractitioners, attendanceRecords]);

  // Filter berdasarkan teks pencarian
  const filteredPresent = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return attendanceRecords;
    return attendanceRecords.filter(
      (a) =>
        a.userName.toLowerCase().includes(query) ||
        a.userEmail.toLowerCase().includes(query)
    );
  }, [attendanceRecords, searchQuery]);

  const filteredAbsent = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return absentPractitioners;
    return absentPractitioners.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query)
    );
  }, [absentPractitioners, searchQuery]);

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
          <View style={styles.badgeRole}>
            <ThemedText type="smallBold" style={styles.badgeRoleText}>
              PANEL ASISTEN LABORATORIUM
            </ThemedText>
          </View>
          <ThemedText type="title" style={styles.title}>
            Rekap Presensi Praktikan
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            SRS-08: Pantau data kehadiran, waktu presensi, dan daftar praktikan pada setiap sesi praktikum.
          </ThemedText>
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
              const isSelected = sess.id === selectedSessionId;

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

        {/* Summary Metrics Cards (SRS-08) */}
        {selectedSession && (
          <AttendanceSummaryCards
            presentCount={attendanceRecords.length}
            totalStudents={allPractitioners.length}
            sessionStatus={selectedSession.status}
          />
        )}

        {/* Search Bar & Tab Filter */}
        <View style={styles.listSection}>
          <View style={styles.searchContainer}>
            <ThemedText style={styles.searchIcon}>🔍</ThemedText>
            <TextInput
              style={[
                styles.searchInput,
                { color: theme.text, backgroundColor: 'transparent' },
              ]}
              placeholder="Cari nama atau email praktikan..."
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
            ) : filteredAbsent.length === 0 ? (
              <ThemedView type="backgroundElement" style={styles.emptyContainer}>
                <ThemedText style={styles.emptyIcon}>🎉</ThemedText>
                <ThemedText type="subtitle" style={styles.emptyTitle}>
                  Semua praktikan telah hadir
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  Seluruh praktikan terdaftar sudah tercatat presensi untuk sesi ini.
                </ThemedText>
              </ThemedView>
            ) : (
              filteredAbsent.map((student, index) => (
                <AbsentPractitionerCard key={student.id} user={student} index={index} />
              ))
            )}
          </View>
        </View>
      </View>
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
  title: {
    fontSize: 26,
    lineHeight: 32,
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
    maxWidth: 160,
  },
  sessionPillTextActive: {
    color: '#FFFFFF',
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
    alignItems: 'center',
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
    fontSize: 12,
  },
  tabItemTextActive: {
    color: '#0F172A',
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
