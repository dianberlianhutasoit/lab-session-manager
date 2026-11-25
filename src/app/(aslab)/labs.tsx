import { Feather } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LaboraTopBar } from '@/components/labora/LaboraTopBar';
import { LaboraColors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useAslab } from '@/features/aslab/aslab-context';
import { AslabCourseFormModal } from '@/features/aslab/components/AslabCourseFormModal';
import { AslabLabFormModal } from '@/features/aslab/components/AslabLabFormModal';
import type { AslabLabFormInput, CourseFormInput } from '@/features/aslab/types';
import type { CourseDoc, LabDoc } from '@/types';

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString('id-ID')}`;
}

export default function AslabLabsScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const {
    courses,
    labs,
    labMembers,
    createCourse,
    updateCourse,
    deleteCourse,
    createLab,
    updateLab,
    deleteLab,
  } = useAslab();

  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>('ALL');

  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseDoc | null>(null);

  const [labModalOpen, setLabModalOpen] = useState(false);
  const [editingLab, setEditingLab] = useState<LabDoc | null>(null);

  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);

  const filteredLabs = useMemo(() => {
    if (selectedCourseFilter === 'ALL') return labs;
    return labs.filter((l) => l.courseId === selectedCourseFilter);
  }, [labs, selectedCourseFilter]);

  const handleSubmitCourse = async (input: CourseFormInput) => {
    if (editingCourse) {
      await updateCourse(editingCourse.id, input);
    } else {
      await createCourse(input);
    }
  };

  const handleConfirmDeleteCourse = (course: CourseDoc) => {
    const runDelete = () => {
      void deleteCourse(course.id);
      if (selectedCourseFilter === course.id) {
        setSelectedCourseFilter('ALL');
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm(`Hapus mata kuliah ${course.code} - ${course.name}?`)) runDelete();
      return;
    }
    Alert.alert('Hapus Mata Kuliah', `Hapus ${course.code} (${course.name})?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: runDelete },
    ]);
  };

  const handleSubmitLab = async (input: AslabLabFormInput) => {
    if (editingLab) {
      await updateLab(editingLab.id, input);
    } else {
      await createLab(input);
    }
  };

  const handleConfirmDeleteLab = (lab: LabDoc) => {
    const runDelete = () => void deleteLab(lab.id);
    if (Platform.OS === 'web') {
      if (window.confirm(`Hapus laboratorium ${lab.name}?`)) runDelete();
      return;
    }
    Alert.alert('Hapus Laboratorium', `Hapus ${lab.name}?`, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Hapus', style: 'destructive', onPress: runDelete },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LaboraTopBar
        title="Lab & Mata Kuliah"
        subtitle="Konfigurasi lokasi GPS, radius, toleransi & denda"
        roleBadge="Aslab"
        onProfilePress={() => void logout()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Section 1: Mata Kuliah (courses) */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Mata Kuliah ({courses.length})</Text>
              <Text style={styles.sectionSub}>Induk pengelompokan lab & bulk insert</Text>
            </View>
            <TouchableOpacity
              style={styles.secondaryAddBtn}
              onPress={() => {
                setEditingCourse(null);
                setCourseModalOpen(true);
              }}
            >
              <Feather name="plus" size={14} color={LaboraColors.primary} />
              <Text style={styles.secondaryAddText}>Tambah MK</Text>
            </TouchableOpacity>
          </View>

          {courses.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada mata kuliah. Tambahkan MK pertama Anda.</Text>
          ) : (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.courseScroll}
            >
              {courses.map((course) => {
                const labCount = labs.filter((l) => l.courseId === course.id).length;
                return (
                  <View key={course.id} style={styles.courseCard}>
                    <View style={styles.courseCardTop}>
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeBadgeText}>{course.code}</Text>
                      </View>
                      <View style={styles.iconActions}>
                        <TouchableOpacity
                          onPress={() => {
                            setEditingCourse(course);
                            setCourseModalOpen(true);
                          }}
                          style={styles.miniIconBtn}
                        >
                          <Feather name="edit-2" size={13} color={LaboraColors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleConfirmDeleteCourse(course)}
                          style={styles.miniIconBtn}
                        >
                          <Feather name="trash-2" size={13} color={LaboraColors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.courseName} numberOfLines={1}>
                      {course.name}
                    </Text>
                    <Text style={styles.courseMeta}>{labCount} laboratorium</Text>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Section 2: Laboratorium (labs) */}
        <View style={styles.labSectionHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Daftar Laboratorium ({filteredLabs.length})</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.mapBtn}
              onPress={() => router.push('/maps' as Href)}
            >
              <Feather name="map" size={14} color={LaboraColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.primaryAddBtn}
              onPress={() => {
                setEditingLab(null);
                setLabModalOpen(true);
              }}
            >
              <Feather name="plus" size={15} color="#FFFFFF" />
              <Text style={styles.primaryAddText}>Tambah Lab</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filter by course */}
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <TouchableOpacity
            style={[styles.filterPill, selectedCourseFilter === 'ALL' && styles.filterPillActive]}
            onPress={() => setSelectedCourseFilter('ALL')}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedCourseFilter === 'ALL' && styles.filterPillTextActive,
              ]}
            >
              Semua ({labs.length})
            </Text>
          </TouchableOpacity>
          {courses.map((c) => {
            const active = selectedCourseFilter === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setSelectedCourseFilter(c.id)}
              >
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {c.code}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Lab Cards */}
        {filteredLabs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="layers" size={28} color={LaboraColors.textMuted} />
            <Text style={styles.emptyCardTitle}>Belum ada laboratorium</Text>
            <Text style={styles.emptyCardSub}>
              Tambah lab satuan atau gunakan tab Bulk Insert untuk membuat banyak lab sekaligus.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredLabs.map((lab) => {
              const course = courseMap.get(lab.courseId);
              const praktikanCount = labMembers.filter(
                (m) => m.labId === lab.id && m.role === 'praktikan'
              ).length;
              const asprakCount = labMembers.filter(
                (m) => m.labId === lab.id && m.role === 'asprak'
              ).length;

              return (
                <View key={lab.id} style={styles.labCard}>
                  <View style={styles.labTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.labCourseTag}>
                        {course ? `${course.code} · ${course.name}` : 'Tanpa Mata Kuliah'}
                      </Text>
                      <Text style={styles.labName}>{lab.name}</Text>
                      <Text style={styles.labBuilding}>
                        {lab.location.name}
                        {lab.location.address && lab.location.address !== lab.location.name
                          ? ` · ${lab.location.address}`
                          : ''}
                      </Text>
                    </View>
                    <View style={styles.iconActions}>
                      <TouchableOpacity
                        style={styles.actionChip}
                        onPress={() => {
                          setEditingLab(lab);
                          setLabModalOpen(true);
                        }}
                      >
                        <Feather name="sliders" size={14} color={LaboraColors.primary} />
                        <Text style={styles.actionChipText}>Atur</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteIconBtn}
                        onPress={() => handleConfirmDeleteLab(lab)}
                      >
                        <Feather name="trash-2" size={14} color={LaboraColors.danger} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Geo & Config Badges */}
                  <View style={styles.configGrid}>
                    <View style={styles.configCell}>
                      <Text style={styles.configLabel}>Geofence</Text>
                      <Text style={styles.configValue}>{lab.radiusMeters} m</Text>
                    </View>
                    <View style={styles.configCell}>
                      <Text style={styles.configLabel}>Toleransi</Text>
                      <Text style={styles.configValue}>
                        {lab.attendanceConfig.gracePeriodMinutes} mnt
                      </Text>
                    </View>
                    <View style={styles.configCell}>
                      <Text style={styles.configLabel}>Denda Telat</Text>
                      <Text style={[styles.configValue, { color: LaboraColors.primary }]}>
                        {formatRupiah(lab.attendanceConfig.lateFineAmount)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.labFooter}>
                    <Text style={styles.coordText}>
                      GPS: {lab.location.latitude.toFixed(5)}, {lab.location.longitude.toFixed(5)}
                    </Text>
                    <Text style={styles.memberCountText}>
                      {praktikanCount} praktikan · {asprakCount} asprak
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <AslabCourseFormModal
        visible={courseModalOpen}
        initialData={editingCourse}
        onClose={() => setCourseModalOpen(false)}
        onSubmit={handleSubmitCourse}
      />

      <AslabLabFormModal
        visible={labModalOpen}
        initialData={editingLab}
        courses={courses}
        onClose={() => setLabModalOpen(false)}
        onSubmit={handleSubmitLab}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LaboraColors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 32,
  },
  sectionCard: {
    backgroundColor: LaboraColors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  sectionSub: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
    marginTop: 1,
  },
  secondaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: LaboraColors.primarySoft,
    borderWidth: 1,
    borderColor: LaboraColors.primaryBorder,
  },
  secondaryAddText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  courseScroll: {
    gap: 10,
  },
  courseCard: {
    width: 196,
    padding: 12,
    borderRadius: 14,
    backgroundColor: LaboraColors.background,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 5,
  },
  courseCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: LaboraColors.primarySoft,
  },
  codeBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  courseName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  courseMeta: {
    fontSize: 11.5,
    color: LaboraColors.textSecondary,
  },
  iconActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  miniIconBtn: {
    padding: 4,
  },
  labSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  mapBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: LaboraColors.surface,
    borderWidth: 1,
    borderColor: LaboraColors.primaryBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: LaboraColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryAddText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterRow: {
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: LaboraColors.surface,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  filterPillActive: {
    backgroundColor: LaboraColors.primary,
    borderColor: LaboraColors.primary,
  },
  filterPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: LaboraColors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 13,
    color: LaboraColors.textSecondary,
  },
  emptyCard: {
    backgroundColor: LaboraColors.surface,
    borderRadius: 18,
    padding: 28,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    alignItems: 'center',
    gap: 8,
  },
  emptyCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  emptyCardSub: {
    fontSize: 12.5,
    color: LaboraColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  labCard: {
    backgroundColor: LaboraColors.surface,
    borderRadius: 18,
    padding: 15,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 12,
  },
  labTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  labCourseTag: {
    fontSize: 11.5,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  labName: {
    fontSize: 16,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
    marginTop: 2,
  },
  labBuilding: {
    fontSize: 12.5,
    color: LaboraColors.textSecondary,
    marginTop: 2,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: LaboraColors.primarySoft,
    borderWidth: 1,
    borderColor: LaboraColors.primaryBorder,
  },
  actionChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  deleteIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: LaboraColors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  configGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  configCell: {
    flex: 1,
    backgroundColor: LaboraColors.background,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  configLabel: {
    fontSize: 11,
    color: LaboraColors.textSecondary,
    fontWeight: '500',
  },
  configValue: {
    fontSize: 13.5,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  labFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: LaboraColors.cardBorder,
  },
  coordText: {
    fontSize: 11.5,
    color: LaboraColors.textMuted,
    fontVariant: ['tabular-nums'],
  },
  memberCountText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: LaboraColors.textSecondary,
  },
});
