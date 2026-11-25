import { Feather } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
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
import type { DashboardRange } from '@/features/aslab/types';

function formatRupiah(amount: number): string {
  return `Rp${amount.toLocaleString('id-ID')}`;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isWithinRange(iso: string | undefined, range: DashboardRange): boolean {
  if (!iso) return false;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);

  if (range === 'today') {
    return target >= startOfToday && target <= endOfToday;
  }

  if (range === 'week') {
    const startOfWeek = new Date(startOfToday.getTime() - 6 * 24 * 60 * 60 * 1000);
    const endOfWeek = new Date(endOfToday.getTime() + 7 * 24 * 60 * 60 * 1000);
    return target >= startOfWeek && target <= endOfWeek;
  }

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return target >= startOfMonth && target <= endOfMonth;
}

const RANGE_OPTIONS: { key: DashboardRange; label: string }[] = [
  { key: 'today', label: 'Hari ini' },
  { key: 'week', label: 'Minggu ini' },
  { key: 'month', label: 'Bulan ini' },
];

export default function AslabDashboardScreen() {
  const insets = useSafeAreaInsets();
  const { profile, logout } = useAuth();
  const {
    courses,
    labs,
    labMembers,
    users,
    sessions,
    attendances,
    fines,
    loading,
    isLiveConnected,
    seedKickoffData,
  } = useAslab();

  const [range, setRange] = useState<DashboardRange>('week');
  const [seeding, setSeeding] = useState(false);

  const labMap = useMemo(() => new Map(labs.map((l) => [l.id, l])), [labs]);
  const courseMap = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const totalPraktikan = useMemo(() => {
    const fromMembers = new Set(
      labMembers.filter((m) => m.role === 'praktikan').map((m) => m.userId)
    );
    const fromUsers = users.filter((u) => u.role === 'praktikan').length;
    return Math.max(fromMembers.size, fromUsers);
  }, [labMembers, users]);

  const filteredSessions = useMemo(
    () =>
      sessions
        .filter((s) => isWithinRange(s.startAt, range))
        .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()),
    [sessions, range]
  );

  const activeAndUpcomingSessions = useMemo(
    () => filteredSessions.filter((s) => s.status === 'OPEN' || s.status === 'SCHEDULED'),
    [filteredSessions]
  );

  const historySessions = useMemo(
    () =>
      filteredSessions
        .filter((s) => s.status === 'CLOSED')
        .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()),
    [filteredSessions]
  );

  const openSessionsCount = useMemo(
    () => sessions.filter((s) => s.status === 'OPEN').length,
    [sessions]
  );

  const filteredFines = useMemo(
    () =>
      fines
        .filter((f) => isWithinRange(f.paidAt ?? f.createdAt, range))
        .sort(
          (a, b) =>
            new Date(b.paidAt ?? b.createdAt).getTime() -
            new Date(a.paidAt ?? a.createdAt).getTime()
        ),
    [fines, range]
  );

  const financeSummary = useMemo(() => {
    let paid = 0;
    let unpaid = 0;
    let waived = 0;
    for (const f of filteredFines) {
      if (f.status === 'paid') paid += f.amount;
      else if (f.status === 'waived') waived += f.amount;
      else unpaid += f.amount;
    }
    return { paid, unpaid, waived, count: filteredFines.length };
  }, [filteredFines]);

  const filteredAttendancesCount = useMemo(
    () => attendances.filter((a) => isWithinRange(a.checkedInAt, range)).length,
    [attendances, range]
  );

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await seedKickoffData();
      const msg = 'Seed data Sprint 4 berhasil dimuat (Lab, Mata Kuliah, Anggota, Sesi, dan Dummy Denda).';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Seed Data Siap', msg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat seed data.';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Gagal Seed', msg);
    } finally {
      setSeeding(false);
    }
  };

  const confirmLogout = () => {
    if (Platform.OS === 'web') {
      void logout();
      return;
    }
    Alert.alert('Keluar Akun', 'Yakin ingin keluar dari portal Aslab?', [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: () => void logout() },
    ]);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <LaboraTopBar
        title="Dashboard Aslab"
        subtitle={profile?.name ?? 'Asisten Laboratorium'}
        roleBadge={isLiveConnected ? 'Aslab · Live' : 'Aslab'}
        onProfilePress={confirmLogout}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Filter Rentang Waktu */}
        <View style={styles.rangeBar}>
          {RANGE_OPTIONS.map((opt) => {
            const active = range === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.rangePill, active && styles.rangePillActive]}
                onPress={() => setRange(opt.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.rangeText, active && styles.rangeTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={LaboraColors.primary} />
            <Text style={styles.loadingText}>Menyinkronkan data laboratorium...</Text>
          </View>
        ) : null}

        {/* 2x2 Ringkasan Metrik Utama */}
        <View style={styles.metricsGrid}>
          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: LaboraColors.primarySoft }]}>
              <Feather name="layers" size={18} color={LaboraColors.primary} />
            </View>
            <Text style={styles.metricValue}>{labs.length}</Text>
            <Text style={styles.metricLabel}>Total Laboratorium</Text>
            <Text style={styles.metricSub}>{courses.length} mata kuliah</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: LaboraColors.infoSoft }]}>
              <Feather name="users" size={18} color={LaboraColors.info} />
            </View>
            <Text style={styles.metricValue}>{totalPraktikan}</Text>
            <Text style={styles.metricLabel}>Jumlah Praktikan</Text>
            <Text style={styles.metricSub}>
              {labMembers.filter((m) => m.role === 'asprak').length} asprak teralokasi
            </Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: LaboraColors.successSoft }]}>
              <Feather name="activity" size={18} color={LaboraColors.successDark} />
            </View>
            <Text style={styles.metricValue}>{openSessionsCount}</Text>
            <Text style={styles.metricLabel}>Sesi Aktif (OPEN)</Text>
            <Text style={styles.metricSub}>{filteredAttendancesCount} presensi masuk</Text>
          </View>

          <View style={styles.metricCard}>
            <View style={[styles.metricIcon, { backgroundColor: LaboraColors.warningSoft }]}>
              <Feather name="credit-card" size={18} color={LaboraColors.warning} />
            </View>
            <Text style={[styles.metricValue, { fontSize: 18 }]} numberOfLines={1}>
              {formatRupiah(financeSummary.paid)}
            </Text>
            <Text style={styles.metricLabel}>Denda Terkumpul</Text>
            <Text style={styles.metricSub}>
              Tertunda {formatRupiah(financeSummary.unpaid)}
            </Text>
          </View>
        </View>

        {/* Ringkasan Keuangan Denda */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Ringkasan Keuangan Denda</Text>
              <Text style={styles.sectionSubtitle}>
                Pembayaran denda keterlambatan real-time (koleksi fines)
              </Text>
            </View>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{financeSummary.count} tagihan</Text>
            </View>
          </View>

          <View style={styles.financeRow}>
            <View style={[styles.financePill, { backgroundColor: LaboraColors.successSoft }]}>
              <Text style={styles.financePillLabel}>Lunas (Paid)</Text>
              <Text style={[styles.financePillValue, { color: LaboraColors.successDark }]}>
                {formatRupiah(financeSummary.paid)}
              </Text>
            </View>
            <View style={[styles.financePill, { backgroundColor: LaboraColors.dangerSoft }]}>
              <Text style={styles.financePillLabel}>Belum Bayar</Text>
              <Text style={[styles.financePillValue, { color: LaboraColors.danger }]}>
                {formatRupiah(financeSummary.unpaid)}
              </Text>
            </View>
            <View style={[styles.financePill, { backgroundColor: LaboraColors.surfaceMuted }]}>
              <Text style={styles.financePillLabel}>Dibebaskan</Text>
              <Text style={[styles.financePillValue, { color: LaboraColors.textSecondary }]}>
                {formatRupiah(financeSummary.waived)}
              </Text>
            </View>
          </View>

          {filteredFines.length === 0 ? (
            <Text style={styles.emptyInline}>Belum ada catatan denda pada rentang waktu ini.</Text>
          ) : (
            <View style={{ gap: 8 }}>
              {filteredFines.slice(0, 5).map((fine) => {
                const student = userMap.get(fine.studentId);
                const lab = labMap.get(fine.labId);
                const statusColor =
                  fine.status === 'paid'
                    ? LaboraColors.successDark
                    : fine.status === 'waived'
                    ? LaboraColors.textSecondary
                    : LaboraColors.danger;
                const statusBg =
                  fine.status === 'paid'
                    ? LaboraColors.successSoft
                    : fine.status === 'waived'
                    ? LaboraColors.surfaceMuted
                    : LaboraColors.dangerSoft;

                return (
                  <View key={fine.id} style={styles.listRowItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{student?.name ?? fine.studentId}</Text>
                      <Text style={styles.rowMeta}>
                        {lab?.name ?? fine.labId} · {fine.reason}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={styles.amountText}>{formatRupiah(fine.amount)}</Text>
                      <View style={[styles.statusTag, { backgroundColor: statusBg }]}>
                        <Text style={[styles.statusTagText, { color: statusColor }]}>
                          {fine.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Jadwal Berlangsung & Mendatang + Info Lokasi */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Jadwal Berlangsung & Mendatang</Text>
              <Text style={styles.sectionSubtitle}>
                Status sesi aktif & terjadwal beserta informasi lokasi lab
              </Text>
            </View>
            <TouchableOpacity
              style={styles.mapLinkBtn}
              onPress={() => router.push('/maps' as Href)}
            >
              <Feather name="map-pin" size={13} color={LaboraColors.primary} />
              <Text style={styles.mapLinkText}>Peta Lab</Text>
            </TouchableOpacity>
          </View>

          {activeAndUpcomingSessions.length === 0 ? (
            <Text style={styles.emptyInline}>
              Tidak ada sesi berlangsung atau mendatang pada rentang waktu ini.
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {activeAndUpcomingSessions.map((sess) => {
                const lab = labMap.get(sess.labId);
                const course = courseMap.get(sess.courseId);
                const asprak = userMap.get(sess.asprakId);
                const isOpen = sess.status === 'OPEN';
                return (
                  <View key={sess.id} style={styles.sessionCard}>
                    <View style={styles.sessionTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.sessionCourse}>
                          {course ? `${course.code} · ${course.name}` : `Sesi #${sess.sessionNumber}`}
                        </Text>
                        <Text style={styles.sessionTitle}>{sess.title}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusTag,
                          {
                            backgroundColor: isOpen
                              ? LaboraColors.successSoft
                              : LaboraColors.warningSoft,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            { color: isOpen ? LaboraColors.successDark : '#B45309' },
                          ]}
                        >
                          {isOpen ? 'BERLANGSUNG' : 'MENDATANG'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metaStack}>
                      <View style={styles.metaLine}>
                        <Feather name="map-pin" size={13} color={LaboraColors.primary} />
                        <Text style={styles.rowMeta}>
                          {lab
                            ? `${lab.name} — ${lab.location.name} (${lab.radiusMeters}m)`
                            : sess.labId}
                        </Text>
                      </View>
                      <View style={styles.metaLine}>
                        <Feather name="clock" size={13} color={LaboraColors.textSecondary} />
                        <Text style={styles.rowMeta}>
                          {formatDateTime(sess.startAt)} – {formatDateTime(sess.endAt)}
                        </Text>
                      </View>
                      <View style={styles.metaLine}>
                        <Feather name="user" size={13} color={LaboraColors.textSecondary} />
                        <Text style={styles.rowMeta}>
                          Asprak: {asprak?.name ?? (sess.asprakId || '-')}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Riwayat Kegiatan Lab */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Riwayat Kegiatan Lab</Text>
          <Text style={styles.sectionSubtitle}>
            Sesi praktikum yang telah selesai pada rentang terpilih
          </Text>

          {historySessions.length === 0 ? (
            <Text style={styles.emptyInline}>Belum ada riwayat sesi selesai pada rentang ini.</Text>
          ) : (
            <View style={{ gap: 8, marginTop: 4 }}>
              {historySessions.slice(0, 6).map((sess) => {
                const lab = labMap.get(sess.labId);
                const attCount = attendances.filter((a) => a.sessionId === sess.id).length;
                return (
                  <View key={sess.id} style={styles.listRowItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{sess.title}</Text>
                      <Text style={styles.rowMeta}>
                        {lab?.name ?? sess.labId} · {formatDateTime(sess.startAt)}
                      </Text>
                    </View>
                    <View style={[styles.statusTag, { backgroundColor: LaboraColors.surfaceMuted }]}>
                      <Text style={[styles.statusTagText, { color: LaboraColors.textSecondary }]}>
                        {attCount} hadir
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Seed Data Hari Pertama & Aksi Cepat */}
        <View style={styles.seedCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.seedTitle}>Seed Data Sprint 4 (Kickoff)</Text>
            <Text style={styles.seedDesc}>
              Muat data awal lab, mata kuliah, anggota, sesi aktif, dan dummy denda untuk uji
              mandiri lintas tim.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.seedBtn, seeding && { opacity: 0.7 }]}
            onPress={() => void handleSeed()}
            disabled={seeding}
          >
            {seeding ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Feather name="database" size={14} color="#FFFFFF" />
                <Text style={styles.seedBtnText}>Seed Data</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  rangeBar: {
    flexDirection: 'row',
    backgroundColor: LaboraColors.surface,
    borderRadius: 999,
    padding: 4,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 4,
  },
  rangePill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
  },
  rangePillActive: {
    backgroundColor: LaboraColors.primary,
  },
  rangeText: {
    fontSize: 13,
    fontWeight: '600',
    color: LaboraColors.textSecondary,
  },
  rangeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: LaboraColors.surface,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  loadingText: {
    fontSize: 13,
    color: LaboraColors.textSecondary,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metricCard: {
    width: '48.4%',
    backgroundColor: LaboraColors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 4,
  },
  metricIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  metricLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: LaboraColors.textPrimary,
  },
  metricSub: {
    fontSize: 11.5,
    color: LaboraColors.textSecondary,
  },
  sectionCard: {
    backgroundColor: LaboraColors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
    marginTop: 2,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: LaboraColors.primarySoft,
  },
  countBadgeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  financeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  financePill: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    gap: 3,
  },
  financePillLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: LaboraColors.textSecondary,
  },
  financePillValue: {
    fontSize: 13.5,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  listRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    padding: 11,
    borderRadius: 12,
    backgroundColor: LaboraColors.background,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  rowTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  rowMeta: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
    flexShrink: 1,
  },
  amountText: {
    fontSize: 13,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  statusTagText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  mapLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: LaboraColors.primarySoft,
    borderWidth: 1,
    borderColor: LaboraColors.primaryBorder,
  },
  mapLinkText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  sessionCard: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: LaboraColors.background,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 8,
  },
  sessionTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  sessionCourse: {
    fontSize: 11.5,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
    marginTop: 2,
  },
  metaStack: {
    gap: 4,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyInline: {
    fontSize: 13,
    color: LaboraColors.textSecondary,
    paddingVertical: 6,
  },
  seedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 15,
    borderRadius: 16,
    backgroundColor: LaboraColors.primarySoft,
    borderWidth: 1,
    borderColor: LaboraColors.primaryBorder,
  },
  seedTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  seedDesc: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
    marginTop: 2,
    lineHeight: 17,
  },
  seedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: LaboraColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  seedBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
