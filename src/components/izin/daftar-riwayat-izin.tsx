import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSessionContext } from '@/context/session-context';
import type { Permission, PermissionCategory, PermissionStatus } from '@/types';

interface DaftarRiwayatIzinProps {
  permissionsList?: Permission[];
}

export function formatTimeWIB(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const day = d.getDate().toString().padStart(2, '0');
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'Mei',
      'Jun',
      'Jul',
      'Agu',
      'Sep',
      'Okt',
      'Nov',
      'Des',
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day} ${month} ${year}, ${hours}:${mins} WIB`;
  } catch {
    return isoDate;
  }
}

export function StatusBadge({ status }: { status: PermissionStatus }) {
  const isApproved = status === 'APPROVED';
  const isRejected = status === 'REJECTED';

  const badgeStyle = isApproved
    ? styles.badgeApproved
    : isRejected
      ? styles.badgeRejected
      : styles.badgePending;

  const textStyle = isApproved
    ? styles.badgeTextApproved
    : isRejected
      ? styles.badgeTextRejected
      : styles.badgeTextPending;

  const label = isApproved ? 'DISETUJUI' : isRejected ? 'DITOLAK' : 'MENUNGGU TINJAUAN';

  return (
    <View style={[styles.badgeBase, badgeStyle]}>
      <ThemedText type="smallBold" style={[styles.badgeTextBase, textStyle]}>
        {label}
      </ThemedText>
    </View>
  );
}

export function CategoryBadge({ category }: { category: PermissionCategory }) {
  const getCategoryTheme = () => {
    switch (category) {
      case 'SAKIT':
        return { bg: '#FEF3C7', border: '#FDE68A', text: '#B45309', label: '🏥 Sakit' };
      case 'AKADEMIK':
        return { bg: '#E0F2FE', border: '#BAE6FD', text: '#0369A1', label: '🎓 Akademik' };
      case 'DARURAT':
        return { bg: '#FEE2E2', border: '#FECACA', text: '#B91C1C', label: '🚨 Darurat' };
      case 'LAINNYA':
        return { bg: '#F3E8FF', border: '#E9D5FF', text: '#6B21A8', label: '📌 Lainnya' };
      default:
        return { bg: '#F1F5F9', border: '#CBD5E1', text: '#475569', label: '⚪ Unclassified' };
    }
  };

  const theme = getCategoryTheme();

  return (
    <View style={[styles.catBadge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      <ThemedText type="smallBold" style={[styles.catText, { color: theme.text }]}>
        {theme.label}
      </ThemedText>
    </View>
  );
}

export function DaftarRiwayatIzin({ permissionsList }: DaftarRiwayatIzinProps) {
  const { permissions, schedules, sessions, currentStudentId } = useSessionContext();

  const data = permissionsList ?? permissions.filter((p) => p.userId === currentStudentId);

  if (data.length === 0) {
    return (
      <ThemedView type="backgroundElement" style={styles.emptyContainer}>
        <ThemedText style={styles.emptyIcon}>📂</ThemedText>
        <ThemedText type="subtitle" style={styles.emptyTitle}>
          Belum Ada Riwayat Izin
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.emptySubtitle}>
          Anda belum pernah mengajukan izin praktikum. Gunakan formulir di atas untuk mengajukan izin baru.
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <View style={styles.listContainer}>
      <ThemedText type="subtitle" style={styles.sectionHeader}>
        Riwayat Pengajuan Izin ({data.length})
      </ThemedText>

      {data.map((item) => {
        const session = sessions.find((s) => s.id === item.sessionId);
        const schedule = session ? schedules.find((sch) => sch.id === session.scheduleId) : undefined;

        return (
          <ThemedView key={item.id} type="backgroundElement" style={styles.card}>
            {/* Header: Course & Status */}
            <View style={styles.cardHeader}>
              <View style={styles.courseCol}>
                <ThemedText type="smallBold" style={styles.courseCode}>
                  {schedule?.courseCode ?? 'LAB'}
                </ThemedText>
                <ThemedText type="smallBold" style={styles.courseTitle} numberOfLines={1}>
                  {schedule?.title ?? 'Sesi Praktikum'}
                </ThemedText>
              </View>
              <StatusBadge status={item.status} />
            </View>

            {/* Schedule Meta */}
            {schedule && (
              <View style={styles.metaRow}>
                <ThemedText type="small" themeColor="textSecondary">
                  📅 {schedule.date} ({schedule.startTime} - {schedule.endTime}) • 📍 {schedule.room}
                </ThemedText>
              </View>
            )}

            {/* Reason Text */}
            <View style={styles.reasonBox}>
              <ThemedText type="small" style={styles.reasonLabel}>
                Alasan Ketidakhadiran:
              </ThemedText>
              <ThemedText type="small" style={styles.reasonText}>
                {item.reason}
              </ThemedText>
            </View>

            {/* AI Classification Info (SRS-12 & SRS-13) */}
            <View style={styles.aiBox}>
              <View style={styles.aiHeader}>
                <ThemedText type="smallBold" style={styles.aiLabel}>
                  🤖 Prediksi Kategori AI:
                </ThemedText>
                <CategoryBadge category={item.category} />
              </View>
              {item.aiAnalysis ? (
                <ThemedText type="small" style={styles.aiAnalysisText}>
                  {item.aiAnalysis}
                </ThemedText>
              ) : null}
            </View>

            {/* Footer: Timestamp */}
            <View style={styles.cardFooter}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.dateText}>
                Diajukan pada: {formatTimeWIB(item.createdAt)}
              </ThemedText>
            </View>
          </ThemedView>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    gap: Spacing.three,
  },
  sectionHeader: {
    fontSize: 18,
    lineHeight: 24,
  },
  card: {
    borderRadius: 14,
    padding: Spacing.four,
    gap: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  courseCol: {
    flex: 1,
    gap: 2,
  },
  courseCode: {
    fontSize: 11,
    color: '#0284C7',
  },
  courseTitle: {
    fontSize: 15,
  },
  metaRow: {
    paddingVertical: 2,
  },
  badgeBase: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  badgeTextBase: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
  badgePending: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  badgeTextPending: {
    color: '#B45309',
  },
  badgeApproved: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  badgeTextApproved: {
    color: '#15803D',
  },
  badgeRejected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  badgeTextRejected: {
    color: '#B91C1C',
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  catText: {
    fontSize: 11,
  },
  reasonBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    padding: Spacing.three,
    borderRadius: 10,
    gap: 2,
  },
  reasonLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 13,
    lineHeight: 18,
  },
  aiBox: {
    backgroundColor: '#F0FDF4',
    padding: Spacing.three,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 4,
  },
  aiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiLabel: {
    fontSize: 12,
    color: '#15803D',
  },
  aiAnalysisText: {
    fontSize: 12,
    color: '#166534',
  },
  cardFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingTop: 6,
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
  },
  emptyContainer: {
    padding: Spacing.five,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptySubtitle: {
    textAlign: 'center',
    maxWidth: 320,
    fontSize: 13,
  },
});

