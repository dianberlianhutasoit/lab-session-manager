import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import {
  downloadBulkTemplate,
  getTemplateSpec,
  parseLabRowsFromRecords,
  parseMemberRowsFromRecords,
  parseSampleRecordsForPreview,
  pickAndParseSpreadsheetFile,
} from '@/features/aslab/bulk-import-utils';
import { BulkImportReviewModal } from '@/features/aslab/components/BulkImportReviewModal';
import type {
  BulkImportType,
  BulkLabRow,
  BulkMemberRow,
  BulkTemplateFormat,
} from '@/features/aslab/types';

function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function AslabBulkInsertScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { courses, labs, users, bulkCreateLabs, bulkAssignMembers } = useAslab();

  // Separate target selection for each of the 3 bulk operations
  const [bulk1CourseId, setBulk1CourseId] = useState<string>('');
  const [bulk2LabId, setBulk2LabId] = useState<string>('');
  const [bulk3LabId, setBulk3LabId] = useState<string>('');

  const [busyAction, setBusyAction] = useState<string | null>(null);

  // Review screen modal state
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewType, setReviewType] = useState<BulkImportType>('labs');
  const [reviewTargetId, setReviewTargetId] = useState<string>('');
  const [reviewTargetLabel, setReviewTargetLabel] = useState<string>('');
  const [reviewFileName, setReviewFileName] = useState<string>('');
  const [reviewLabRows, setReviewLabRows] = useState<BulkLabRow[]>([]);
  const [reviewMemberRows, setReviewMemberRows] = useState<BulkMemberRow[]>([]);

  const effectiveBulk1CourseId = useMemo(
    () => (bulk1CourseId && courses.some((c) => c.id === bulk1CourseId) ? bulk1CourseId : courses[0]?.id ?? ''),
    [bulk1CourseId, courses]
  );
  const effectiveBulk2LabId = useMemo(
    () => (bulk2LabId && labs.some((l) => l.id === bulk2LabId) ? bulk2LabId : labs[0]?.id ?? ''),
    [bulk2LabId, labs]
  );
  const effectiveBulk3LabId = useMemo(
    () => (bulk3LabId && labs.some((l) => l.id === bulk3LabId) ? bulk3LabId : labs[0]?.id ?? ''),
    [bulk3LabId, labs]
  );

  const handleDownloadTemplate = async (type: BulkImportType, format: BulkTemplateFormat) => {
    const key = `dl-${type}-${format}`;
    setBusyAction(key);
    try {
      const { fileName } = await downloadBulkTemplate(type, format);
      notify('Template Siap', `File ${fileName} berhasil dibuat.`);
    } catch (err) {
      notify('Gagal Mengunduh Template', err instanceof Error ? err.message : 'Terjadi kendala.');
    } finally {
      setBusyAction(null);
    }
  };

  const openReviewWithRecords = (
    type: BulkImportType,
    fileName: string,
    records: Record<string, unknown>[]
  ) => {
    if (records.length === 0) {
      notify('File Kosong', 'Tidak ada baris data yang ditemukan pada file tersebut.');
      return;
    }

    if (type === 'labs') {
      const targetCourse = courses.find((c) => c.id === effectiveBulk1CourseId);
      if (!targetCourse) {
        notify('Mata Kuliah Belum Ada', 'Tambahkan minimal 1 mata kuliah di tab Lab & MK dulu.');
        return;
      }
      setReviewType('labs');
      setReviewTargetId(targetCourse.id);
      setReviewTargetLabel(`${targetCourse.code} — ${targetCourse.name}`);
      setReviewFileName(fileName);
      setReviewLabRows(parseLabRowsFromRecords(records));
      setReviewMemberRows([]);
      setReviewVisible(true);
      return;
    }

    const labId = type === 'praktikan' ? effectiveBulk2LabId : effectiveBulk3LabId;
    const targetLab = labs.find((l) => l.id === labId);
    if (!targetLab) {
      notify('Lab Belum Ada', 'Tambahkan minimal 1 laboratorium di tab Lab & MK dulu.');
      return;
    }

    setReviewType(type);
    setReviewTargetId(targetLab.id);
    setReviewTargetLabel(`${targetLab.name} (${type === 'asprak' ? 'Asprak' : 'Praktikan'})`);
    setReviewFileName(fileName);
    setReviewLabRows([]);
    setReviewMemberRows(parseMemberRowsFromRecords(records, type, users));
    setReviewVisible(true);
  };

  const handlePickFile = async (type: BulkImportType) => {
    const key = `pick-${type}`;
    setBusyAction(key);
    try {
      const parsed = await pickAndParseSpreadsheetFile();
      if (!parsed) return;
      openReviewWithRecords(type, parsed.fileName, parsed.records);
    } catch (err) {
      notify(
        'Gagal Membaca File',
        err instanceof Error
          ? err.message
          : 'Pastikan format file adalah .csv atau .xlsx yang valid.'
      );
    } finally {
      setBusyAction(null);
    }
  };

  const handleLoadSampleToReview = (type: BulkImportType) => {
    const spec = getTemplateSpec(type);
    const records = parseSampleRecordsForPreview(type);
    openReviewWithRecords(type, `${spec.baseFileName}.csv (Contoh)`, records);
  };

  const handleCommitBulk = async () => {
    if (reviewType === 'labs') {
      const acceptedLabs = reviewLabRows.filter((r) => r.decision === 'accepted');
      await bulkCreateLabs(
        reviewTargetId,
        acceptedLabs.map((r) => ({
          name: r.name.trim(),
          building: r.building.trim(),
          address: r.address.trim() || r.building.trim(),
          latitude: Number.parseFloat(r.latitude),
          longitude: Number.parseFloat(r.longitude),
          radiusMeters: Number.parseFloat(r.radiusMeters),
          gracePeriodMinutes: Number.parseInt(r.gracePeriodMinutes, 10),
          lateFineAmount: Number.parseInt(r.lateFineAmount, 10),
        }))
      );
      notify(
        'Bulk Lab Berhasil',
        `${acceptedLabs.length} laboratorium berhasil disimpan ke Firestore.`
      );
      return;
    }

    const acceptedMembers = reviewMemberRows.filter(
      (r) => r.decision === 'accepted' && r.matchedUserId
    );
    const userIds = acceptedMembers
      .map((r) => r.matchedUserId)
      .filter((id): id is string => Boolean(id));

    await bulkAssignMembers(reviewTargetId, reviewType, userIds);
    notify(
      'Bulk Alokasi Berhasil',
      `${userIds.length} ${reviewType === 'asprak' ? 'Asprak' : 'Praktikan'} berhasil dialokasikan.`
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LaboraTopBar
        title="Bulk Insert"
        subtitle="Import CSV / XLSX dengan Review Screen interaktif"
        roleBadge="Aslab"
        onProfilePress={() => void logout()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* BULK 1: Pembuatan Lab sekaligus berdasarkan 1 Mata Kuliah */}
        <View style={styles.bulkCard}>
          <View style={styles.bulkHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>BULK 1</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bulkTitle}>Pembuatan Lab per Mata Kuliah</Text>
              <Text style={styles.bulkDesc}>
                Buat banyak laboratorium sekaligus beserta koordinat GPS, radius, toleransi, dan
                denda untuk satu mata kuliah.
              </Text>
            </View>
          </View>

          <Text style={styles.selectorLabel}>Pilih Mata Kuliah Target</Text>
          {courses.length === 0 ? (
            <Text style={styles.warnText}>Belum ada mata kuliah. Tambahkan MK di tab Lab & MK.</Text>
          ) : (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {courses.map((c) => {
                const active = c.id === effectiveBulk1CourseId;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.targetPill, active && styles.targetPillActive]}
                    onPress={() => setBulk1CourseId(c.id)}
                  >
                    <Text style={[styles.targetPillText, active && styles.targetPillTextActive]}>
                      {c.code} · {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <Text style={styles.columnsHint}>
            Kolom: {getTemplateSpec('labs').headers.join(', ')}
          </Text>

          <View style={styles.templateRow}>
            <TouchableOpacity
              style={styles.templateBtn}
              onPress={() => void handleDownloadTemplate('labs', 'csv')}
              disabled={busyAction !== null}
            >
              {busyAction === 'dl-labs-csv' ? (
                <ActivityIndicator size="small" color={LaboraColors.primary} />
              ) : (
                <>
                  <Feather name="download" size={14} color={LaboraColors.primary} />
                  <Text style={styles.templateBtnText}>Template CSV</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.templateBtn}
              onPress={() => void handleDownloadTemplate('labs', 'xlsx')}
              disabled={busyAction !== null}
            >
              {busyAction === 'dl-labs-xlsx' ? (
                <ActivityIndicator size="small" color={LaboraColors.primary} />
              ) : (
                <>
                  <Feather name="file-text" size={14} color={LaboraColors.primary} />
                  <Text style={styles.templateBtnText}>Template XLSX</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.uploadRow}>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => void handlePickFile('labs')}
              disabled={busyAction !== null}
            >
              {busyAction === 'pick-labs' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="upload" size={15} color="#FFFFFF" />
                  <Text style={styles.uploadBtnText}>Upload CSV / XLSX</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sampleBtn}
              onPress={() => handleLoadSampleToReview('labs')}
            >
              <Text style={styles.sampleBtnText}>Uji Contoh</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* BULK 2: Alokasi Praktikan ke Lab tertentu */}
        <View style={styles.bulkCard}>
          <View style={styles.bulkHeader}>
            <View style={[styles.stepBadge, { backgroundColor: LaboraColors.rolePraktikanBg }]}>
              <Text style={[styles.stepBadgeText, { color: LaboraColors.rolePraktikanText }]}>
                BULK 2
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bulkTitle}>Alokasi Praktikan ke Lab</Text>
              <Text style={styles.bulkDesc}>
                Masukkan banyak mahasiswa praktikan sekaligus ke satu laboratorium target melalui
                pencocokan email, NIM, atau User ID.
              </Text>
            </View>
          </View>

          <Text style={styles.selectorLabel}>Pilih Lab Target</Text>
          {labs.length === 0 ? (
            <Text style={styles.warnText}>Belum ada laboratorium. Tambahkan lab terlebih dahulu.</Text>
          ) : (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {labs.map((l) => {
                const active = l.id === effectiveBulk2LabId;
                return (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.targetPill, active && styles.targetPillActive]}
                    onPress={() => setBulk2LabId(l.id)}
                  >
                    <Text style={[styles.targetPillText, active && styles.targetPillTextActive]}>
                      {l.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <Text style={styles.columnsHint}>
            Kolom: {getTemplateSpec('praktikan').headers.join(', ')}
          </Text>

          <View style={styles.templateRow}>
            <TouchableOpacity
              style={styles.templateBtn}
              onPress={() => void handleDownloadTemplate('praktikan', 'csv')}
              disabled={busyAction !== null}
            >
              {busyAction === 'dl-praktikan-csv' ? (
                <ActivityIndicator size="small" color={LaboraColors.primary} />
              ) : (
                <>
                  <Feather name="download" size={14} color={LaboraColors.primary} />
                  <Text style={styles.templateBtnText}>Template CSV</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.templateBtn}
              onPress={() => void handleDownloadTemplate('praktikan', 'xlsx')}
              disabled={busyAction !== null}
            >
              {busyAction === 'dl-praktikan-xlsx' ? (
                <ActivityIndicator size="small" color={LaboraColors.primary} />
              ) : (
                <>
                  <Feather name="file-text" size={14} color={LaboraColors.primary} />
                  <Text style={styles.templateBtnText}>Template XLSX</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.uploadRow}>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => void handlePickFile('praktikan')}
              disabled={busyAction !== null}
            >
              {busyAction === 'pick-praktikan' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="upload" size={15} color="#FFFFFF" />
                  <Text style={styles.uploadBtnText}>Upload CSV / XLSX</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sampleBtn}
              onPress={() => handleLoadSampleToReview('praktikan')}
            >
              <Text style={styles.sampleBtnText}>Uji Contoh</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* BULK 3: Alokasi Asprak ke Lab tertentu */}
        <View style={styles.bulkCard}>
          <View style={styles.bulkHeader}>
            <View style={[styles.stepBadge, { backgroundColor: LaboraColors.infoSoft }]}>
              <Text style={[styles.stepBadgeText, { color: LaboraColors.info }]}>BULK 3</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bulkTitle}>Alokasi Asprak ke Lab</Text>
              <Text style={styles.bulkDesc}>
                Tugaskan beberapa Asisten Praktikum sekaligus ke laboratorium pilihan dengan
                validasi role otomatis sebelum disimpan.
              </Text>
            </View>
          </View>

          <Text style={styles.selectorLabel}>Pilih Lab Target</Text>
          {labs.length === 0 ? (
            <Text style={styles.warnText}>Belum ada laboratorium. Tambahkan lab terlebih dahulu.</Text>
          ) : (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pillRow}
            >
              {labs.map((l) => {
                const active = l.id === effectiveBulk3LabId;
                return (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.targetPill, active && styles.targetPillActive]}
                    onPress={() => setBulk3LabId(l.id)}
                  >
                    <Text style={[styles.targetPillText, active && styles.targetPillTextActive]}>
                      {l.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <Text style={styles.columnsHint}>
            Kolom: {getTemplateSpec('asprak').headers.join(', ')}
          </Text>

          <View style={styles.templateRow}>
            <TouchableOpacity
              style={styles.templateBtn}
              onPress={() => void handleDownloadTemplate('asprak', 'csv')}
              disabled={busyAction !== null}
            >
              {busyAction === 'dl-asprak-csv' ? (
                <ActivityIndicator size="small" color={LaboraColors.primary} />
              ) : (
                <>
                  <Feather name="download" size={14} color={LaboraColors.primary} />
                  <Text style={styles.templateBtnText}>Template CSV</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.templateBtn}
              onPress={() => void handleDownloadTemplate('asprak', 'xlsx')}
              disabled={busyAction !== null}
            >
              {busyAction === 'dl-asprak-xlsx' ? (
                <ActivityIndicator size="small" color={LaboraColors.primary} />
              ) : (
                <>
                  <Feather name="file-text" size={14} color={LaboraColors.primary} />
                  <Text style={styles.templateBtnText}>Template XLSX</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.uploadRow}>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => void handlePickFile('asprak')}
              disabled={busyAction !== null}
            >
              {busyAction === 'pick-asprak' ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Feather name="upload" size={15} color="#FFFFFF" />
                  <Text style={styles.uploadBtnText}>Upload CSV / XLSX</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sampleBtn}
              onPress={() => handleLoadSampleToReview('asprak')}
            >
              <Text style={styles.sampleBtnText}>Uji Contoh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <BulkImportReviewModal
        visible={reviewVisible}
        type={reviewType}
        targetLabel={reviewTargetLabel}
        fileName={reviewFileName}
        labRows={reviewLabRows}
        memberRows={reviewMemberRows}
        users={users}
        onUpdateLabRows={setReviewLabRows}
        onUpdateMemberRows={setReviewMemberRows}
        onClose={() => setReviewVisible(false)}
        onCommit={handleCommitBulk}
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
  bulkCard: {
    backgroundColor: LaboraColors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 11,
  },
  bulkHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: LaboraColors.primarySoft,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: LaboraColors.primary,
  },
  bulkTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  bulkDesc: {
    fontSize: 12.5,
    color: LaboraColors.textSecondary,
    marginTop: 2,
    lineHeight: 17.5,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  warnText: {
    fontSize: 12,
    color: LaboraColors.danger,
  },
  pillRow: {
    gap: 8,
  },
  targetPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: LaboraColors.background,
    borderWidth: 1,
    borderColor: LaboraColors.inputBorder,
  },
  targetPillActive: {
    backgroundColor: LaboraColors.primary,
    borderColor: LaboraColors.primary,
  },
  targetPillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: LaboraColors.textPrimary,
  },
  targetPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  columnsHint: {
    fontSize: 11.5,
    color: LaboraColors.textMuted,
  },
  templateRow: {
    flexDirection: 'row',
    gap: 8,
  },
  templateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: LaboraColors.primarySoft,
    borderWidth: 1,
    borderColor: LaboraColors.primaryBorder,
  },
  templateBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 8,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: LaboraColors.primary,
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sampleBtn: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LaboraColors.inputBorder,
    backgroundColor: LaboraColors.background,
    justifyContent: 'center',
  },
  sampleBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: LaboraColors.textSecondary,
  },
});
