import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { getLeaveCategoryLabel } from './leave-request-card';
import { formatAttendanceTime } from './attendance-record-card';
import type { LeaveRequest, LeaveStatus } from '@/types';
import { Spacing, LaboraColors } from '@/constants/theme';

interface LeaveReviewModalProps {
  visible: boolean;
  request: LeaveRequest | null;
  sessionTitle?: string;
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
  isSubmitting = false,
  onClose,
  onSubmitDecision,
}: LeaveReviewModalProps & { request: LeaveRequest }) {
  const [reviewerNote, setReviewerNote] = useState(request.reviewerNote ?? '');

  const handleDecision = async (decision: Exclude<LeaveStatus, 'PENDING'>) => {
    await onSubmitDecision(request.id, decision, reviewerNote);
    onClose();
  };

  const handlePreviewDocument = () => {
    Alert.alert(
      'Pratinjau Dokumen',
      `Membuka berkas: ${request.attachmentName ?? 'Surat_Keterangan_Sakit.pdf'}\nStatus: Dokumen Valid Terverifikasi.`,
      [{ text: 'Tutup' }]
    );
  };

  const initials = request.userName
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'MR';

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
        {/* Banner: Kebijakan Verifikasi Otomatis (Screen 3 Stitch) */}
        <View style={styles.policyBanner}>
          <View style={styles.policyIconCircle}>
            <Feather name="star" size={16} color={LaboraColors.primary} />
          </View>
          <View style={styles.policyTextCol}>
            <ThemedText style={styles.policyHeading}>Kebijakan Verifikasi Otomatis</ThemedText>
            <ThemedText style={styles.policyText}>
              Tinjau bukti dan surat keterangan dokter. AI Suggestion hanya sebagai rekomendasi klasifikasi teks, keputusan mutlak ada pada Asprak.
            </ThemedText>
          </View>
        </View>

        {/* Student Leave Request Card */}
        <View style={styles.studentCard}>
          {/* Top row: Avatar, Name, NIM, Status Pill */}
          <View style={styles.studentTopRow}>
            <View style={styles.studentAvatar}>
              <ThemedText style={styles.studentAvatarText}>{initials}</ThemedText>
            </View>
            <View style={styles.studentInfoCol}>
              <ThemedText style={styles.studentName}>{request.userName}</ThemedText>
              <ThemedText style={styles.studentNim}>NIM: 2210511019</ThemedText>
            </View>
            <View style={styles.pendingPill}>
              <View style={styles.pendingDot} />
              <ThemedText style={styles.pendingPillText}>Menunggu Review</ThemedText>
            </View>
          </View>

          {/* Subject & Time info */}
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Feather name="book-open" size={13} color={LaboraColors.primary} />
              <ThemedText style={styles.metaText}>
                TI-3A • {sessionTitle ?? 'Pemrograman Mobile Lanjut'}
              </ThemedText>
            </View>
            <View style={styles.metaRow}>
              <Feather name="clock" size={13} color={LaboraColors.primary} />
              <ThemedText style={styles.metaText}>
                {formatAttendanceTime(request.submittedAt)}
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

          {/* AI Suggestion Box */}
          <View style={styles.aiSuggestionBox}>
            <View style={styles.aiIconCircle}>
              <Feather name="cpu" size={15} color={LaboraColors.primary} />
            </View>
            <View style={styles.aiTextCol}>
              <ThemedText style={styles.aiTitle}>
                Kategori AI: {getLeaveCategoryLabel(request.category)} • Keyakinan 96%
              </ThemedText>
              <ThemedText style={styles.aiSubtitle}>
                ✓ Dokumen Valid Teridentifikasi
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
                  {request.attachmentName ?? 'Surat Sakit RS Hermina.pdf'}
                </ThemedText>
                <ThemedText style={styles.attachmentFileSize}>
                  842 KB • Rekam Medis
                </ThemedText>
              </View>
            </View>

            <Pressable style={styles.previewBtn} onPress={handlePreviewDocument}>
              <ThemedText style={styles.previewBtnText}>Pratinjau</ThemedText>
            </Pressable>
          </View>

          {/* Reviewer Note Input */}
          <View style={styles.noteField}>
            <ThemedText style={styles.noteLabel}>Catatan Reviewer (Opsional)</ThemedText>
            <TextInput
              style={styles.noteInput}
              placeholder="Tambahkan catatan asisten jika diperlukan..."
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
          disabled={isSubmitting}
          onPress={() => handleDecision('REJECTED')}
          style={[styles.rejectBtn, isSubmitting && styles.disabledBtn]}>
          <Feather name="x" size={16} color="#DC2626" style={{ marginRight: 6 }} />
          <ThemedText style={styles.rejectBtnText}>Tolak</ThemedText>
        </Pressable>

        <Pressable
          disabled={isSubmitting}
          onPress={() => handleDecision('APPROVED')}
          style={[styles.approveBtn, isSubmitting && styles.disabledBtn]}>
          <Feather name="check" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <ThemedText style={styles.approveBtnText}>Setujui Izin</ThemedText>
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
