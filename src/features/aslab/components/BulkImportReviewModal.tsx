import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LaboraColors } from '@/constants/theme';
import type { User } from '@/types';
import { validateBulkLabRow, validateBulkMemberRow } from '../bulk-import-utils';
import type { BulkImportType, BulkLabRow, BulkMemberRow } from '../types';

interface BulkImportReviewModalProps {
  visible: boolean;
  type: BulkImportType;
  targetLabel: string;
  fileName: string;
  labRows: BulkLabRow[];
  memberRows: BulkMemberRow[];
  users: User[];
  onUpdateLabRows: (rows: BulkLabRow[]) => void;
  onUpdateMemberRows: (rows: BulkMemberRow[]) => void;
  onClose: () => void;
  onCommit: () => Promise<void>;
}

export function BulkImportReviewModal({
  visible,
  type,
  targetLabel,
  fileName,
  labRows,
  memberRows,
  users,
  onUpdateLabRows,
  onUpdateMemberRows,
  onClose,
  onCommit,
}: BulkImportReviewModalProps) {
  const insets = useSafeAreaInsets();
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);

  const isLabMode = type === 'labs';
  const expectedRole: 'praktikan' | 'asprak' = type === 'asprak' ? 'asprak' : 'praktikan';

  const summary = useMemo(() => {
    const rows = isLabMode ? labRows : memberRows;
    const total = rows.length;
    const accepted = rows.filter((r) => r.decision === 'accepted');
    const acceptedValid = accepted.filter((r) => r.errors.length === 0).length;
    const acceptedInvalid = accepted.filter((r) => r.errors.length > 0).length;
    const denied = rows.filter((r) => r.decision === 'denied').length;
    return { total, acceptedCount: accepted.length, acceptedValid, acceptedInvalid, denied };
  }, [isLabMode, labRows, memberRows]);

  const handleLabFieldChange = (
    rowId: string,
    field: keyof Omit<BulkLabRow, 'rowId' | 'rowNumber' | 'decision' | 'errors'>,
    value: string
  ) => {
    onUpdateLabRows(
      labRows.map((row) =>
        row.rowId === rowId ? validateBulkLabRow({ ...row, [field]: value }) : row
      )
    );
  };

  const handleLabDecision = (rowId: string, decision: 'accepted' | 'denied') => {
    onUpdateLabRows(
      labRows.map((row) => (row.rowId === rowId ? { ...row, decision } : row))
    );
  };

  const handleMemberFieldChange = (
    rowId: string,
    field: 'userId' | 'email' | 'nim' | 'name',
    value: string
  ) => {
    onUpdateMemberRows(
      memberRows.map((row) =>
        row.rowId === rowId
          ? validateBulkMemberRow({ ...row, [field]: value }, expectedRole, users)
          : row
      )
    );
  };

  const handleMemberDecision = (rowId: string, decision: 'accepted' | 'denied') => {
    onUpdateMemberRows(
      memberRows.map((row) => (row.rowId === rowId ? { ...row, decision } : row))
    );
  };

  const handleAddEmptyRow = () => {
    if (isLabMode) {
      const nextNum = labRows.length + 2;
      const newRow = validateBulkLabRow({
        rowId: `lab-manual-${Date.now().toString(36)}`,
        rowNumber: nextNum,
        decision: 'accepted',
        name: '',
        building: 'Gedung Fasilkom',
        address: '',
        latitude: '-6.9175',
        longitude: '107.6191',
        radiusMeters: '30',
        gracePeriodMinutes: '15',
        lateFineAmount: '10000',
      });
      onUpdateLabRows([...labRows, newRow]);
    } else {
      const nextNum = memberRows.length + 2;
      const newRow = validateBulkMemberRow(
        {
          rowId: `member-manual-${Date.now().toString(36)}`,
          rowNumber: nextNum,
          decision: 'accepted',
          userId: '',
          email: '',
          nim: '',
          name: '',
        },
        expectedRole,
        users
      );
      onUpdateMemberRows([...memberRows, newRow]);
    }
  };

  const handleAcceptAllValid = () => {
    if (isLabMode) {
      onUpdateLabRows(
        labRows.map((r) => ({ ...r, decision: r.errors.length === 0 ? 'accepted' : 'denied' }))
      );
    } else {
      onUpdateMemberRows(
        memberRows.map((r) => ({
          ...r,
          decision: r.errors.length === 0 ? 'accepted' : 'denied',
        }))
      );
    }
  };

  const handleCommit = async () => {
    if (summary.acceptedInvalid > 0) {
      setCommitError(
        `Masih ada ${summary.acceptedInvalid} baris berstatus Accept yang belum valid. Perbaiki datanya atau ubah ke Deny.`
      );
      return;
    }
    if (summary.acceptedValid === 0) {
      setCommitError('Minimal 1 baris harus berstatus Accept dan valid untuk disimpan.');
      return;
    }

    setCommitError(null);
    setCommitting(true);
    try {
      await onCommit();
      onClose();
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : 'Gagal menyimpan data bulk ke Firestore.');
    } finally {
      setCommitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View
        style={[
          styles.root,
          { paddingTop: Math.max(insets.top, 14), paddingBottom: Math.max(insets.bottom, 12) },
        ]}
      >
        {/* Top Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={LaboraColors.primary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerEyebrow}>REVIEW BULK IMPORT</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {fileName}
            </Text>
            <Text style={styles.headerSub} numberOfLines={1}>
              Target: {targetLabel}
            </Text>
          </View>
        </View>

        {/* Summary & Quick Actions */}
        <View style={styles.summaryBar}>
          <View style={styles.statChip}>
            <Text style={styles.statValue}>{summary.total}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: LaboraColors.successSoft }]}>
            <Text style={[styles.statValue, { color: LaboraColors.successDark }]}>
              {summary.acceptedValid}
            </Text>
            <Text style={[styles.statLabel, { color: LaboraColors.successDark }]}>Siap Simpan</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: LaboraColors.dangerSoft }]}>
            <Text style={[styles.statValue, { color: LaboraColors.danger }]}>
              {summary.acceptedInvalid}
            </Text>
            <Text style={[styles.statLabel, { color: LaboraColors.danger }]}>Perlu Fix</Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: LaboraColors.surfaceMuted }]}>
            <Text style={[styles.statValue, { color: LaboraColors.textSecondary }]}>
              {summary.denied}
            </Text>
            <Text style={styles.statLabel}>Denied</Text>
          </View>
        </View>

        <View style={styles.quickActionRow}>
          <TouchableOpacity style={styles.quickBtn} onPress={handleAcceptAllValid}>
            <Feather name="check-square" size={14} color={LaboraColors.primary} />
            <Text style={styles.quickBtnText}>Accept Valid & Deny Error</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={handleAddEmptyRow}>
            <Feather name="plus" size={14} color={LaboraColors.primary} />
            <Text style={styles.quickBtnText}>Tambah Baris</Text>
          </TouchableOpacity>
        </View>

        {commitError ? (
          <View style={styles.errorBanner}>
            <Feather name="alert-triangle" size={15} color={LaboraColors.danger} />
            <Text style={styles.errorBannerText}>{commitError}</Text>
          </View>
        ) : null}

        {/* Interactive Scrollable Review List */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {isLabMode
            ? labRows.map((row) => {
                const isAccepted = row.decision === 'accepted';
                const hasError = row.errors.length > 0;
                return (
                  <View
                    key={row.rowId}
                    style={[
                      styles.rowCard,
                      !isAccepted && styles.rowCardDenied,
                      isAccepted && hasError && styles.rowCardError,
                    ]}
                  >
                    <View style={styles.rowHeader}>
                      <View style={styles.rowBadgeGroup}>
                        <Text style={styles.rowNumber}>Baris #{row.rowNumber}</Text>
                        <View
                          style={[
                            styles.statusPill,
                            hasError
                              ? { backgroundColor: LaboraColors.dangerSoft }
                              : { backgroundColor: LaboraColors.successSoft },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              { color: hasError ? LaboraColors.danger : LaboraColors.successDark },
                            ]}
                          >
                            {hasError ? `${row.errors.length} Perlu Diisi/Fix` : 'Valid'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.decisionRow}>
                        <TouchableOpacity
                          style={[
                            styles.decisionBtn,
                            isAccepted && styles.acceptBtnActive,
                          ]}
                          onPress={() => handleLabDecision(row.rowId, 'accepted')}
                        >
                          <Feather
                            name="check"
                            size={13}
                            color={isAccepted ? '#FFFFFF' : LaboraColors.successDark}
                          />
                          <Text
                            style={[
                              styles.decisionText,
                              { color: isAccepted ? '#FFFFFF' : LaboraColors.successDark },
                            ]}
                          >
                            Accept
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.decisionBtn,
                            !isAccepted && styles.denyBtnActive,
                          ]}
                          onPress={() => handleLabDecision(row.rowId, 'denied')}
                        >
                          <Feather
                            name="x"
                            size={13}
                            color={!isAccepted ? '#FFFFFF' : LaboraColors.danger}
                          />
                          <Text
                            style={[
                              styles.decisionText,
                              { color: !isAccepted ? '#FFFFFF' : LaboraColors.danger },
                            ]}
                          >
                            Deny
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {hasError ? (
                      <View style={styles.rowErrors}>
                        {row.errors.map((err, i) => (
                          <Text key={i} style={styles.rowErrorLine}>
                            • {err}
                          </Text>
                        ))}
                      </View>
                    ) : null}

                    <View style={styles.gridRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>Nama Lab *</Text>
                        <TextInput
                          style={styles.miniInput}
                          value={row.name}
                          onChangeText={(v) => handleLabFieldChange(row.rowId, 'name', v)}
                          placeholder="Lab Komputer 1"
                          placeholderTextColor={LaboraColors.textMuted}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>Gedung *</Text>
                        <TextInput
                          style={styles.miniInput}
                          value={row.building}
                          onChangeText={(v) => handleLabFieldChange(row.rowId, 'building', v)}
                          placeholder="Gedung Fasilkom"
                          placeholderTextColor={LaboraColors.textMuted}
                        />
                      </View>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>Alamat / Ruang</Text>
                        <TextInput
                          style={styles.miniInput}
                          value={row.address}
                          onChangeText={(v) => handleLabFieldChange(row.rowId, 'address', v)}
                          placeholder="Ruang 201"
                          placeholderTextColor={LaboraColors.textMuted}
                        />
                      </View>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>Latitude *</Text>
                        <TextInput
                          style={styles.miniInput}
                          keyboardType="numeric"
                          value={row.latitude}
                          onChangeText={(v) => handleLabFieldChange(row.rowId, 'latitude', v)}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>Longitude *</Text>
                        <TextInput
                          style={styles.miniInput}
                          keyboardType="numeric"
                          value={row.longitude}
                          onChangeText={(v) => handleLabFieldChange(row.rowId, 'longitude', v)}
                        />
                      </View>
                      <View style={{ flex: 0.8 }}>
                        <Text style={styles.miniLabel}>Radius (m)</Text>
                        <TextInput
                          style={styles.miniInput}
                          keyboardType="number-pad"
                          value={row.radiusMeters}
                          onChangeText={(v) => handleLabFieldChange(row.rowId, 'radiusMeters', v)}
                        />
                      </View>
                    </View>

                    <View style={styles.gridRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>Toleransi (menit)</Text>
                        <TextInput
                          style={styles.miniInput}
                          keyboardType="number-pad"
                          value={row.gracePeriodMinutes}
                          onChangeText={(v) =>
                            handleLabFieldChange(row.rowId, 'gracePeriodMinutes', v)
                          }
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>Denda (Rp)</Text>
                        <TextInput
                          style={styles.miniInput}
                          keyboardType="number-pad"
                          value={row.lateFineAmount}
                          onChangeText={(v) => handleLabFieldChange(row.rowId, 'lateFineAmount', v)}
                        />
                      </View>
                    </View>
                  </View>
                );
              })
            : memberRows.map((row) => {
                const isAccepted = row.decision === 'accepted';
                const hasError = row.errors.length > 0;
                return (
                  <View
                    key={row.rowId}
                    style={[
                      styles.rowCard,
                      !isAccepted && styles.rowCardDenied,
                      isAccepted && hasError && styles.rowCardError,
                    ]}
                  >
                    <View style={styles.rowHeader}>
                      <View style={styles.rowBadgeGroup}>
                        <Text style={styles.rowNumber}>Baris #{row.rowNumber}</Text>
                        <View
                          style={[
                            styles.statusPill,
                            hasError
                              ? { backgroundColor: LaboraColors.dangerSoft }
                              : { backgroundColor: LaboraColors.successSoft },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusPillText,
                              { color: hasError ? LaboraColors.danger : LaboraColors.successDark },
                            ]}
                          >
                            {hasError ? 'Tidak Cocok' : `Cocok: ${row.matchedUserName}`}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.decisionRow}>
                        <TouchableOpacity
                          style={[styles.decisionBtn, isAccepted && styles.acceptBtnActive]}
                          onPress={() => handleMemberDecision(row.rowId, 'accepted')}
                        >
                          <Feather
                            name="check"
                            size={13}
                            color={isAccepted ? '#FFFFFF' : LaboraColors.successDark}
                          />
                          <Text
                            style={[
                              styles.decisionText,
                              { color: isAccepted ? '#FFFFFF' : LaboraColors.successDark },
                            ]}
                          >
                            Accept
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.decisionBtn, !isAccepted && styles.denyBtnActive]}
                          onPress={() => handleMemberDecision(row.rowId, 'denied')}
                        >
                          <Feather
                            name="x"
                            size={13}
                            color={!isAccepted ? '#FFFFFF' : LaboraColors.danger}
                          />
                          <Text
                            style={[
                              styles.decisionText,
                              { color: !isAccepted ? '#FFFFFF' : LaboraColors.danger },
                            ]}
                          >
                            Deny
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {hasError ? (
                      <View style={styles.rowErrors}>
                        {row.errors.map((err, i) => (
                          <Text key={i} style={styles.rowErrorLine}>
                            • {err}
                          </Text>
                        ))}
                      </View>
                    ) : null}

                    <View style={styles.gridRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>Email Akun</Text>
                        <TextInput
                          style={styles.miniInput}
                          value={row.email}
                          onChangeText={(v) => handleMemberFieldChange(row.rowId, 'email', v)}
                          placeholder="user@test.com"
                          placeholderTextColor={LaboraColors.textMuted}
                          autoCapitalize="none"
                        />
                      </View>
                      {expectedRole === 'praktikan' ? (
                        <View style={{ flex: 0.85 }}>
                          <Text style={styles.miniLabel}>NIM</Text>
                          <TextInput
                            style={styles.miniInput}
                            value={row.nim}
                            onChangeText={(v) => handleMemberFieldChange(row.rowId, 'nim', v)}
                            placeholder="2110511001"
                            placeholderTextColor={LaboraColors.textMuted}
                          />
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.gridRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>User ID (Opsional)</Text>
                        <TextInput
                          style={styles.miniInput}
                          value={row.userId}
                          onChangeText={(v) => handleMemberFieldChange(row.rowId, 'userId', v)}
                          placeholder="user-mhs-1"
                          placeholderTextColor={LaboraColors.textMuted}
                          autoCapitalize="none"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.miniLabel}>Nama Referensi</Text>
                        <TextInput
                          style={styles.miniInput}
                          value={row.name}
                          onChangeText={(v) => handleMemberFieldChange(row.rowId, 'name', v)}
                          placeholder="Nama lengkap"
                          placeholderTextColor={LaboraColors.textMuted}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
        </ScrollView>

        {/* Sticky Commit Footer */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={committing}>
            <Text style={styles.cancelText}>Tutup</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.commitBtn,
              (committing || summary.acceptedValid === 0 || summary.acceptedInvalid > 0) && {
                opacity: 0.6,
              },
            ]}
            onPress={() => void handleCommit()}
            disabled={committing}
          >
            {committing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="upload-cloud" size={16} color="#FFFFFF" />
                <Text style={styles.commitText}>
                  Simpan {summary.acceptedValid} Baris ke Firestore
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LaboraColors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: LaboraColors.cardBorder,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: LaboraColors.surface,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEyebrow: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.8,
    color: LaboraColors.primaryLight,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  headerSub: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
  },
  summaryBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  statChip: {
    flex: 1,
    backgroundColor: LaboraColors.surface,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: LaboraColors.textSecondary,
  },
  quickActionRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  quickBtn: {
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
  quickBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: LaboraColors.primary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: LaboraColors.dangerSoft,
    borderWidth: 1,
    borderColor: LaboraColors.dangerBorder,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: LaboraColors.danger,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  rowCard: {
    backgroundColor: LaboraColors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 10,
  },
  rowCardDenied: {
    opacity: 0.55,
    backgroundColor: LaboraColors.surfaceMuted,
  },
  rowCardError: {
    borderColor: LaboraColors.dangerBorder,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  rowBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  rowNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  decisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: LaboraColors.inputBorder,
    backgroundColor: LaboraColors.surface,
  },
  acceptBtnActive: {
    backgroundColor: LaboraColors.successDark,
    borderColor: LaboraColors.successDark,
  },
  denyBtnActive: {
    backgroundColor: LaboraColors.danger,
    borderColor: LaboraColors.danger,
  },
  decisionText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  rowErrors: {
    backgroundColor: LaboraColors.dangerSoft,
    padding: 9,
    borderRadius: 10,
    gap: 2,
  },
  rowErrorLine: {
    fontSize: 11.5,
    color: LaboraColors.danger,
    fontWeight: '500',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 8,
  },
  miniLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: LaboraColors.textSecondary,
    marginBottom: 4,
  },
  miniInput: {
    borderWidth: 1,
    borderColor: LaboraColors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 13,
    color: LaboraColors.textPrimary,
    backgroundColor: LaboraColors.background,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: LaboraColors.cardBorder,
    backgroundColor: LaboraColors.surface,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LaboraColors.inputBorder,
  },
  cancelText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: LaboraColors.textSecondary,
  },
  commitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: LaboraColors.primary,
  },
  commitText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
