import { Feather } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LaboraTopBar } from '@/components/labora/LaboraTopBar';
import { LaboraColors } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useAslab } from '@/features/aslab/aslab-context';
import { TransferMemberModal } from '@/features/aslab/components/TransferMemberModal';
import type { LabMemberDoc, User } from '@/types';

type RoleFilter = 'ALL' | 'praktikan' | 'asprak';

export default function AslabMembersScreen() {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const { labs, labMembers, users, assignMember, removeMember, transferMember } = useAslab();

  const [selectedLabId, setSelectedLabId] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddPicker, setShowAddPicker] = useState(false);

  const [transferTarget, setTransferTarget] = useState<LabMemberDoc | null>(null);

  const effectiveLabId = useMemo(() => {
    if (selectedLabId && labs.some((l) => l.id === selectedLabId)) return selectedLabId;
    return labs[0]?.id ?? '';
  }, [labs, selectedLabId]);

  const activeLab = useMemo(
    () => labs.find((l) => l.id === effectiveLabId) ?? null,
    [labs, effectiveLabId]
  );

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const membersInActiveLab = useMemo(
    () => labMembers.filter((m) => m.labId === effectiveLabId),
    [labMembers, effectiveLabId]
  );

  const memberUserIds = useMemo(
    () => new Set(membersInActiveLab.map((m) => m.userId)),
    [membersInActiveLab]
  );

  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return membersInActiveLab.filter((member) => {
      if (roleFilter !== 'ALL' && member.role !== roleFilter) return false;
      if (!q) return true;
      const u = userMap.get(member.userId);
      return (
        (u?.name ?? '').toLowerCase().includes(q) ||
        (u?.email ?? '').toLowerCase().includes(q) ||
        (u?.nim ?? '').toLowerCase().includes(q) ||
        member.userId.toLowerCase().includes(q)
      );
    });
  }, [membersInActiveLab, roleFilter, searchQuery, userMap]);

  const candidateUsersToAdd = useMemo(() => {
    return users.filter(
      (u) => (u.role === 'praktikan' || u.role === 'asprak') && !memberUserIds.has(u.id)
    );
  }, [users, memberUserIds]);

  const otherLabs = useMemo(
    () => labs.filter((l) => l.id !== effectiveLabId),
    [labs, effectiveLabId]
  );

  const handleAddSingle = async (user: User) => {
    if (!effectiveLabId) return;
    const memberRole: 'praktikan' | 'asprak' = user.role === 'asprak' ? 'asprak' : 'praktikan';
    await assignMember(effectiveLabId, user.id, memberRole);
  };

  const handleConfirmRemove = (member: LabMemberDoc) => {
    const u = userMap.get(member.userId);
    const run = () => void removeMember(member.labId, member.userId);
    if (Platform.OS === 'web') {
      if (window.confirm(`Keluarkan ${u?.name ?? member.userId} dari ${activeLab?.name}?`)) run();
      return;
    }
    Alert.alert(
      'Keluarkan Anggota',
      `Keluarkan ${u?.name ?? member.userId} dari ${activeLab?.name ?? 'lab ini'}?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Keluarkan', style: 'destructive', onPress: run },
      ]
    );
  };

  const handleTransferConfirm = async (toLabId: string) => {
    if (!transferTarget) return;
    await transferMember({
      fromLabId: transferTarget.labId,
      toLabId,
      userId: transferTarget.userId,
      role: transferTarget.role,
    });
    const toLab = labs.find((l) => l.id === toLabId);
    const u = userMap.get(transferTarget.userId);
    const msg = `${u?.name ?? transferTarget.userId} berhasil dipindahkan ke ${toLab?.name ?? toLabId}. Jadwal praktikum tidak ikut berpindah.`;
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('Pemindahan Berhasil', msg);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LaboraTopBar
        title="Anggota Lab"
        subtitle="Alokasi & pemindahan Praktikan serta Asprak"
        roleBadge="Aslab"
        onProfilePress={() => void logout()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Pilih Lab */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionLabel}>Pilih Laboratorium</Text>
          {labs.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptySub}>
                Belum ada laboratorium. Buat lab terlebih dahulu di tab Lab & MK.
              </Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.labPillRow}
            >
              {labs.map((lab) => {
                const selected = lab.id === effectiveLabId;
                const count = labMembers.filter((m) => m.labId === lab.id).length;
                return (
                  <TouchableOpacity
                    key={lab.id}
                    style={[styles.labPill, selected && styles.labPillActive]}
                    onPress={() => setSelectedLabId(lab.id)}
                  >
                    <Text style={[styles.labPillName, selected && styles.labPillTextActive]}>
                      {lab.name}
                    </Text>
                    <View style={[styles.countChip, selected && styles.countChipActive]}>
                      <Text style={[styles.countChipText, selected && { color: '#FFFFFF' }]}>
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {activeLab ? (
          <>
            {/* Search & Add Button */}
            <View style={styles.toolbarRow}>
              <View style={styles.searchBox}>
                <Feather name="search" size={15} color={LaboraColors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Cari nama, email, NIM..."
                  placeholderTextColor={LaboraColors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setShowAddPicker((prev) => !prev)}
              >
                <Feather name={showAddPicker ? 'chevron-up' : 'user-plus'} size={15} color="#FFFFFF" />
                <Text style={styles.addBtnText}>Alokasi</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Single Member Assign Panel */}
            {showAddPicker ? (
              <View style={styles.pickerCard}>
                <Text style={styles.pickerTitle}>
                  Tambahkan Anggota ke {activeLab.name}
                </Text>
                {candidateUsersToAdd.length === 0 ? (
                  <Text style={styles.emptySub}>
                    Semua pengguna praktikan & asprak sudah dialokasikan ke lab ini.
                  </Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {candidateUsersToAdd.map((u) => (
                      <View key={u.id} style={styles.candidateRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.memberName}>{u.name}</Text>
                          <Text style={styles.memberMeta}>
                            {u.role.toUpperCase()} · {u.email}
                            {u.nim ? ` · ${u.nim}` : ''}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.assignSmallBtn}
                          onPress={() => void handleAddSingle(u)}
                        >
                          <Feather name="plus" size={14} color={LaboraColors.primary} />
                          <Text style={styles.assignSmallText}>Tambah</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : null}

            {/* Role Filter Tabs */}
            <View style={styles.roleTabBar}>
              {(
                [
                  { key: 'ALL', label: `Semua (${membersInActiveLab.length})` },
                  {
                    key: 'praktikan',
                    label: `Praktikan (${membersInActiveLab.filter((m) => m.role === 'praktikan').length})`,
                  },
                  {
                    key: 'asprak',
                    label: `Asprak (${membersInActiveLab.filter((m) => m.role === 'asprak').length})`,
                  },
                ] as { key: RoleFilter; label: string }[]
              ).map((item) => {
                const active = roleFilter === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.roleTab, active && styles.roleTabActive]}
                    onPress={() => setRoleFilter(item.key)}
                  >
                    <Text style={[styles.roleTabText, active && styles.roleTabTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Member List */}
            {filteredMembers.length === 0 ? (
              <View style={styles.emptyCard}>
                <Feather name="users" size={26} color={LaboraColors.textMuted} />
                <Text style={styles.emptyTitle}>Belum ada anggota terdaftar</Text>
                <Text style={styles.emptySub}>
                  Gunakan tombol Alokasi di atas atau tab Bulk Insert untuk memasukkan praktikan /
                  asprak ke {activeLab.name}.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {filteredMembers.map((member) => {
                  const u = userMap.get(member.userId);
                  const isAsprak = member.role === 'asprak';
                  return (
                    <View key={member.id} style={styles.memberCard}>
                      <View
                        style={[
                          styles.avatar,
                          {
                            backgroundColor: isAsprak
                              ? LaboraColors.roleAsprakBg
                              : LaboraColors.rolePraktikanBg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.avatarText,
                            {
                              color: isAsprak
                                ? LaboraColors.roleAsprakText
                                : LaboraColors.rolePraktikanText,
                            },
                          ]}
                        >
                          {(u?.name ?? 'U').trim().charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={styles.nameLine}>
                          <Text style={styles.memberName} numberOfLines={1}>
                            {u?.name ?? member.userId}
                          </Text>
                          <View
                            style={[
                              styles.roleChip,
                              {
                                backgroundColor: isAsprak
                                  ? LaboraColors.roleAsprakBg
                                  : LaboraColors.rolePraktikanBg,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.roleChipText,
                                {
                                  color: isAsprak
                                    ? LaboraColors.roleAsprakText
                                    : LaboraColors.rolePraktikanText,
                                },
                              ]}
                            >
                              {isAsprak ? 'Asprak' : 'Praktikan'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.memberMeta} numberOfLines={1}>
                          {u?.email ?? '-'} {u?.nim ? `· NIM ${u.nim}` : ''}
                        </Text>
                      </View>

                      <View style={styles.memberActions}>
                        <TouchableOpacity
                          style={styles.transferBtn}
                          onPress={() => setTransferTarget(member)}
                        >
                          <Feather name="shuffle" size={13} color={LaboraColors.primary} />
                          <Text style={styles.transferBtnText}>Pindah</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.removeBtn}
                          onPress={() => handleConfirmRemove(member)}
                        >
                          <Feather name="trash-2" size={13} color={LaboraColors.danger} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>

      <TransferMemberModal
        visible={Boolean(transferTarget)}
        member={transferTarget}
        user={transferTarget ? (userMap.get(transferTarget.userId) ?? null) : null}
        sourceLab={activeLab}
        targetLabs={otherLabs}
        onClose={() => setTransferTarget(null)}
        onConfirmTransfer={handleTransferConfirm}
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
  sectionBlock: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  labPillRow: {
    gap: 8,
  },
  labPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: LaboraColors.surface,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  labPillActive: {
    backgroundColor: LaboraColors.primary,
    borderColor: LaboraColors.primary,
  },
  labPillName: {
    fontSize: 13.5,
    fontWeight: '600',
    color: LaboraColors.textPrimary,
  },
  labPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  countChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: LaboraColors.surfaceMuted,
  },
  countChipActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  countChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: LaboraColors.textSecondary,
  },
  toolbarRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: LaboraColors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: LaboraColors.textPrimary,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: LaboraColors.primary,
  },
  addBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pickerCard: {
    backgroundColor: LaboraColors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: LaboraColors.primaryBorder,
    gap: 10,
  },
  pickerTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  candidateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 12,
    backgroundColor: LaboraColors.background,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  assignSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: LaboraColors.primarySoft,
    borderWidth: 1,
    borderColor: LaboraColors.primaryBorder,
  },
  assignSmallText: {
    fontSize: 12,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  roleTabBar: {
    flexDirection: 'row',
    backgroundColor: LaboraColors.surface,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 4,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  roleTabActive: {
    backgroundColor: LaboraColors.primary,
  },
  roleTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: LaboraColors.textSecondary,
  },
  roleTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 13,
    borderRadius: 16,
    backgroundColor: LaboraColors.surface,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
    flexShrink: 1,
  },
  memberMeta: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
    marginTop: 2,
  },
  roleChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  roleChipText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  memberActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: LaboraColors.primarySoft,
    borderWidth: 1,
    borderColor: LaboraColors.primaryBorder,
  },
  transferBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: LaboraColors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    backgroundColor: LaboraColors.surface,
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  emptySub: {
    fontSize: 12.5,
    color: LaboraColors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});
