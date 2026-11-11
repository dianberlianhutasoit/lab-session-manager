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
import type { LabClass, LabClassFormInput, User } from '@/types';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ClassFormModalProps {
  visible: boolean;
  initialData?: LabClass | null;
  assistants: User[];
  onClose: () => void;
  onSubmit: (data: LabClassFormInput) => void | Promise<void>;
}

export function ClassFormModal(props: ClassFormModalProps) {
  const { visible, initialData, onClose } = props;
  const formKey = `${visible ? 'open' : 'closed'}-${initialData?.id ?? 'new'}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <ClassFormContent key={formKey} {...props} />
      </View>
    </Modal>
  );
}

function ClassFormContent({
  initialData,
  assistants,
  onClose,
  onSubmit,
}: ClassFormModalProps) {
  const theme = useTheme();
  const isEditing = !!initialData;

  const [courseCode, setCourseCode] = useState(initialData?.courseCode ?? '');
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [className, setClassName] = useState(initialData?.className ?? 'Kelas A');
  const [room, setRoom] = useState(initialData?.room ?? 'Lab Komputer 1');
  const [assistantId, setAssistantId] = useState(
    initialData?.assistantId ?? assistants[0]?.id ?? 'user-asisten-001'
  );
  const [semester, setSemester] = useState(
    initialData?.semester ?? 'Ganjil 2026/2027'
  );
  const [capacity, setCapacity] = useState(
    initialData?.capacity !== undefined ? String(initialData.capacity) : '30'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    const trimmedCode = courseCode.trim().toUpperCase();
    const trimmedTitle = title.trim();
    const trimmedClassName = className.trim();
    const trimmedRoom = room.trim();

    if (!trimmedCode || !trimmedTitle || !trimmedClassName || !trimmedRoom || !assistantId) {
      setErrorMsg('Kode praktikum, nama praktikum, nama kelas, ruangan, dan asisten wajib diisi.');
      return;
    }

    const parsedCapacity = Number.parseInt(capacity, 10);
    if (Number.isNaN(parsedCapacity) || parsedCapacity <= 0) {
      setErrorMsg('Kapasitas kelas harus berupa angka positif.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        courseCode: trimmedCode,
        title: trimmedTitle,
        className: trimmedClassName,
        room: trimmedRoom,
        assistantId,
        semester: semester.trim() || undefined,
        capacity: parsedCapacity,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Gagal menyimpan data kelas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.modalContent}>
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <ThemedText type="small" themeColor="textSecondary">
            {isEditing ? 'EDIT DATA KELAS (SRS-07)' : 'TAMBAH KELAS BARU (SRS-07)'}
          </ThemedText>
          <ThemedText type="subtitle" style={styles.titleText}>
            {isEditing ? 'Perbarui Kelas Praktikum' : 'Form Kelas Praktikum'}
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

        <View style={styles.fieldRow}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <ThemedText type="smallBold">Kode Praktikum *</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Contoh: LAB101"
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              value={courseCode}
              onChangeText={setCourseCode}
            />
          </View>

          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <ThemedText type="smallBold">Nama Kelas *</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Contoh: Kelas A"
              placeholderTextColor="#94A3B8"
              value={className}
              onChangeText={setClassName}
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
          <ThemedText type="smallBold">Ruangan Laboratorium Default *</ThemedText>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Contoh: Lab Komputer 1"
            placeholderTextColor="#94A3B8"
            value={room}
            onChangeText={setRoom}
          />
        </View>

        <View style={styles.fieldRow}>
          <View style={[styles.fieldGroup, { flex: 1.3 }]}>
            <ThemedText type="smallBold">Semester</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Ganjil 2026/2027"
              placeholderTextColor="#94A3B8"
              value={semester}
              onChangeText={setSemester}
            />
          </View>

          <View style={[styles.fieldGroup, { flex: 0.7 }]}>
            <ThemedText type="smallBold">Kapasitas *</ThemedText>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="30"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={capacity}
              onChangeText={setCapacity}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="smallBold">Asisten Pengampu Kelas *</ThemedText>
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
            {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah Kelas'}
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
