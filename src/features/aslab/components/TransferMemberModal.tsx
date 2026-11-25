import { Feather } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { LaboraColors } from '@/constants/theme';
import type { LabDoc, LabMemberDoc, User } from '@/types';

interface TransferMemberModalProps {
  visible: boolean;
  member: LabMemberDoc | null;
  user: User | null;
  sourceLab: LabDoc | null;
  targetLabs: LabDoc[];
  onClose: () => void;
  onConfirmTransfer: (toLabId: string) => Promise<void>;
}

export function TransferMemberModal(props: TransferMemberModalProps) {
  const { visible, member, onClose } = props;
  const key = `${visible ? 'open' : 'closed'}-${member?.id ?? 'none'}`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <TransferModalContent key={key} {...props} />
      </View>
    </Modal>
  );
}

function TransferModalContent({
  member,
  user,
  sourceLab,
  targetLabs,
  onClose,
  onConfirmTransfer,
}: TransferMemberModalProps) {
  const [selectedLabId, setSelectedLabId] = useState<string>(targetLabs[0]?.id ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    if (!selectedLabId) {
      setError('Pilih laboratorium tujuan terlebih dahulu.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onConfirmTransfer(selectedLabId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memindahkan anggota.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.dialog}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Pindahkan Anggota Lab</Text>
          <Text style={styles.subtitle}>
            Pindahkan {member?.role === 'asprak' ? 'Asprak' : 'Praktikan'} ke laboratorium lain.
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Feather name="x" size={18} color={LaboraColors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.memberCard}>
          <View style={styles.memberAvatar}>
            <Text style={styles.memberAvatarText}>
              {(user?.name ?? 'U').trim().charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{user?.name ?? member?.userId}</Text>
            <Text style={styles.memberMeta}>
              {user?.email ?? '-'} {user?.nim ? `· NIM ${user.nim}` : ''}
            </Text>
            <Text style={styles.sourceLabel}>
              Lab Asal: <Text style={styles.sourceLabName}>{sourceLab?.name ?? '-'}</Text>
            </Text>
          </View>
        </View>

        <View style={styles.noticeBox}>
          <Feather name="info" size={15} color={LaboraColors.info} />
          <Text style={styles.noticeText}>
            Hanya alokasi keanggotaan lab yang dipindahkan. Jadwal dan riwayat sesi praktikum pada
            lab asal tidak ikut berpindah.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={14} color={LaboraColors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionLabel}>Pilih Laboratorium Tujuan</Text>
        {targetLabs.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Belum ada laboratorium lain yang tersedia sebagai tujuan pemindahan.
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.labList} contentContainerStyle={{ gap: 8 }}>
            {targetLabs.map((lab) => {
              const selected = lab.id === selectedLabId;
              return (
                <TouchableOpacity
                  key={lab.id}
                  style={[styles.labOption, selected && styles.labOptionActive]}
                  onPress={() => setSelectedLabId(lab.id)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radio, selected && styles.radioActive]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.labName, selected && styles.labNameActive]}>
                      {lab.name}
                    </Text>
                    <Text style={styles.labMeta}>
                      {lab.location.name} · Radius {lab.radiusMeters}m
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={busy}>
          <Text style={styles.cancelText}>Batal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.confirmBtn,
            (busy || targetLabs.length === 0) && { opacity: 0.6 },
          ]}
          onPress={() => void handleConfirm()}
          disabled={busy || targetLabs.length === 0}
        >
          {busy ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Feather name="shuffle" size={14} color="#FFFFFF" />
              <Text style={styles.confirmText}>Pindahkan Sekarang</Text>
            </>
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
    padding: 18,
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
    maxHeight: '85%',
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
    gap: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: LaboraColors.background,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: LaboraColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  memberName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  memberMeta: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
  },
  sourceLabel: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
    marginTop: 2,
  },
  sourceLabName: {
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 11,
    borderRadius: 12,
    backgroundColor: LaboraColors.infoSoft,
    borderWidth: 1,
    borderColor: LaboraColors.infoBorder,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    backgroundColor: LaboraColors.dangerSoft,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    color: LaboraColors.danger,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  labList: {
    maxHeight: 220,
  },
  labOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LaboraColors.inputBorder,
    backgroundColor: LaboraColors.background,
  },
  labOptionActive: {
    borderColor: LaboraColors.primary,
    backgroundColor: LaboraColors.primarySoft,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: LaboraColors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: LaboraColors.primary,
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: LaboraColors.primary,
  },
  labName: {
    fontSize: 14,
    fontWeight: '600',
    color: LaboraColors.textPrimary,
  },
  labNameActive: {
    color: LaboraColors.primary,
    fontWeight: '700',
  },
  labMeta: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
    marginTop: 2,
  },
  emptyBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: LaboraColors.surfaceMuted,
  },
  emptyText: {
    fontSize: 12.5,
    color: LaboraColors.textSecondary,
    textAlign: 'center',
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
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: LaboraColors.primary,
  },
  confirmText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
