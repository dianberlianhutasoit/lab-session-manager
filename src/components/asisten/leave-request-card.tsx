import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatAttendanceTime } from './attendance-record-card';
import type { LeaveCategory, LeaveRequest, LeaveStatus } from '@/types';
import { Spacing } from '@/constants/theme';

interface LeaveRequestCardProps {
  request: LeaveRequest;
  isPresentInSession?: boolean;
  isReviewing?: boolean;
  onQuickDecision: (
    requestId: string,
    decision: Exclude<LeaveStatus, 'PENDING'>
  ) => void;
  onOpenReviewModal: (request: LeaveRequest) => void;
}

export function getLeaveCategoryLabel(category: LeaveCategory): string {
  switch (category) {
    case 'SAKIT':
      return '🏥 Sakit';
    case 'DISPENSASI':
      return '🏅 Dispensasi';
    case 'IZIN_AKADEMIK':
      return '🎓 Izin Akademik';
    default:
      return '📌 Keperluan Lain';
  }
}

export function LeaveRequestCard({
  request,
  isPresentInSession = false,
  isReviewing = false,
  onQuickDecision,
  onOpenReviewModal,
}: LeaveRequestCardProps) {
  const {
    userName,
    userEmail,
    category,
    reason,
    attachmentName,
    status,
    submittedAt,
    reviewedByName,
    reviewedAt,
    reviewerNote,
  } = request;

  const isPending = status === 'PENDING';
  const isApproved = status === 'APPROVED';

  const handleConfirmQuickDecision = (decision: Exclude<LeaveStatus, 'PENDING'>) => {
    const actionLabel = decision === 'APPROVED' ? 'MENYETUJUI (APPROVED)' : 'MENOLAK (REJECTED)';
    const message = `Apakah Anda yakin ingin ${actionLabel} pengajuan izin dari "${userName}"?`;

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        onQuickDecision(request.id, decision);
      }
    } else {
      Alert.alert('Konfirmasi Keputusan Izin (SRS-10)', message, [
        { text: 'Batal', style: 'cancel' },
        {
          text: decision === 'APPROVED' ? 'Setujui (APPROVED)' : 'Tolak (REJECTED)',
          style: decision === 'REJECTED' ? 'destructive' : 'default',
          onPress: () => onQuickDecision(request.id, decision),
        },
      ]);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      {/* Top Row: Category Badge & Decision Status Badge */}
      <View style={styles.topRow}>
        <View style={styles.categoryBadge}>
          <ThemedText type="smallBold" style={styles.categoryText}>
            {getLeaveCategoryLabel(category)}
          </ThemedText>
        </View>

        <View
          style={[
            styles.statusBadge,
            isPending
              ? styles.statusPending
              : isApproved
                ? styles.statusApproved
                : styles.statusRejected,
          ]}>
          <ThemedText
            type="smallBold"
            style={[
              styles.statusBadgeText,
              isPending
                ? styles.textPending
                : isApproved
                  ? styles.textApproved
                  : styles.textRejected,
            ]}>
            {isPending
              ? '⏳ MENUNGGU (PENDING)'
              : isApproved
                ? '✅ DISETUJUI (APPROVED)'
                : '❌ DITOLAK (REJECTED)'}
          </ThemedText>
        </View>
      </View>

      {/* Practitioner Identity */}
      <View style={styles.studentRow}>
        <View style={styles.avatar}>
          <ThemedText type="smallBold" style={styles.avatarText}>
            {userName.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.studentInfo}>
          <ThemedText type="subtitle" style={styles.studentName}>
            {userName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {userEmail}
          </ThemedText>
        </View>
      </View>

      {isPresentInSession ? (
        <View style={styles.presentOverrideBanner}>
          <ThemedText type="smallBold" style={styles.presentOverrideText}>
            🟢 Praktikan ini tercatat sudah melakukan presensi kehadiran pada sesi ini (Status Hadir diutamakan).
          </ThemedText>
        </View>
      ) : null}

      {/* Reason & Attachment Box */}
      <View style={styles.reasonBox}>
        <ThemedText type="smallBold" style={styles.reasonLabel}>
          Alasan Pengajuan Izin:
        </ThemedText>
        <ThemedText type="small" style={styles.reasonText}>
          &ldquo;{reason}&rdquo;
        </ThemedText>

        <View style={styles.metaRow}>
          <ThemedText type="small" themeColor="textSecondary">
            🕒 Diajukan: {formatAttendanceTime(submittedAt)}
          </ThemedText>
          {attachmentName ? (
            <View style={styles.attachmentPill}>
              <ThemedText type="smallBold" style={styles.attachmentText}>
                📎 {attachmentName}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>

      {/* Review Result Metadata (if already reviewed) */}
      {!isPending && reviewedByName ? (
        <View style={styles.reviewInfoBox}>
          <ThemedText type="smallBold" style={styles.reviewInfoTitle}>
            Keputusan oleh {reviewedByName}{' '}
            {reviewedAt ? `(${formatAttendanceTime(reviewedAt)})` : ''}
          </ThemedText>
          {reviewerNote ? (
            <ThemedText type="small" themeColor="textSecondary">
              💬 Catatan Asisten: {reviewerNote}
            </ThemedText>
          ) : null}
        </View>
      ) : null}

      {/* Action Buttons (SRS-10) */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={() => onOpenReviewModal(request)}
          style={({ pressed }) => [styles.detailButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" style={styles.detailButtonText}>
            {isPending ? '🔍 Tinjau & Catatan' : '🔄 Tinjau Ulang'}
          </ThemedText>
        </Pressable>

        {isPending ? (
          <>
            <Pressable
              disabled={isReviewing}
              onPress={() => handleConfirmQuickDecision('REJECTED')}
              style={({ pressed }) => [
                styles.rejectButton,
                isReviewing && styles.disabledButton,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.rejectButtonText}>
                ✕ Tolak
              </ThemedText>
            </Pressable>

            <Pressable
              disabled={isReviewing}
              onPress={() => handleConfirmQuickDecision('APPROVED')}
              style={({ pressed }) => [
                styles.approveButton,
                isReviewing && styles.disabledButton,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" style={styles.approveButtonText}>
                ✓ Setujui
              </ThemedText>
            </Pressable>
          </>
        ) : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    color: '#0369A1',
    fontSize: 11,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  statusApproved: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  statusRejected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  statusBadgeText: {
    fontSize: 11,
  },
  textPending: {
    color: '#B45309',
  },
  textApproved: {
    color: '#15803D',
  },
  textRejected: {
    color: '#B91C1C',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  studentInfo: {
    flex: 1,
    gap: 2,
  },
  studentName: {
    fontSize: 16,
  },
  presentOverrideBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    borderRadius: 10,
  },
  presentOverrideText: {
    color: '#15803D',
    fontSize: 11,
  },
  reasonBox: {
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderRadius: 12,
    padding: Spacing.three,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.18)',
  },
  reasonLabel: {
    fontSize: 11,
    color: '#475569',
  },
  reasonText: {
    lineHeight: 20,
    fontStyle: 'italic',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  attachmentPill: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  attachmentText: {
    color: '#4F46E5',
    fontSize: 11,
  },
  reviewInfoBox: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.3)',
    paddingTop: 8,
    gap: 3,
  },
  reviewInfoTitle: {
    fontSize: 11,
    color: '#334155',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 4,
  },
  detailButton: {
    flex: 1.2,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  detailButtonText: {
    color: '#334155',
    fontSize: 12,
  },
  rejectButton: {
    flex: 0.9,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  rejectButtonText: {
    color: '#DC2626',
    fontSize: 12,
  },
  approveButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.75,
  },
});

