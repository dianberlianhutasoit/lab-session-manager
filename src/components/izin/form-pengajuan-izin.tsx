import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { LaboraColors } from '@/constants/theme';
import { useSessionContext } from '@/context/session-context';
import type { PermissionCategory } from '@/types';

interface FormPengajuanIzinProps {
  onSubmitPermission: (data: {
    sessionId: string;
    reason: string;
    category?: PermissionCategory;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function FormPengajuanIzin({
  onSubmitPermission,
  isLoading = false,
}: FormPengajuanIzinProps) {
  const { sessions, schedules, permissions, currentStudentId } = useSessionContext();

  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    sessions[0]?.id ?? ''
  );
  const [category, setCategory] = useState<PermissionCategory>('SAKIT');
  const [reason, setReason] = useState<string>('');
  const [attachment, setAttachment] = useState<string>('Surat_Keterangan_Sakit_RS.pdf');
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Validasi form komprehensif (SRS-15)
  const validateForm = (): boolean => {
    let isValid = true;

    if (!selectedSessionId) {
      setSessionError('Silakan pilih salah satu sesi praktikum yang ingin diajukan izin.');
      isValid = false;
    } else {
      const hasExistingPendingOrApproved = permissions.some(
        (p) =>
          p.sessionId === selectedSessionId &&
          p.userId === currentStudentId &&
          p.status !== 'REJECTED'
      );

      if (hasExistingPendingOrApproved) {
        setSessionError('Anda sudah pernah mengajukan izin untuk sesi praktikum ini.');
        isValid = false;
      } else {
        setSessionError(null);
      }
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setReasonError('Alasan ketidakhadiran tidak boleh kosong.');
      isValid = false;
    } else if (trimmedReason.length < 10) {
      setReasonError('Alasan terlalu singkat, tuliskan minimal 10 karakter.');
      isValid = false;
    } else if (trimmedReason.length > 300) {
      setReasonError('Alasan melebihi batas maksimal (maksimal 300 karakter).');
      isValid = false;
    } else {
      setReasonError(null);
    }

    setGeneralError(null);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await onSubmitPermission({
        sessionId: selectedSessionId,
        reason: reason.trim(),
        category,
      });

      setReason('');
      setSessionError(null);
      setReasonError(null);
      setGeneralError(null);

      const successTitle = 'Permohonan Terkirim';
      const successMsg = 'Izin Anda telah diajukan dan sedang menunggu review asisten lab.';
      if (Platform.OS === 'web') {
        window.alert(`${successTitle}: ${successMsg}`);
      } else {
        Alert.alert(successTitle, successMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengirim izin.';
      setGeneralError(msg);
    }
  };

  const handlePickDocument = () => {
    setAttachment('Surat_Keterangan_Sakit_RS.pdf');
    Alert.alert(
      'Dokumen Terpilih',
      'Surat_Keterangan_Sakit_RS.pdf (1.2 MB) berhasil dilampirkan.',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={styles.container}>
      {/* 1. Ketentuan Pengajuan Izin Banner */}
      <View style={styles.policyBanner}>
        <View style={styles.policyIconCircle}>
          <Feather name="shield" size={16} color={LaboraColors.primary} />
        </View>
        <View style={styles.policyTextCol}>
          <ThemedText style={styles.policyHeading}>Ketentuan Pengajuan Izin</ThemedText>
          <ThemedText style={styles.policyDescription}>
            Pengajuan izin wajib disertai bukti otentik (Surat Dokter / Surat Tugas Fakultas). Permohonan akan ditinjau langsung oleh Asisten Praktikum terkait.
          </ThemedText>
        </View>
      </View>

      {/* 2. Sesi Praktikum Selector */}
      <View style={styles.formGroup}>
        <ThemedText style={styles.fieldLabel}>
          Sesi Praktikum <ThemedText style={styles.requiredStar}>*</ThemedText>
        </ThemedText>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sessionScrollList}>
          {sessions.map((sess) => {
            const sch = schedules.find((s) => s.id === sess.scheduleId);
            const isSelected = sess.id === selectedSessionId;

            return (
              <Pressable
                key={sess.id}
                onPress={() => {
                  setSelectedSessionId(sess.id);
                  setSessionError(null);
                }}
                style={[
                  styles.sessionCard,
                  isSelected && styles.sessionCardSelected,
                ]}>
                <View style={styles.sessionTopRow}>
                  <ThemedText
                    style={[
                      styles.sessionCourseCode,
                      isSelected && styles.sessionCourseCodeSelected,
                    ]}>
                    {sch?.courseCode ?? 'LAB'}
                  </ThemedText>
                  <View
                    style={[
                      styles.sessionDot,
                      isSelected ? styles.sessionDotSelected : styles.sessionDotDefault,
                    ]}
                  />
                </View>
                <ThemedText
                  numberOfLines={1}
                  style={[
                    styles.sessionTitle,
                    isSelected && styles.sessionTitleSelected,
                  ]}>
                  {sch?.title ?? 'Sesi Praktikum'}
                </ThemedText>
                <ThemedText
                  style={[
                    styles.sessionMeta,
                    isSelected && styles.sessionMetaSelected,
                  ]}>
                  {sch?.date ?? 'Hari ini'} • {sch?.startTime ?? '09:30'} WIB
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
        <ThemedText style={styles.fieldHelper}>
          Pilih jadwal modul yang sedang berlangsung di pekan ini
        </ThemedText>
        {sessionError && (
          <ThemedText style={styles.fieldError}>⚠️ {sessionError}</ThemedText>
        )}
      </View>

      {/* 3. Kategori Izin (Radio Option Cards) */}
      <View style={styles.formGroup}>
        <ThemedText style={styles.fieldLabel}>
          Kategori Izin <ThemedText style={styles.requiredStar}>*</ThemedText>
        </ThemedText>

        <View style={styles.radioList}>
          {/* Radio 1: Sakit */}
          <Pressable
            style={[
              styles.radioCard,
              category === 'SAKIT' && styles.radioCardSelected,
            ]}
            onPress={() => setCategory('SAKIT')}>
            <View style={styles.radioCardLeft}>
              <View style={[styles.radioIconCircle, category === 'SAKIT' && styles.radioIconCircleSelected]}>
                <Feather name="plus-circle" size={16} color={category === 'SAKIT' ? LaboraColors.primary : LaboraColors.textMuted} />
              </View>
              <View style={styles.radioTextCol}>
                <ThemedText style={styles.radioTitle}>Sakit</ThemedText>
                <ThemedText style={styles.radioSub}>Melampirkan Surat Keterangan Sakit resmi</ThemedText>
              </View>
            </View>
            <View style={[styles.radioCircle, category === 'SAKIT' && styles.radioCircleChecked]}>
              {category === 'SAKIT' && <View style={styles.radioInnerDot} />}
            </View>
          </Pressable>

          {/* Radio 2: Dispensasi */}
          <Pressable
            style={[
              styles.radioCard,
              category === 'AKADEMIK' && styles.radioCardSelected,
            ]}
            onPress={() => setCategory('AKADEMIK')}>
            <View style={styles.radioCardLeft}>
              <View style={[styles.radioIconCircle, category === 'AKADEMIK' && styles.radioIconCircleSelected]}>
                <Feather name="award" size={16} color={category === 'AKADEMIK' ? LaboraColors.primary : LaboraColors.textMuted} />
              </View>
              <View style={styles.radioTextCol}>
                <ThemedText style={styles.radioTitle}>Dispensasi Kegiatan Kampus</ThemedText>
                <ThemedText style={styles.radioSub}>Lomba, delegasi, atau tugas dinas fakultas</ThemedText>
              </View>
            </View>
            <View style={[styles.radioCircle, category === 'AKADEMIK' && styles.radioCircleChecked]}>
              {category === 'AKADEMIK' && <View style={styles.radioInnerDot} />}
            </View>
          </Pressable>

          {/* Radio 3: Keperluan Mendesak */}
          <Pressable
            style={[
              styles.radioCard,
              category === 'LAINNYA' && styles.radioCardSelected,
            ]}
            onPress={() => setCategory('LAINNYA')}>
            <View style={styles.radioCardLeft}>
              <View style={[styles.radioIconCircle, category === 'LAINNYA' && styles.radioIconCircleSelected]}>
                <Feather name="users" size={16} color={category === 'LAINNYA' ? LaboraColors.primary : LaboraColors.textMuted} />
              </View>
              <View style={styles.radioTextCol}>
                <ThemedText style={styles.radioTitle}>Keperluan Mendesak / Duka</ThemedText>
                <ThemedText style={styles.radioSub}>Keluarga inti atau musibah tak terduga</ThemedText>
              </View>
            </View>
            <View style={[styles.radioCircle, category === 'LAINNYA' && styles.radioCircleChecked]}>
              {category === 'LAINNYA' && <View style={styles.radioInnerDot} />}
            </View>
          </Pressable>
        </View>
      </View>

      {/* 4. Alasan / Keterangan Lengkap */}
      <View style={styles.formGroup}>
        <View style={styles.labelWithCounter}>
          <ThemedText style={styles.fieldLabel}>
            Alasan / Keterangan Lengkap <ThemedText style={styles.requiredStar}>*</ThemedText>
          </ThemedText>
          <ThemedText style={styles.charCounter}>{reason.length}/300</ThemedText>
        </View>

        <TextInput
          style={[styles.textarea, reasonError ? styles.inputErrorBorder : null]}
          placeholder="Jelaskan alasan ketidakhadiran Anda secara rinci..."
          placeholderTextColor={LaboraColors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={300}
          value={reason}
          onChangeText={(txt) => {
            setReason(txt);
            if (reasonError) setReasonError(null);
          }}
          editable={!isLoading}
        />
        <ThemedText style={styles.fieldHelper}>
          Sertakan detail durasi waktu dan keterangan medis/kegiatan
        </ThemedText>
        {reasonError && (
          <ThemedText style={styles.fieldError}>⚠️ {reasonError}</ThemedText>
        )}
      </View>

      {/* 5. Dokumen Bukti Otentik */}
      <View style={styles.formGroup}>
        <ThemedText style={styles.fieldLabel}>
          Dokumen Bukti Otentik <ThemedText style={styles.requiredStar}>*</ThemedText>
        </ThemedText>

        {/* Upload drop zone */}
        <Pressable
          style={styles.uploadDropZone}
          onPress={handlePickDocument}>
          <View style={styles.uploadIconCircle}>
            <Feather name="upload-cloud" size={20} color={LaboraColors.primary} />
          </View>
          <ThemedText style={styles.uploadPrompt}>Ketuk untuk Mengunggah Berkas</ThemedText>
          <ThemedText style={styles.uploadFormat}>
            Unggah Surat Keterangan Dokter atau Surat Tugas (.PDF, .JPG, .PNG maks. 5MB)
          </ThemedText>
        </Pressable>

        {/* Uploaded file preview card */}
        {attachment ? (
          <View style={styles.attachmentPreviewCard}>
            <View style={styles.attachmentPreviewLeft}>
              <View style={styles.attachmentIconCircle}>
                <Feather name="file-text" size={18} color={LaboraColors.primary} />
              </View>
              <View style={styles.attachmentMetaCol}>
                <ThemedText style={styles.attachmentFileName} numberOfLines={1}>
                  {attachment}
                </ThemedText>
                <ThemedText style={styles.attachmentFileStatus}>
                  1.2 MB • <ThemedText style={styles.verifiedGreen}>Terverifikasi ✓</ThemedText>
                </ThemedText>
              </View>
            </View>

            <View style={styles.attachmentActionRow}>
              <Pressable
                style={styles.attachmentIconBtn}
                onPress={handlePickDocument}>
                <Feather name="refresh-cw" size={14} color={LaboraColors.textSecondary} />
              </Pressable>
              <Pressable
                style={styles.attachmentIconBtn}
                onPress={() => setAttachment('')}>
                <Feather name="trash-2" size={14} color="#EF4444" />
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>

      {/* 6. Status Pasca Kirim Banner */}
      <View style={styles.postSubmitCard}>
        <View style={styles.postSubmitLeft}>
          <View style={styles.postSubmitIconCircle}>
            <Feather name="info" size={15} color={LaboraColors.primary} />
          </View>
          <View style={styles.postSubmitTextCol}>
            <ThemedText style={styles.postSubmitLabel}>STATUS PASCA KIRIM</ThemedText>
            <ThemedText style={styles.postSubmitHeading}>Menunggu Persetujuan Asprak</ThemedText>
          </View>
        </View>
        <View style={styles.waitingPill}>
          <View style={styles.waitingDot} />
          <ThemedText style={styles.waitingPillText}>Menunggu</ThemedText>
        </View>
      </View>

      {generalError && (
        <View style={styles.errorAlertBox}>
          <ThemedText style={styles.errorAlertText}>⚠️ {generalError}</ThemedText>
        </View>
      )}

      {/* 7. Action Buttons */}
      <View style={styles.actionRow}>
        <Pressable
          style={[styles.submitButton, isLoading && styles.disabledButton]}
          disabled={isLoading}
          onPress={handleSubmit}>
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="send" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <ThemedText style={styles.submitButtonText}>Kirim Permohonan Izin</ThemedText>
            </>
          )}
        </Pressable>

        <Pressable
          style={styles.cancelButton}
          onPress={() => {
            setReason('');
            setSessionError(null);
            setReasonError(null);
          }}>
          <ThemedText style={styles.cancelButtonText}>Batal</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 18,
    width: '100%',
  },

  /* Policy Banner */
  policyBanner: {
    flexDirection: 'row',
    backgroundColor: LaboraColors.blush,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  policyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FCE7EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyTextCol: {
    flex: 1,
    gap: 2,
  },
  policyHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: LaboraColors.primary,
  },
  policyDescription: {
    fontSize: 11,
    color: LaboraColors.textSecondary,
    lineHeight: 15,
  },

  /* Form Groups */
  formGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
  requiredStar: {
    color: LaboraColors.primary,
  },
  labelWithCounter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCounter: {
    fontSize: 11,
    color: LaboraColors.textMuted,
  },
  fieldHelper: {
    fontSize: 11,
    color: LaboraColors.textMuted,
  },
  fieldError: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '600',
  },

  /* Session selector */
  sessionScrollList: {
    gap: 10,
    paddingVertical: 2,
  },
  sessionCard: {
    width: 200,
    backgroundColor: LaboraColors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: LaboraColors.cardBorder,
    gap: 4,
  },
  sessionCardSelected: {
    borderColor: LaboraColors.primary,
    backgroundColor: LaboraColors.blush,
  },
  sessionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionCourseCode: {
    fontSize: 11,
    fontWeight: '700',
    color: LaboraColors.textSecondary,
  },
  sessionCourseCodeSelected: {
    color: LaboraColors.primary,
  },
  sessionDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  sessionDotDefault: {
    backgroundColor: LaboraColors.textMuted,
  },
  sessionDotSelected: {
    backgroundColor: LaboraColors.primary,
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
  sessionTitleSelected: {
    color: LaboraColors.primary,
  },
  sessionMeta: {
    fontSize: 11,
    color: LaboraColors.textMuted,
  },
  sessionMetaSelected: {
    color: LaboraColors.textSecondary,
  },

  /* Radio Card List */
  radioList: {
    gap: 10,
  },
  radioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: LaboraColors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: LaboraColors.cardBorder,
  },
  radioCardSelected: {
    borderColor: LaboraColors.primary,
    backgroundColor: '#FAF5F7',
  },
  radioCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  radioIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LaboraColors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioIconCircleSelected: {
    backgroundColor: LaboraColors.blush,
  },
  radioTextCol: {
    flex: 1,
    gap: 2,
  },
  radioTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  radioSub: {
    fontSize: 11,
    color: LaboraColors.textMuted,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: LaboraColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleChecked: {
    borderColor: LaboraColors.primary,
  },
  radioInnerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: LaboraColors.primary,
  },

  /* Textarea */
  textarea: {
    backgroundColor: LaboraColors.card,
    borderRadius: 14,
    padding: 12,
    fontSize: 13,
    color: LaboraColors.textPrimary,
    borderWidth: 1.5,
    borderColor: LaboraColors.cardBorder,
    minHeight: 90,
  },
  inputErrorBorder: {
    borderColor: '#EF4444',
  },

  /* Upload drop zone */
  uploadDropZone: {
    backgroundColor: LaboraColors.card,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: LaboraColors.cardBorder,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: LaboraColors.blush,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  uploadPrompt: {
    fontSize: 13,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  uploadFormat: {
    fontSize: 11,
    color: LaboraColors.textMuted,
    textAlign: 'center',
    maxWidth: 260,
  },

  /* Attachment preview */
  attachmentPreviewCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: LaboraColors.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  attachmentPreviewLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  attachmentIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
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
  attachmentFileStatus: {
    fontSize: 11,
    color: LaboraColors.textMuted,
  },
  verifiedGreen: {
    color: '#047857',
    fontWeight: '700',
  },
  attachmentActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  attachmentIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: LaboraColors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* Post-submit Card */
  postSubmitCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: LaboraColors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  postSubmitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  postSubmitIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: LaboraColors.blush,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postSubmitTextCol: {
    gap: 2,
  },
  postSubmitLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: LaboraColors.textMuted,
    letterSpacing: 0.5,
  },
  postSubmitHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  waitingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE7EC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    gap: 4,
  },
  waitingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: LaboraColors.primary,
  },
  waitingPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: LaboraColors.primary,
  },

  /* Action buttons */
  actionRow: {
    gap: 10,
    marginTop: 6,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LaboraColors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: LaboraColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LaboraColors.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: LaboraColors.textSecondary,
    fontWeight: '700',
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.6,
  },
  errorAlertBox: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  errorAlertText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
});
