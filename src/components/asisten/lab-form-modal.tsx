import React, { useState } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Lab, LabFormInput } from '@/types';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface LabFormModalProps {
  visible: boolean;
  initialData?: Lab | null;
  onClose: () => void;
  onSubmit: (data: LabFormInput) => void | Promise<void>;
}

export function LabFormModal(props: LabFormModalProps) {
  const { visible, initialData, onClose } = props;
  const formKey = `${visible ? 'open' : 'closed'}-${initialData?.id ?? 'new'}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <LabFormContent key={formKey} {...props} />
      </View>
    </Modal>
  );
}

function LabFormContent({ initialData, onClose, onSubmit }: LabFormModalProps) {
  const theme = useTheme();
  const isEditing = !!initialData;

  const [name, setName] = useState(initialData?.name ?? '');
  const [code, setCode] = useState(initialData?.code ?? '');
  const [building, setBuilding] = useState(initialData?.building ?? 'Gedung Fasilkom');
  const [latitude, setLatitude] = useState(
    initialData?.latitude !== undefined ? String(initialData.latitude) : '-6.9175'
  );
  const [longitude, setLongitude] = useState(
    initialData?.longitude !== undefined ? String(initialData.longitude) : '107.6191'
  );
  const [radius, setRadius] = useState(
    initialData?.radius !== undefined ? String(initialData.radius) : '50'
  );
  const [capacity, setCapacity] = useState(
    initialData?.capacity !== undefined ? String(initialData.capacity) : '35'
  );
  const [description, setDescription] = useState(initialData?.description ?? '');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  const handleUseCurrentLocation = async () => {
    try {
      setIsFetchingLocation(true);
      setErrorMsg(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Izin akses lokasi perangkat tidak diberikan.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLatitude(pos.coords.latitude.toFixed(6));
      setLongitude(pos.coords.longitude.toFixed(6));
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengambil koordinat lokasi perangkat.');
    } finally {
      setIsFetchingLocation(false);
    }
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedBuilding = building.trim();

    if (!trimmedName) {
      setErrorMsg('Nama laboratorium wajib diisi.');
      return;
    }

    const lat = Number.parseFloat(latitude);
    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      setErrorMsg('Latitude harus berupa angka valid antara -90 dan 90.');
      return;
    }

    const lng = Number.parseFloat(longitude);
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      setErrorMsg('Longitude harus berupa angka valid antara -180 dan 180.');
      return;
    }

    const rad = Number.parseFloat(radius);
    if (Number.isNaN(rad) || rad <= 0) {
      setErrorMsg('Radius presensi harus berupa angka positif (meter).');
      return;
    }

    const cap = capacity.trim() ? Number.parseInt(capacity, 10) : undefined;
    if (cap !== undefined && (Number.isNaN(cap) || cap <= 0)) {
      setErrorMsg('Kapasitas harus berupa angka positif.');
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        name: trimmedName,
        code: code.trim().toUpperCase() || undefined,
        building: trimmedBuilding || 'Gedung Fasilkom',
        latitude: lat,
        longitude: lng,
        radius: rad,
        capacity: cap,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan data laboratorium.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.dialog}>
      <View style={styles.header}>
        <ThemedText type="smallBold" style={styles.title}>
          {isEditing ? 'Ubah Data Laboratorium' : 'Tambah Laboratorium Baru'}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          SRS-07: Pengelolaan koordinat fisik dan radius geofence presensi
        </ThemedText>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {errorMsg ? (
          <View style={styles.errorBox}>
            <ThemedText style={styles.errorText}>
              {errorMsg}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <ThemedText type="smallBold" style={styles.label}>Nama Laboratorium *</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: '#CBD5E1',
                backgroundColor: theme.background,
                color: theme.text,
              },
            ]}
            placeholder="Contoh: Lab Komputer 1"
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
            <ThemedText type="smallBold" style={styles.label}>Kode Lab (Opsional)</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: '#CBD5E1',
                  backgroundColor: theme.background,
                  color: theme.text,
                },
              ]}
              placeholder="LK-01"
              placeholderTextColor={theme.textSecondary}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1.5 }]}>
            <ThemedText type="smallBold" style={styles.label}>Gedung / Lantai</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: '#CBD5E1',
                  backgroundColor: theme.background,
                  color: theme.text,
                },
              ]}
              placeholder="Gedung Fasilkom Lt. 2"
              placeholderTextColor={theme.textSecondary}
              value={building}
              onChangeText={setBuilding}
            />
          </View>
        </View>

        {/* Tombol Ambil Lokasi Perangkat */}
        <Pressable
          style={({ pressed }) => [
            styles.useLocationBtn,
            {
              backgroundColor: '#EFF6FF',
              borderColor: '#0284C7',
              opacity: pressed || isFetchingLocation ? 0.7 : 1,
            },
          ]}
          onPress={handleUseCurrentLocation}
          disabled={isFetchingLocation}
        >
          {isFetchingLocation ? (
            <ActivityIndicator size="small" color="#0284C7" />
          ) : (
            <ThemedText type="smallBold" style={{ color: '#0284C7' }}>
              📍 Isi Otomatis dengan Lokasi Saat Ini
            </ThemedText>
          )}
        </Pressable>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
            <ThemedText type="smallBold" style={styles.label}>Latitude (-90 s/d 90) *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: '#CBD5E1',
                  backgroundColor: theme.background,
                  color: theme.text,
                },
              ]}
              placeholder="-6.917500"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={latitude}
              onChangeText={setLatitude}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <ThemedText type="smallBold" style={styles.label}>Longitude (-180 s/d 180) *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: '#CBD5E1',
                  backgroundColor: theme.background,
                  color: theme.text,
                },
              ]}
              placeholder="107.619100"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              value={longitude}
              onChangeText={setLongitude}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1, marginRight: 8 }]}>
            <ThemedText type="smallBold" style={styles.label}>Radius Geofence (Meter) *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: '#CBD5E1',
                  backgroundColor: theme.background,
                  color: theme.text,
                },
              ]}
              placeholder="50"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              value={radius}
              onChangeText={setRadius}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <ThemedText type="smallBold" style={styles.label}>Kapasitas Kursi</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: '#CBD5E1',
                  backgroundColor: theme.background,
                  color: theme.text,
                },
              ]}
              placeholder="35"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
              value={capacity}
              onChangeText={setCapacity}
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <ThemedText type="smallBold" style={styles.label}>Deskripsi Fasilitas (Opsional)</ThemedText>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                borderColor: '#CBD5E1',
                backgroundColor: theme.background,
                color: theme.text,
              },
            ]}
            placeholder="Fasilitas PC Core i7, 16GB RAM, Projector, AC..."
            placeholderTextColor={theme.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={2}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [
            styles.cancelButton,
            pressed && { opacity: 0.7 },
          ]}
          onPress={onClose}
          disabled={isSubmitting}
        >
          <ThemedText type="small" themeColor="textSecondary">Batal</ThemedText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            pressed && { opacity: 0.8 },
            isSubmitting && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          <ThemedText type="smallBold" style={styles.submitButtonText}>
            {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah Lab'}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.three,
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
    maxWidth: 520,
    maxHeight: '90%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
      },
    }),
  },
  header: {
    padding: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 18,
  },
  subtitle: {
    marginTop: 2,
  },
  body: {
    padding: Spacing.three,
    maxHeight: 460,
  },
  errorBox: {
    padding: Spacing.two,
    borderRadius: 8,
    marginBottom: Spacing.two,
    backgroundColor: '#FEE2E2',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
  },
  row: {
    flexDirection: 'row',
  },
  fieldGroup: {
    marginBottom: Spacing.two,
  },
  label: {
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  useLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 8,
    marginBottom: Spacing.two,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  submitButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0284C7',
  },
  submitButtonText: {
    color: '#fff',
  },
});
