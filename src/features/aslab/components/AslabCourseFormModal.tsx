import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { LaboraColors } from '@/constants/theme';
import type { CourseDoc } from '@/types';
import type { CourseFormInput } from '../types';

interface AslabCourseFormModalProps {
  visible: boolean;
  initialData?: CourseDoc | null;
  onClose: () => void;
  onSubmit: (input: CourseFormInput) => Promise<void>;
}

export function AslabCourseFormModal(props: AslabCourseFormModalProps) {
  const { visible, initialData, onClose } = props;
  const formKey = `${visible ? 'open' : 'closed'}-${initialData?.id ?? 'new'}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <CourseFormContent key={formKey} {...props} />
      </View>
    </Modal>
  );
}

function CourseFormContent({ initialData, onClose, onSubmit }: AslabCourseFormModalProps) {
  const isEditing = Boolean(initialData);
  const [code, setCode] = useState(initialData?.code ?? '');
  const [name, setName] = useState(initialData?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!code.trim()) {
      setError('Kode mata kuliah wajib diisi (misal: IF101).');
      return;
    }
    if (!name.trim()) {
      setError('Nama mata kuliah wajib diisi.');
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await onSubmit({ code: code.trim().toUpperCase(), name: name.trim() });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan mata kuliah.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {isEditing ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah'}
          </Text>
          <Text style={styles.subtitle}>
            Mata kuliah menjadi induk pengelompokan laboratorium praktikum.
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Feather name="x" size={18} color={LaboraColors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color={LaboraColors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Kode Mata Kuliah *</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: IF101"
            placeholderTextColor={LaboraColors.textMuted}
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nama Mata Kuliah *</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Dasar Pemrograman"
            placeholderTextColor={LaboraColors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={busy}>
          <Text style={styles.cancelText}>Batal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, busy && { opacity: 0.7 }]}
          onPress={() => void handleSave()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.saveText}>{isEditing ? 'Simpan' : 'Tambah MK'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(31, 21, 26, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  dialog: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: LaboraColors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: LaboraColors.cardBorder,
    gap: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  subtitle: {
    fontSize: 12.5,
    color: LaboraColors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: LaboraColors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 18,
    gap: 14,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: LaboraColors.dangerSoft,
    borderWidth: 1,
    borderColor: LaboraColors.dangerBorder,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    color: LaboraColors.danger,
    fontWeight: '500',
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: LaboraColors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: LaboraColors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: LaboraColors.textPrimary,
    backgroundColor: LaboraColors.background,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: LaboraColors.cardBorder,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LaboraColors.inputBorder,
  },
  cancelText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: LaboraColors.textSecondary,
  },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: LaboraColors.primary,
    minWidth: 110,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
