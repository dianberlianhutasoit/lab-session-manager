import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { LaboraColors, Spacing } from '@/constants/theme';
import { evaluateLeaveActionState } from '@/features/asprak/asprak-dashboard-helpers';
import type { FineDoc, LeaveRequest, LeaveStatus } from '@/types';
import { formatAttendanceTime } from './attendance-record-card';
import { getLeaveCategoryLabel } from './leave-request-card';

interface LeaveReviewModalProps {
  visible: boolean;
  request: LeaveRequest | null;
  sessionTitle?: string;
  courseCode?: string;
  studentNim?: string;
  relatedFine?: FineDoc | null;
  isAuthorized?: boolean;
  isOnline?: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmitDecision: (
    requestId: string,
    decision: Exclude<LeaveStatus, 'PENDING'>,
    reviewerNote?: string
  ) => void | Promise<void>;
}

export function LeaveReviewModal(props: LeaveReviewModalProps) {
  const { visible, request, onClose } = props;
  if (!request) return null;

  const modalKey = `${visible ? 'open' : 'closed'}-${request.id}-${request.status}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <LeaveReviewContent key={modalKey} {...props} request={request} />
      </View>
    </Modal>
  );
}

function LeaveReviewContent({
  request,
  sessionTitle,
  courseCode,
  studentNim,
  relatedFine = null,
  isAuthorized = true,
  isOnline = true,
  isSubmitting = false,
  onClose,
  onSubmitDecision,
}: LeaveReviewModalProps & { request: LeaveRequest }) {
  const [reviewerNote, setReviewerNote] = useState(request.reviewerNote ?? '');

  const actionState = evaluateLeaveActionState({
    request,
    relatedFine,
    isAuthorized,
    isOnline,
    isSubmitting,
  });

  const handleDecision = async (decision: Exclude<LeaveStatus, 'PENDING'>) => {
    if (!actionState.canAct) return;
    await onSubmitDecision(request.id, decision, reviewerNote);
    onClose();
  };

  const handlePreviewDocument = () => {
    if (!request.attachmentName) return;
    Alert.alert(
      'Lampiran Pengajuan Izin',
      `Berkas terlampir: ${request.attachmentName}`,
      [{ text: 'Tutup' }]
    );
  };

  const initials = request.userName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'PR';

  const statusBadgeStyle =
    request.status === 'APPROVED'
      ? { bg: '#DCFCE7', dot: '#16A34A', text: '#15803D', label: 'APPROVED' }
      : request.status === 'REJECTED'
        ? { bg: '#FEE2E2', dot: '#DC2626', text: '#B91C1C', label: 'REJECTED' }
        : { bg: '#FEF3C7', dot: '#D97706', text: '#B45309', label: 'PENDING' };

  return (
    <View style={styles.modalContent}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={onClose} style={styles.backButton}>
          <Feather name="arrow-left" size={18} color={LaboraColors.primary} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <ThemedText style={styles.headerBrand}>LABORA</ThemedText>
          <ThemedText style={styles.headerTitle}>Review Izin Praktikum</ThemedText>
        </View>
        <View style={styles.avatarCircle}>
          <ThemedText style={styles.avatarInitial}>A</ThemedText>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {/* Kebijakan Verifikasi & Dampak Denda */}
        <View style={styles.policyBanner}>
          <View style={styles.policyIconCircle}>
            <Feather name="shield" size={16} color={LaboraColors.primary} />
          </View>
          <View style={styles.policyTextCol}>
            <ThemedText style={styles.policyHeading}>Keputusan Izin & Dampak Kehadiran</ThemedText>
            <ThemedText style={styles.policyText}>
              Menyetujui izin (APPROVED) mencatat kehadiran sebagai EXCUSED dan membebaskan denda unpaid menjadi waived.
            </ThemedText>
          </View>
        </View>

        {/* Action Guard Warning (jika sudah diproses / offline / tidak berwenang) */}
        {!actionState.canAct && actionState.blockReason ? (
          <View
            style={{
              backgroundColor: '#FEF2F2',
              borderWidth: 1,
              borderColor: '#FECACA',
              borderRadius: 12,
              padding: 12,
            }}>
            <ThemedText style={{ fontSize: 12, fontWeight: '700', color: '#B91C1C' }}>
              {actionState.blockReason}
            </ThemedText>
          </View>
        ) : null}

        {/* Student Leave Request Card */}
        <View style={styles.studentCard}>
          {/* Top row: Avatar, Name, NIM, Status Pill */}
          <View style={styles.studentTopRow}>
            <View style={styles.studentAvatar}>
              <ThemedText style={styles.studentAvatarText}>{initials}</ThemedText>
            </View>
            <View style={styles.studentInfoCol}>
              <ThemedText style={styles.studentName}>{request.userName}</ThemedText>
              <ThemedText style={styles.studentNim}>
                {studentNim ? `NIM: ${studentNim}` : request.userEmail}
              </ThemedText>
            </View>
            <View style={[styles.pendingPill, { backgroundColor: statusBadgeStyle.bg }]}>
              <View style={[styles.pendingDot, { backgroundColor: statusBadgeStyle.dot }]} />
              <ThemedText style={[styles.pendingPillText, { color: statusBadgeStyle.text }]}>
                {statusBadgeStyle.label}
              </ThemedText>
            </View>
          </View>

          {/* Subject & Time info */}
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Feather name="book-open" size={13} color={LaboraColors.primary} />
              <ThemedText style={styles.metaText}>
                {courseCode ? `${courseCode} • ` : ''}
                {sessionTitle ?? `Sesi ${request.sessionId}`}
              </ThemedText>
            </View>
            <View style={styles.metaRow}>
              <Feather name="clock" size={13} color={LaboraColors.primary} />
              <ThemedText style={styles.metaText}>
                Diajukan: {formatAttendanceTime(request.submittedAt)}
              </ThemedText>
            </View>
          </View>

          {/* Reason Section */}
          <View style={styles.reasonSection}>
            <ThemedText style={styles.reasonLabel}>ALASAN PENGAJUAN</ThemedText>
            <ThemedText style={styles.reasonText}>
              &ldquo;{request.reason}&rdquo;
            </ThemedText>
          </View>

          {/* Fine Impact Notice */}
          {actionState.fineNoticeMessage ? (
            <View
              style={[
                styles.aiSuggestionBox,
                actionState.fineNoticeType === 'warning' && {
                  backgroundColor: '#FFFBEB',
                  borderColor: '#FDE68A',
                },
              ]}>
              <View style={styles.aiIconCircle}>
                <Feather
                  name={actionState.fineNoticeType === 'warning' ? 'alert-triangle' : 'info'}
                  size={15}
                  color={actionState.fineNoticeType === 'warning' ? '#D97706' : LaboraColors.primary}
                />
              </View>
              <View style={styles.aiTextCol}>
                <ThemedText style={styles.aiTitle}>
                  Status Denda Sesi Ini ({relatedFine?.status ?? '-'})
                </ThemedText>
                <ThemedText style={styles.aiSubtitle}>
                  {actionState.fineNoticeMessage}
                </ThemedText>
              </View>
            </View>
          ) : null}

          {/* AI Suggestion Box */}
          <View style={styles.aiSuggestionBox}>
            <View style={styles.aiIconCircle}>
              <Feather name="cpu" size={15} color={LaboraColors.primary} />
            </View>
            <View style={styles.aiTextCol}>
              <ThemedText style={styles.aiTitle}>
                Kategori: {getLeaveCategoryLabel(request.category)}
              </ThemedText>
              <ThemedText style={styles.aiSubtitle}>
                {request.aiAnalysis ?? (request.sentiment ? `Sentimen: ${request.sentiment}` : 'Klasifikasi teks lokal')}
              </ThemedText>
            </View>
          </View>

          {/* Attachment Box */}
          <View style={styles.attachmentBox}>
            <View style={styles.attachmentLeft}>
              <View style={styles.attachmentIconCircle}>
                <Feather name="file-text" size={18} color={LaboraColors.primary} />
              </View>
              <View style={styles.attachmentMetaCol}>
                <ThemedText style={styles.attachmentFileName} numberOfLines={1}>
                  {request.attachmentName ?? 'Tidak ada berkas lampiran'}
                </ThemedText>
                <ThemedText style={styles.attachmentFileSize}>
                  {request.attachmentName ? 'Lampiran pendukung izin' : 'Pengajuan tanpa lampiran'}
                </ThemedText>
              </View>
            </View>

            {request.attachmentName ? (
              <Pressable style={styles.previewBtn} onPress={handlePreviewDocument}>
                <ThemedText style={styles.previewBtnText}>Lihat</ThemedText>
              </Pressable>
            ) : null}
          </View>

          {/* Reviewer Note Input */}
          <View style={styles.noteField}>
            <ThemedText style={styles.noteLabel}>Catatan Reviewer (Opsional)</ThemedText>
            <TextInput
              editable={actionState.canAct}
              style={styles.noteInput}
              placeholder="Tambahkan catatan Asprak jika diperlukan..."
              placeholderTextColor={LaboraColors.textMuted}
              value={reviewerNote}
              onChangeText={setReviewerNote}
            />
          </View>
        </View>
      </ScrollView>

      {/* Decision Footer Buttons */}
      <View style={styles.footer}>
        <Pressable
          disabled={!actionState.canAct}
          onPress={() => handleDecision('REJECTED')}
          style={[styles.rejectBtn, !actionState.canAct && styles.disabledBtn]}>
          <Feather name="x" size={16} color="#DC2626" style={{ marginRight: 6 }} />
          <ThemedText style={styles.rejectBtnText}>Tolak (REJECTED)</ThemedText>
        </Pressable>

        <Pressable
          disabled={!actionState.canAct}
          onPress={() => handleDecision('APPROVED')}
          style={[styles.approveBtn, !actionState.canAct && styles.disabledBtn]}>
          <Feather name="check" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <ThemedText style={styles.approveBtnText}>Setujui (APPROVED)</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalContent: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '92%',
    backgroundColor: LaboraColors.background,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: LaboraColors.cardBorder,
    backgroundColor: LaboraColors.background,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LaboraColors.card,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
  },
  headerBrand: {
    fontSize: 10,
    fontWeight: '800',
    color: LaboraColors.primary,
    letterSpacing: 0.6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LaboraColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  body: {
    flexGrow: 1,
  },
  bodyContent: {
    padding: Spacing.four,
    gap: 14,
  },

  /* Policy Banner */
  policyBanner: {
    flexDirection: 'row',
    backgroundColor: LaboraColors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 12,
  },
  policyIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: LaboraColors.blush,
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyTextCol: {
    flex: 1,
    gap: 3,
  },
  policyHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: LaboraColors.primary,
  },
  policyText: {
    fontSize: 11,
    color: LaboraColors.textSecondary,
    lineHeight: 15,
  },

  /* Student Card */
  studentCard: {
    backgroundColor: LaboraColors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 12,
  },
  studentTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LaboraColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: LaboraColors.primary,
  },
  studentInfoCol: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
  studentNim: {
    fontSize: 11,
    color: LaboraColors.textMuted,
  },
  pendingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE7EC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 4,
  },
  pendingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: LaboraColors.primary,
  },
  pendingPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: LaboraColors.primary,
  },

  /* Meta Box */
  metaBox: {
    backgroundColor: LaboraColors.surfaceAlt,
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 11,
    color: LaboraColors.textSecondary,
    fontWeight: '600',
  },

  /* Reason */
  reasonSection: {
    gap: 4,
  },
  reasonLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: LaboraColors.textMuted,
    letterSpacing: 0.6,
  },
  reasonText: {
    fontSize: 13,
    fontStyle: 'italic',
    color: LaboraColors.textPrimary,
    lineHeight: 18,
  },

  /* AI Suggestion */
  aiSuggestionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LaboraColors.surfaceAlt,
    borderRadius: 12,
    padding: 10,
    gap: 10,
  },
  aiIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: LaboraColors.blush,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTextCol: {
    flex: 1,
    gap: 2,
  },
  aiTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  aiSubtitle: {
    fontSize: 10,
    color: '#047857',
    fontWeight: '600',
  },

  /* Attachment */
  attachmentBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: LaboraColors.card,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  attachmentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  attachmentIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: LaboraColors.blush,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentMetaCol: {
    flex: 1,
    gap: 2,
  },
  attachmentFileName: {
    fontSize: 12,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  attachmentFileSize: {
    fontSize: 10,
    color: LaboraColors.textMuted,
  },
  previewBtn: {
    backgroundColor: LaboraColors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  previewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },

  /* Note Field */
  noteField: {
    gap: 6,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: LaboraColors.textMuted,
  },
  noteInput: {
    backgroundColor: LaboraColors.surfaceAlt,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: LaboraColors.textPrimary,
  },

  /* Footer */
  footer: {
    flexDirection: 'row',
    padding: Spacing.four,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: LaboraColors.cardBorder,
    backgroundColor: LaboraColors.card,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 12,
  },
  rejectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LaboraColors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disabledBtn: {
    opacity: 0.6,
  },
});
