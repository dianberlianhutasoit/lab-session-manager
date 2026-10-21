import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { SessionCard } from '@/components/asisten/session-card';
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

export default function HomeScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const theme = useTheme();

  const {
    users,
    toggleSessionStatus,
    getSessionsWithDetails,
  } = useSessionContext();

  const [selectedAssistantId, setSelectedAssistantId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [activeModalSession, setActiveModalSession] = useState<SessionWithDetails | null>(
    null
  );

  const assistants = useMemo(
    () => users.filter((u) => u.role === 'asisten'),
    [users]
  );

  const allSessionsWithDetails = getSessionsWithDetails();

  // Hitung jumlah statistik sesi (SRS-07)
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

  // Filter daftar sesi berdasarkan asisten dan status (SRS-05, SRS-07)
  const filteredSessions = useMemo(() => {
    return allSessionsWithDetails.filter((s) => {
      const matchAssistant =
        selectedAssistantId === 'ALL' || s.assistantId === selectedAssistantId;
      const matchStatus =
        statusFilter === 'ALL' || s.status === statusFilter;
      return matchAssistant && matchStatus;
    });
  }, [allSessionsWithDetails, selectedAssistantId, statusFilter]);

  // Sync active modal session jika statusnya berubah saat modal terbuka
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
            Manajemen Sesi Praktikum
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            SRS-05 s/d SRS-07: Lihat jadwal detail, buka/tutup sesi, dan pantau status kehadiran secara real-time.
          </ThemedText>
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

        {/* Sessions List */}
        <View style={styles.sessionList}>
          <View style={styles.listHeader}>
            <ThemedText type="subtitle" style={styles.listTitle}>
              Daftar Sesi ({filteredSessions.length})
            </ThemedText>
          </View>

          {filteredSessions.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.emptyContainer}>
              <ThemedText style={styles.emptyIcon}>📂</ThemedText>
              <ThemedText type="subtitle" style={styles.emptyTitle}>
                Tidak ada sesi praktikum
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                Tidak ada data sesi praktikum yang cocok dengan filter yang dipilih.
              </ThemedText>
            </ThemedView>
          ) : (
            filteredSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onOpenDetail={handleOpenDetail}
                onToggleStatus={handleToggleStatus}
              />
            ))
          )}
        </View>
      </View>

      {/* Modal Detail Sesi Praktikum (SRS-05, SRS-06, SRS-07) */}
      <SessionDetailModal
        session={currentModalSession}
        visible={!!currentModalSession}
        onClose={handleCloseDetail}
        onToggleStatus={handleToggleStatus}
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
  sessionList: {
    gap: Spacing.three,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listTitle: {
    fontSize: 18,
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
