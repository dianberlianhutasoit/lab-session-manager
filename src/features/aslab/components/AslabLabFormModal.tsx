import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { LaboraColors } from '@/constants/theme';
import type { CourseDoc, LabDoc } from '@/types';
import type { AslabLabFormInput } from '../types';

interface AslabLabFormModalProps {
  visible: boolean;
  initialData?: LabDoc | null;
  courses: CourseDoc[];
  onClose: () => void;
  onSubmit: (input: AslabLabFormInput) => Promise<void>;
}

export function AslabLabFormModal(props: AslabLabFormModalProps) {
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

function LabFormContent({ initialData, courses, onClose, onSubmit }: AslabLabFormModalProps) {
  const isEditing = Boolean(initialData);

  const [courseId, setCourseId] = useState(
    initialData?.courseId || courses[0]?.id || ''
  );
  const [name, setName] = useState(initialData?.name ?? '');
  const [building, setBuilding] = useState(
    initialData?.location?.name ?? initialData?.building ?? 'Gedung Fasilkom'
  );
  const [address, setAddress] = useState(
    initialData?.location?.address ?? initialData?.building ?? ''
  );
  const [latitude, setLatitude] = useState(
    String(initialData?.location?.latitude ?? initialData?.latitude ?? -6.9175)
  );
  const [longitude, setLongitude] = useState(
    String(initialData?.location?.longitude ?? initialData?.longitude ?? 107.6191)
  );
  const [radiusMeters, setRadiusMeters] = useState(
    String(initialData?.radiusMeters ?? initialData?.radius ?? 30)
  );
  const [gracePeriodMinutes, setGracePeriodMinutes] = useState(
    String(initialData?.attendanceConfig?.gracePeriodMinutes ?? 15)
  );
  const [lateFineAmount, setLateFineAmount] = useState(
    String(initialData?.attendanceConfig?.lateFineAmount ?? 10000)
  );
  const [capacity, setCapacity] = useState(
    initialData?.capacity !== undefined ? String(initialData.capacity) : '35'
  );
  const [description, setDescription] = useState(initialData?.description ?? '');

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [fetchingGps, setFetchingGps] = useState(false);

  const handleFetchGps = async () => {
    try {
      setFetchingGps(true);
      setError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Izin akses lokasi tidak diberikan.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLatitude(pos.coords.latitude.toFixed(6));
      setLongitude(pos.coords.longitude.toFixed(6));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengambil koordinat GPS.');
    } finally {
      setFetchingGps(false);
    }
  };

  const handleSave = async () => {
    if (!courseId && courses.length > 0) {
      setError('Pilih mata kuliah untuk laboratorium ini.');
      return;
    }
    if (!name.trim()) {
      setError('Nama laboratorium wajib diisi.');
      return;
    }
    if (!building.trim()) {
      setError('Nama gedung/ruang wajib diisi.');
      return;
    }

    const lat = Number.parseFloat(latitude);
    const lng = Number.parseFloat(longitude);
    const rad = Number.parseFloat(radiusMeters);
    const grace = Number.parseInt(gracePeriodMinutes, 10);
    const fine = Number.parseInt(lateFineAmount, 10);
    const cap = capacity.trim() ? Number.parseInt(capacity, 10) : undefined;

    if (Number.isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitude harus di antara -90 dan 90.');
      return;
    }
    if (Number.isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitude harus di antara -180 dan 180.');
      return;
    }
    if (Number.isNaN(rad) || rad <= 0) {
      setError('Radius presensi harus lebih besar dari 0 meter.');
      return;
    }
    if (Number.isNaN(grace) || grace < 0) {
      setError('Toleransi keterlambatan minimal 0 menit.');
      return;
    }
    if (Number.isNaN(fine) || fine < 0) {
      setError('Nominal denda keterlambatan tidak boleh negatif.');
      return;
    }
    if (cap !== undefined && (Number.isNaN(cap) || cap <= 0)) {
      setError('Kapasitas kursi harus berupa angka positif.');
      return;
    }

    setError(null);
    setBusy(true);
    try {
      await onSubmit({
        courseId,
        name: name.trim(),
        building: building.trim(),
        address: address.trim() || building.trim(),
        latitude: lat,
        longitude: lng,
        radiusMeters: rad,
        gracePeriodMinutes: grace,
        lateFineAmount: fine,
        capacity: cap,
        description: description.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan laboratorium.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>
            {isEditing ? 'Konfigurasi Laboratorium' : 'Tambah Laboratorium Baru'}
          </Text>
          <Text style={styles.subtitle}>
            Atur koordinat geofence, toleransi keterlambatan, dan nominal denda.
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Feather name="x" size={18} color={LaboraColors.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color={LaboraColors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Course selector */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Mata Kuliah *</Text>
          {courses.length === 0 ? (
            <View style={styles.emptyCourseNote}>
              <Text style={styles.emptyCourseText}>
                Belum ada mata kuliah. Tambahkan mata kuliah terlebih dahulu.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.coursePillRow}
            >
              {courses.map((course) => {
                const selected = course.id === courseId;
                return (
                  <TouchableOpacity
                    key={course.id}
                    style={[styles.coursePill, selected && styles.coursePillActive]}
                    onPress={() => setCourseId(course.id)}
                  >
                    <Text style={[styles.coursePillCode, selected && styles.coursePillTextActive]}>
                      {course.code}
                    </Text>
                    <Text
                      style={[styles.coursePillName, selected && styles.coursePillTextActive]}
                      numberOfLines={1}
                    >
                      {course.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Nama Laboratorium *</Text>
          <TextInput
            style={styles.input}
            placeholder="Contoh: Lab Komputer 1"
            placeholderTextColor={LaboraColors.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Gedung / Lokasi *</Text>
            <TextInput
              style={styles.input}
              placeholder="Gedung Fasilkom Lt. 2"
              placeholderTextColor={LaboraColors.textMuted}
              value={building}
              onChangeText={setBuilding}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Alamat / Ruang</Text>
            <TextInput
              style={styles.input}
              placeholder="Ruang 201"
              placeholderTextColor={LaboraColors.textMuted}
              value={address}
              onChangeText={setAddress}
            />
          </View>
        </View>

        {/* GPS Button */}
        <TouchableOpacity
          style={styles.gpsBtn}
          onPress={() => void handleFetchGps()}
          disabled={fetchingGps}
          activeOpacity={0.8}
        >
          {fetchingGps ? (
            <ActivityIndicator size="small" color={LaboraColors.primary} />
          ) : (
            <>
              <Feather name="crosshair" size={15} color={LaboraColors.primary} />
              <Text style={styles.gpsBtnText}>Isi Otomatis Koordinat GPS Saat Ini</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Latitude *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={latitude}
              onChangeText={setLatitude}
              placeholder="-6.917500"
              placeholderTextColor={LaboraColors.textMuted}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Longitude *</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={longitude}
              onChangeText={setLongitude}
              placeholder="107.619100"
              placeholderTextColor={LaboraColors.textMuted}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Radius Presensi (m) *</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={radiusMeters}
              onChangeText={setRadiusMeters}
              placeholder="30"
              placeholderTextColor={LaboraColors.textMuted}
            />
          </View>
          <View style={[styles.fieldGroup, { flex: 1 }]}>
            <Text style={styles.label}>Kapasitas Kursi</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={capacity}
              onChangeText={setCapacity}
              placeholder="35"
              placeholderTextColor={LaboraColors.textMuted}
            />
          </View>
        </View>

        {/* Sprint 4 Attendance & Fine Config Box */}
        <View style={styles.configCard}>
          <View style={styles.configHeader}>
            <Feather name="clock" size={15} color={LaboraColors.primary} />
            <Text style={styles.configTitle}>Aturan Keterlambatan & Denda</Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Toleransi (Menit) *</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={gracePeriodMinutes}
                onChangeText={setGracePeriodMinutes}
                placeholder="15"
                placeholderTextColor={LaboraColors.textMuted}
              />
            </View>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Nominal Denda (Rp) *</Text>
              <TextInput
                style={styles.input}
                keyboardType="number-pad"
                value={lateFineAmount}
                onChangeText={setLateFineAmount}
                placeholder="10000"
                placeholderTextColor={LaboraColors.textMuted}
              />
            </View>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Deskripsi Fasilitas (Opsional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            multiline
            numberOfLines={2}
            value={description}
            onChangeText={setDescription}
            placeholder="PC Core i7, 16GB RAM, AC, Proyektor..."
            placeholderTextColor={LaboraColors.textMuted}
          />
        </View>
      </ScrollView>

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
            <Text style={styles.saveText}>{isEditing ? 'Simpan Perubahan' : 'Simpan Lab'}</Text>
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
    padding: 16,
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
    maxHeight: 500,
  },
  bodyContent: {
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
    fontSize: 12.5,
    fontWeight: '600',
    color: LaboraColors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: LaboraColors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: LaboraColors.textPrimary,
    backgroundColor: LaboraColors.background,
  },
  textArea: {
    minHeight: 64,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  coursePillRow: {
    gap: 8,
    paddingVertical: 2,
  },
  coursePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LaboraColors.inputBorder,
    backgroundColor: LaboraColors.background,
    maxWidth: 210,
  },
  coursePillActive: {
    backgroundColor: LaboraColors.primary,
    borderColor: LaboraColors.primary,
  },
  coursePillCode: {
    fontSize: 12,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  coursePillName: {
    fontSize: 12.5,
    fontWeight: '500',
    color: LaboraColors.textPrimary,
    flexShrink: 1,
  },
  coursePillTextActive: {
    color: '#FFFFFF',
  },
  emptyCourseNote: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: LaboraColors.warningSoft,
  },
  emptyCourseText: {
    fontSize: 12.5,
    color: '#92400E',
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: LaboraColors.primary,
    backgroundColor: LaboraColors.primarySoft,
  },
  gpsBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: LaboraColors.primary,
  },
  configCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: LaboraColors.primarySoft,
    borderWidth: 1,
    borderColor: LaboraColors.primaryBorder,
    gap: 10,
  },
  configHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  configTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: LaboraColors.primary,
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
    minWidth: 124,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
