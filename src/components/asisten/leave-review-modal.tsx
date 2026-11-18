import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { getLeaveCategoryLabel } from './leave-request-card';
import { formatAttendanceTime } from './attendance-record-card';
import type { LeaveRequest, LeaveStatus } from '@/types';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
  const theme = useTheme();
  const [reviewerNote, setReviewerNote] = useState(request.reviewerNote ?? '');

  const handleDecision = async (decision: Exclude<LeaveStatus, 'PENDING'>) => {
    await onSubmitDecision(request.id, decision, reviewerNote);
    onClose();
  };

  return (
    <ThemedView style={styles.modalContent}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <ThemedText type="small" themeColor="textSecondary">
            PANEL PENINJAUAN IZIN PRAKTIKAN (SRS-10)
          </ThemedText>
          <ThemedText type="subtitle" style={styles.titleText}>
            {request.userName}
          </ThemedText>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <ThemedText style={styles.closeButtonText}>✕</ThemedText>
        </Pressable>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.infoGroup}>
          <View style={styles.infoRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Sesi Praktikum:
            </ThemedText>
            <ThemedText type="smallBold">{sessionTitle ?? '-'}</ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Email Praktikan:
            </ThemedText>
            <ThemedText type="small">{request.userEmail}</ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Kategori Izin:
            </ThemedText>
            <ThemedText type="smallBold">
              {getLeaveCategoryLabel(request.category)}
            </ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Waktu Pengajuan:
            </ThemedText>
            <ThemedText type="small">
              {formatAttendanceTime(request.submittedAt)}
            </ThemedText>
          </View>

          <View style={styles.infoRow}>
            <ThemedText type="small" themeColor="textSecondary">
              Status Saat Ini:
            </ThemedText>
            <ThemedText
              type="smallBold"
              style={
                request.status === 'APPROVED'
                  ? styles.statusApproved
                  : request.status === 'REJECTED'
                    ? styles.statusRejected
                    : styles.statusPending
              }>
              {request.status}
            </ThemedText>
          </View>
        </View>

        <View style={styles.reasonCard}>
          <ThemedText type="smallBold" style={styles.sectionLabel}>
            Alasan Lengkap Praktikan
          </ThemedText>
          <ThemedText type="small" style={styles.reasonText}>
            &ldquo;{request.reason}&rdquo;
          </ThemedText>

          {request.attachmentName ? (
            <View style={styles.attachmentRow}>
              <ThemedText type="smallBold" style={styles.attachmentLabel}>
                📎 Berkas Lampiran: {request.attachmentName}
              </ThemedText>
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              Tidak ada lampiran dokumen.
            </ThemedText>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="smallBold">
            Catatan Keputusan Asisten (Opsional)
          </ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Contoh: Surat keterangan dokter valid, izin disetujui..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={reviewerNote}
            onChangeText={setReviewerNote}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          disabled={isSubmitting}
          onPress={() => handleDecision('REJECTED')}
          style={[
            styles.rejectActionButton,
            isSubmitting && styles.disabledButton,
          ]}>
          <ThemedText type="smallBold" style={styles.rejectActionText}>
            ❌ Tolak Izin (REJECTED)
          </ThemedText>
        </Pressable>

        <Pressable
          disabled={isSubmitting}
          onPress={() => handleDecision('APPROVED')}
          style={[
            styles.approveActionButton,
            isSubmitting && styles.disabledButton,
          ]}>
          <ThemedText type="smallBold" style={styles.approveActionText}>
            ✅ Setujui Izin (APPROVED)
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
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
    maxHeight: '88%',
    borderRadius: 20,
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
    alignItems: 'flex-start',
    padding: Spacing.four,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  headerTitleWrap: {
    flex: 1,
    gap: 4,
  },
  titleText: {
    fontSize: 18,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: Spacing.two,
  },
  closeButtonText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: 'bold',
  },
  body: {
    flexGrow: 1,
  },
  bodyContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  infoGroup: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  statusPending: {
    color: '#D97706',
  },
  statusApproved: {
    color: '#16A34A',
  },
  statusRejected: {
    color: '#DC2626',
  },
  reasonCard: {
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderRadius: 12,
    padding: Spacing.three,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  sectionLabel: {
    fontSize: 12,
    color: '#0284C7',
    textTransform: 'uppercase',
  },
  reasonText: {
    lineHeight: 20,
    fontStyle: 'italic',
  },
  attachmentRow: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  attachmentLabel: {
    color: '#4F46E5',
    fontSize: 11,
  },
  fieldGroup: {
    gap: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: 'rgba(148, 163, 184, 0.08)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 76,
    textAlignVertical: 'top',
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  rejectActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  rejectActionText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  approveActionButton: {
    flex: 1.15,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  approveActionText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.55,
  },
});

