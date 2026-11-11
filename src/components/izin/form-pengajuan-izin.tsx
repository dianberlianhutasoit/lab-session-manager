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

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useSessionContext } from '@/context/session-context';
import { useTheme } from '@/hooks/use-theme';

interface FormPengajuanIzinProps {
  onSubmitPermission: (data: { sessionId: string; reason: string }) => Promise<void>;
  isLoading?: boolean;
}

export function FormPengajuanIzin({
  onSubmitPermission,
  isLoading = false,
}: FormPengajuanIzinProps) {
  const theme = useTheme();
  const { sessions, schedules } = useSessionContext();

  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Validasi form (SRS-15)
  const validateForm = (): boolean => {
    if (!selectedSessionId) {
      setErrorMessage('Silakan pilih salah satu sesi praktikum.');
      return false;
    }
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setErrorMessage('Alasan ketidakhadiran tidak boleh kosong.');
      return false;
    }
    if (trimmedReason.length < 10) {
      setErrorMessage('Alasan terlalu singkat, tuliskan minimal 10 karakter.');
      return false;
    }
    if (trimmedReason.length > 500) {
      setErrorMessage('Alasan terlalu panjang (maksimal 500 karakter).');
      return false;
    }

    setErrorMessage(null);
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      await onSubmitPermission({
        sessionId: selectedSessionId,
        reason: reason.trim(),
      });
      // Reset form setelah berhasil
      setReason('');
      setSelectedSessionId('');
      setErrorMessage(null);

      const successTitle = 'Permohonan Terkirim';
      const successMsg = 'Izin Anda telah diajukan dan sedang diproses.';
      if (Platform.OS === 'web') {
        window.alert(`${successTitle}: ${successMsg}`);
      } else {
        Alert.alert(successTitle, successMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengirim izin.';
      setErrorMessage(msg);
    }
  };

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="smallBold" style={styles.badge}>
          FORMULIR IZIN PRAKTIKAN (SRS-11)
        </ThemedText>
        <ThemedText type="subtitle" style={styles.title}>
          Ajukan Izin Praktikum
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Pilih sesi praktikum yang berhalangan hadir dan jelaskan alasan Anda dengan jujur.
        </ThemedText>
      </View>

      {/* 1. Pemilih Sesi Praktikum */}
      <View style={styles.section}>
        <ThemedText type="smallBold" style={styles.label}>
          1. Pilih Sesi Praktikum <ThemedText style={styles.required}>*</ThemedText>
        </ThemedText>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sessionScroll}>
          {sessions.map((sess) => {
            const sch = schedules.find((s) => s.id === sess.scheduleId);
            const isSelected = sess.id === selectedSessionId;

            return (
              <Pressable
                key={sess.id}
                onPress={() => {
                  setSelectedSessionId(sess.id);
                  setErrorMessage(null);
                }}
                style={[
                  styles.sessionCard,
                  isSelected && styles.sessionCardSelected,
                ]}>
                <View style={styles.sessionHeaderRow}>
                  <ThemedText
                    type="smallBold"
                    style={[
                      styles.courseCode,
                      isSelected && styles.courseCodeSelected,
                    ]}>
                    {sch?.courseCode ?? 'LAB'}
                  </ThemedText>
                  <View
                    style={[
                      styles.statusDot,
                      sess.status === 'OPEN' ? styles.statusDotOpen : styles.statusDotClosed,
                    ]}
                  />
                </View>

                <ThemedText
                  type="smallBold"
                  numberOfLines={1}
                  style={[styles.courseTitle, isSelected && styles.courseTitleSelected]}>
                  {sch?.title ?? 'Sesi Praktikum'}
                </ThemedText>

                <ThemedText
                  type="small"
                  style={[styles.sessionMeta, isSelected && styles.sessionMetaSelected]}>
                  📅 {sch?.date ?? '-'}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={[styles.sessionMeta, isSelected && styles.sessionMetaSelected]}>
                  ⏰ {sch?.startTime} - {sch?.endTime}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* 2. Textarea Alasan Izin */}
      <View style={styles.section}>
        <View style={styles.labelRow}>
          <ThemedText type="smallBold" style={styles.label}>
            2. Alasan Ketidakhadiran <ThemedText style={styles.required}>*</ThemedText>
          </ThemedText>
          <ThemedText
            type="small"
            style={[
              styles.charCounter,
              reason.length > 500 && styles.charCounterLimit,
            ]}>
            {reason.length} / 500
          </ThemedText>
        </View>

        <TextInput
          style={[
            styles.textarea,
            {
              color: theme.text,
              backgroundColor: theme.background,
              borderColor: errorMessage ? '#EF4444' : '#CBD5E1',
            },
          ]}
          placeholder="Contoh: Saya tidak dapat mengikuti sesi praktikum karena mengalami demam tinggi dan harus menjalani pemeriksaan dokter di RS..."
          placeholderTextColor="#94A3B8"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={reason}
          onChangeText={(text) => {
            setReason(text);
            if (errorMessage) setErrorMessage(null);
          }}
          editable={!isLoading}
        />
        <ThemedText type="small" themeColor="textSecondary" style={styles.helperText}>
          Minimal 10 karakter. Alasan ini akan diklasifikasikan oleh AI untuk pertimbangan asisten.
        </ThemedText>
      </View>

      {/* Feedback Pesan Validasi Error (SRS-15) */}
      {errorMessage && (
        <View style={styles.errorBox}>
          <ThemedText type="small" style={styles.errorText}>
            ⚠️ {errorMessage}
          </ThemedText>
        </View>
      )}

      {/* Tombol Kirim Permohonan */}
      <Pressable
        onPress={handleSubmit}
        disabled={isLoading}
        style={({ pressed }) => [
          styles.submitButton,
          isLoading && styles.submitButtonDisabled,
          pressed && styles.pressed,
        ]}>
        {isLoading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <ThemedText type="smallBold" style={styles.submitButtonText}>
              Memproses & Menganalisis dengan AI...
            </ThemedText>
          </View>
        ) : (
          <ThemedText type="smallBold" style={styles.submitButtonText}>
            ✉️ Kirim Permohonan Izin
          </ThemedText>
        )}
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  header: {
    gap: 4,
  },
  badge: {
    color: '#0284C7',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    lineHeight: 28,
  },
  section: {
    gap: Spacing.two,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
  },
  required: {
    color: '#EF4444',
  },
  charCounter: {
    fontSize: 11,
    color: '#94A3B8',
  },
  charCounterLimit: {
    color: '#EF4444',
    fontWeight: 'bold',
  },
  sessionScroll: {
    gap: Spacing.two,
    paddingVertical: 4,
  },
  sessionCard: {
    width: 170,
    padding: Spacing.three,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 4,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  sessionCardSelected: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseCode: {
    fontSize: 11,
    color: '#0284C7',
  },
  courseCodeSelected: {
    color: '#E0F2FE',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotOpen: {
    backgroundColor: '#22C55E',
  },
  statusDotClosed: {
    backgroundColor: '#94A3B8',
  },
  courseTitle: {
    fontSize: 13,
    color: '#1E293B',
  },
  courseTitleSelected: {
    color: '#FFFFFF',
  },
  sessionMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  sessionMetaSelected: {
    color: '#E0F2FE',
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    fontSize: 14,
    minHeight: 110,
    ...Platform.select({
      web: { outlineStyle: 'none' } as unknown as object,
    }),
  },
  helperText: {
    fontSize: 11,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: Spacing.three,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.8,
  },
});

