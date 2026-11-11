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
import type {
  LabClass,
  SessionScheduleFormInput,
  SessionStatus,
  User,
} from '@/types';
import type { SessionWithDetails } from '@/context/session-context';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface SessionFormModalProps {
  visible: boolean;
  initialSession?: SessionWithDetails | null;
  preselectedClass?: LabClass | null;
  classes: LabClass[];
  assistants: User[];
  onClose: () => void;
  onSubmit: (data: SessionScheduleFormInput) => void | Promise<void>;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function SessionFormModal(props: SessionFormModalProps) {
  const { visible, initialSession, preselectedClass, onClose } = props;
  const formKey = `${visible ? 'open' : 'closed'}-${initialSession?.id ?? preselectedClass?.id ?? 'new'}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <SessionFormContent key={formKey} {...props} />
      </View>
    </Modal>
  );
}

function SessionFormContent({
  initialSession,
  preselectedClass,
  classes,
  assistants,
  onClose,
  onSubmit,
}: SessionFormModalProps) {
  const theme = useTheme();
  const isEditing = !!initialSession;
  const defaultClass = preselectedClass ?? classes[0] ?? null;
  const sch = initialSession?.schedule;

  const [selectedClassId, setSelectedClassId] = useState<string>(
    initialSession
      ? initialSession.classId ?? sch?.classId ?? ''
      : defaultClass?.id ?? ''
  );
  const [courseCode, setCourseCode] = useState(
    initialSession ? sch?.courseCode ?? '' : defaultClass?.courseCode ?? ''
  );
  const [title, setTitle] = useState(
    initialSession ? sch?.title ?? '' : defaultClass?.title ?? ''
  );
  const [className, setClassName] = useState(
    initialSession ? sch?.className ?? 'Kelas A' : defaultClass?.className ?? 'Kelas A'
  );
  const [sessionNumber, setSessionNumber] = useState(
    initialSession && sch?.sessionNumber !== undefined ? String(sch.sessionNumber) : '1'
  );
  const [topic, setTopic] = useState(initialSession ? sch?.topic ?? '' : '');
  const [date, setDate] = useState(initialSession ? sch?.date ?? '2026-11-12' : '2026-11-12');
  const [startTime, setStartTime] = useState(
    initialSession ? sch?.startTime ?? '09:00' : '09:00'
  );
  const [endTime, setEndTime] = useState(
    initialSession ? sch?.endTime ?? '11:00' : '11:00'
  );
  const [room, setRoom] = useState(
    initialSession ? sch?.room ?? '' : defaultClass?.room ?? 'Lab Komputer 1'
  );
  const [assistantId, setAssistantId] = useState(
    initialSession
      ? initialSession.assistantId
      : defaultClass?.assistantId ?? assistants[0]?.id ?? 'user-asisten-001'
  );
  const [status, setStatus] = useState<SessionStatus>(
    initialSession ? initialSession.status : 'CLOSED'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectClass = (cls: LabClass) => {
    setSelectedClassId(cls.id);
    setCourseCode(cls.courseCode);
    setTitle(cls.title);
    setClassName(cls.className);
    setRoom(cls.room);
    setAssistantId(cls.assistantId);
  };

  const handleSave = async () => {
    const trimmedCode = courseCode.trim().toUpperCase();
    const trimmedTitle = title.trim();
    const trimmedDate = date.trim();
    const trimmedStart = startTime.trim();
    const trimmedEnd = endTime.trim();
    const trimmedRoom = room.trim();

    if (!trimmedCode || !trimmedTitle || !trimmedDate || !trimmedStart || !trimmedEnd || !trimmedRoom || !assistantId) {
      setErrorMsg('Semua field bertanda (*) wajib diisi.');
      return;
    }

    if (!DATE_REGEX.test(trimmedDate)) {
      setErrorMsg('Format tanggal harus YYYY-MM-DD (contoh: 2026-11-12).');
      return;
    }

    if (!TIME_REGEX.test(trimmedStart) || !TIME_REGEX.test(trimmedEnd)) {
      setErrorMsg('Format waktu harus HH:mm (contoh: 09:00 - 11:00).');
      return;
    }

    if (trimmedEnd <= trimmedStart) {
      setErrorMsg('Jam selesai harus lebih besar dari jam mulai.');
      return;
    }

    const parsedSessionNum = Number.parseInt(sessionNumber, 10);

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        classId: selectedClassId || undefined,
        courseCode: trimmedCode,
        title: trimmedTitle,
        className: className.trim() || undefined,
        sessionNumber: !Number.isNaN(parsedSessionNum) && parsedSessionNum > 0 ? parsedSessionNum : 1,
        topic: topic.trim() || undefined,
        date: trimmedDate,
        startTime: trimmedStart,
        endTime: trimmedEnd,
        room: trimmedRoom,
        assistantId,
        status,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Gagal menyimpan jadwal sesi praktikum.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.modalContent}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <ThemedText type="small" themeColor="textSecondary">
            {isEditing ? 'EDIT JADWAL SESI (SRS-07)' : 'TAMBAH JADWAL SESI (SRS-07)'}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.titleText}>
            {isEditing ? 'Perbarui Jadwal Praktikum' : 'Form Jadwal Sesi Praktikum'}
          </ThemedText>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <ThemedText style={styles.closeButtonText}>✕</ThemedText>
        </Pressable>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <ThemedText type="small" style={styles.errorText}>
              ⚠️ {errorMsg}
            </ThemedText>
          </View>
        ) : null}

        {/* Quick Select from Classes */}
        {classes.length > 0 ? (
          <View style={styles.fieldGroup}>
            <ThemedText type="smallBold">Pilih Kelas Praktikum</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.classScroll}>
              {classes.map((cls) => {
                const isSelected = cls.id === selectedClassId;
                return (
                  <Pressable
                    key={cls.id}
                    onPress={() => handleSelectClass(cls)}
                    style={[styles.classPill, isSelected && styles.classPillActive]}>
                    <ThemedText
                      type="smallBold"
                      style={[styles.classPillCode, isSelected && styles.classPillTextActive]}>
                      {cls.courseCode} • {cls.className}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={[styles.classPillTitle, isSelected && styles.classPillTextActive]}
                      numberOfLines={1}>
                      {cls.title}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.fieldRow}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <ThemedText type="smallBold">Kode Praktikum *</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="LAB101"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              value={courseCode}
              onChangeText={setCourseCode}
            />
          </View>

          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <ThemedText type="smallBold">Kelas</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Kelas A"
              placeholderTextColor="#94A3B8"
              value={className}
              onChangeText={setClassName}
            />
          </View>

          <View style={[styles.fieldGroup, { flex: 0.7 }]}>
            <ThemedText type="smallBold">Sesi Ke-</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="1"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={sessionNumber}
              onChangeText={setSessionNumber}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="smallBold">Nama Mata Praktikum *</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Contoh: Dasar Pemrograman"
            placeholderTextColor="#94A3B8"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="smallBold">Topik / Materi Pertemuan</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Contoh: Pengenalan Percabangan & Perulangan"
            placeholderTextColor="#94A3B8"
            value={topic}
            onChangeText={setTopic}
          />
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.fieldGroup, { flex: 1.2 }]}>
            <ThemedText type="smallBold">Tanggal (YYYY-MM-DD) *</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="2026-11-12"
              placeholderTextColor="#94A3B8"
              value={date}
              onChangeText={setDate}
            />
          </View>

          <View style={[styles.fieldGroup, { flex: 0.9 }]}>
            <ThemedText type="smallBold">Mulai (HH:mm) *</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="09:00"
              placeholderTextColor="#94A3B8"
              value={startTime}
              onChangeText={setStartTime}
            />
          </View>

          <View style={[styles.fieldGroup, { flex: 0.9 }]}>
            <ThemedText type="smallBold">Selesai (HH:mm) *</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="11:00"
              placeholderTextColor="#94A3B8"
              value={endTime}
              onChangeText={setEndTime}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="smallBold">Ruangan Pelaksanaan *</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Contoh: Lab Komputer 1"
            placeholderTextColor="#94A3B8"
            value={room}
            onChangeText={setRoom}
          />
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="smallBold">Asisten Penanggung Jawab *</ThemedText>
          <View style={styles.pillsContainer}>
            {assistants.map((ast) => {
              const isSelected = ast.id === assistantId;
              return (
                <Pressable
                  key={ast.id}
                  onPress={() => setAssistantId(ast.id)}
                  style={[styles.optionPill, isSelected && styles.optionPillActive]}>
                  <ThemedText
                    type="small"
                    style={[styles.optionPillText, isSelected && styles.optionPillTextActive]}>
                    👤 {ast.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="smallBold">Status Sesi</ThemedText>
          <View style={styles.pillsContainer}>
            {(['CLOSED', 'OPEN'] as SessionStatus[]).map((st) => {
              const isSelected = status === st;
              return (
                <Pressable
                  key={st}
                  onPress={() => setStatus(st)}
                  style={[styles.optionPill, isSelected && styles.optionPillActive]}>
                  <ThemedText
                    type="small"
                    style={[styles.optionPillText, isSelected && styles.optionPillTextActive]}>
                    {st === 'OPEN' ? '🟢 OPEN (Dibuka)' : '🔴 CLOSED (Ditutup)'}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={onClose} style={styles.cancelButton}>
          <ThemedText type="smallBold" style={styles.cancelButtonText}>
            Batal
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={handleSave}
          disabled={isSubmitting}
          style={[styles.submitButton, isSubmitting && styles.disabledButton]}>
          <ThemedText type="smallBold" style={styles.submitButtonText}>
            {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Jadwal' : 'Tambah Jadwal Sesi'}
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
    maxWidth: 540,
    maxHeight: '90%',
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
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: Spacing.three,
    borderRadius: 10,
  },
  errorText: {
    color: '#DC2626',
  },
  classScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  classPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 2,
    minWidth: 130,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  classPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  classPillCode: {
    color: '#0369A1',
    fontSize: 11,
  },
  classPillTitle: {
    color: '#334155',
    fontSize: 12,
  },
  classPillTextActive: {
    color: '#FFFFFF',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: Spacing.two,
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
    ...Platform.select({
      web: { outlineStyle: 'none' } as any,
    }),
  },
  pillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  optionPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  optionPillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  optionPillText: {
    color: '#334155',
  },
  optionPillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.four,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  cancelButtonText: {
    color: '#475569',
  },
  submitButton: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#0284C7',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  submitButtonText: {
    color: '#FFFFFF',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
