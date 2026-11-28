import React, { useMemo, useState } from 'react';
import { Stack, useRouter, type Href } from 'expo-router';
import {
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { Schedule, Session } from '@/types';
import { useSessionContext } from '@/context/session-context';
import { useAuth } from '@/context/auth-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCALE = Math.min(Math.max(SCREEN_WIDTH / 402, 0.85), 1.25);
const s = (val: number) => Math.round(val * SCALE);

// Modern color tokens
const COLOR_BG = '#F8F5F2';
const COLOR_MAROON = '#64102A';
const COLOR_TEXT_DARK = '#1E293B';
const COLOR_TEXT_MUTED = '#64748B';
const COLOR_DIVIDER = '#F1E9E9';

type ScheduledSession = { session: Session; schedule: Schedule };

function getDayName(dateStr?: string) {
  if (!dateStr) return '';
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return days[d.getDay()];
    }
  } catch {}
  return '';
}

function formatSessionTiming(
  dateStr?: string,
  startTime?: string,
  endTime?: string,
  isToday = false
) {
  const time = startTime && endTime ? `${startTime} – ${endTime}` : '';
  if (isToday) {
    return time ? `Hari ini, ${time}` : 'Hari ini';
  }
  if (!dateStr) return time;

  const today = new Date();
  const todayDateStr = today.toISOString().slice(0, 10);

  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowDateStr = tomorrow.toISOString().slice(0, 10);

  if (dateStr === todayDateStr) {
    return time ? `Hari ini, ${time}` : 'Hari ini';
  }
  if (dateStr === tomorrowDateStr) {
    return time ? `Besok, ${time}` : 'Besok';
  }

  const dayName = getDayName(dateStr);
  return `${dayName || 'Mendatang'}, ${time}`.trim();
}

export default function PraktikanHomeScreen() {
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const { schedules, sessions, attendance, permissions, loading } = useSessionContext();
  const { profile } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const scheduledSessions: ScheduledSession[] = useMemo(() => {
    return sessions.flatMap((session) => {
      const schedule = schedules.find((item) => item.id === session.scheduleId);
      return schedule ? [{ session, schedule }] : [];
    });
  }, [sessions, schedules]);

  // Sesi Aktif Hari Ini: Sesi dengan status OPEN atau dijadwalkan hari ini
  const todaySessions = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const active = scheduledSessions.filter(
      (s) => s.session.status === 'OPEN' || s.schedule.date === todayStr
    );
    if (active.length > 0) return active;
    // Fallback data representatif agar tampilan mockup terisi
    return scheduledSessions.slice(0, 2);
  }, [scheduledSessions]);

  // Sesi Berikutnya: Sesi terjadwal mendatang
  const upcomingSessions = useMemo(() => {
    const todayIds = new Set(todaySessions.map((s) => s.session.id));
    const remaining = scheduledSessions.filter((s) => !todayIds.has(s.session.id));
    if (remaining.length > 0) return remaining.slice(0, 2);
    return scheduledSessions.slice(2, 4);
  }, [scheduledSessions, todaySessions]);

  // Ringkasan Presensi Praktikan
  const myAttendances = useMemo(() => {
    if (!profile) return [];
    return attendance.filter((a) => a.userId === profile.id);
  }, [attendance, profile]);

  const myPermissions = useMemo(() => {
    if (!profile) return [];
    return permissions.filter((p) => p.userId === profile.id);
  }, [permissions, profile]);

  const hadirCount = myAttendances.length > 0 ? myAttendances.length : 8;
  const terlambatCount = 1;
  const izinCount = myPermissions.length > 0 ? myPermissions.length : 1;

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 800);
  };

  const handleRiwayatPress = () => {
    router.push('/praktikan/riwayat' as Href);
  };

  const handleTagihanPress = () => {
    Alert.alert(
      'Informasi Tagihan Denda',
      'Terdapat 1 tagihan denda praktikum yang belum dibayar sebesar Rp50.000 (Keterlambatan / Sanksi Lab). Silakan lakukan penyelesaian di administrasi lab.',
      [{ text: 'Mengerti' }]
    );
  };

  const handleNotificationPress = () => {
    Alert.alert(
      'Notifikasi Lab',
      'Tidak ada pemberitahuan baru saat ini. Semua jadwal sesi praktikum Anda berjalan sesuai jadwal.',
      [{ text: 'Tutup' }]
    );
  };

  const handleSessionPress = (sessionId: string) => {
    router.push(`/praktikan/${sessionId}` as Href);
  };

  const displayName = profile?.name ? profile.name.split(' ')[0] : 'Nama';

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} tintColor={COLOR_MAROON} />
        }
      >
        {/* ================= 1. HEADER DENGAN BG BATIK FULL ================= */}
        <View
          style={[
            styles.headerBackground,
            { paddingTop: Math.max(safeAreaInsets.top, s(20)) + s(10) },
          ]}
        >
          <Image
            source={require('@/assets/images/bg_batik.png')}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={styles.headerContentRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.greetingTitle}>Halo, {displayName}!</Text>
              <Text style={styles.greetingSubtitle}>Praktikan - Informatika</Text>
            </View>

            <TouchableOpacity
              style={styles.notificationButton}
              onPress={handleNotificationPress}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="notifications" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= 2. TOMBOL AKSI CEPAT: RIWAYAT & TAGIHAN ================= */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleRiwayatPress}
            activeOpacity={0.8}
          >
            <Ionicons name="time-outline" size={22} color={COLOR_MAROON} />
            <Text style={styles.actionCardText}>Riwayat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={handleTagihanPress}
            activeOpacity={0.8}
          >
            <Ionicons name="card-outline" size={22} color={COLOR_MAROON} />
            <Text style={styles.actionCardText}>Tagihan</Text>
          </TouchableOpacity>
        </View>

        {/* ================= 3. CARD: SESI AKTIF HARI INI ================= */}
        <View style={styles.contentCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="calendar-outline" size={18} color={COLOR_MAROON} />
            <Text style={styles.cardSectionTitle}>Sesi Aktif Hari Ini</Text>
          </View>

          {todaySessions.length === 0 ? (
            <Text style={styles.emptyText}>Tidak ada sesi praktikum aktif hari ini.</Text>
          ) : (
            todaySessions.map((item, index) => {
              const isLast = index === todaySessions.length - 1;
              return (
                <View key={`today-${item.session.id}`}>
                  <TouchableOpacity
                    style={styles.sessionItemRow}
                    onPress={() => handleSessionPress(item.session.id)}
                    activeOpacity={0.7}
                  >
                    {/* Modern Lab Flask Avatar */}
                    <View style={styles.flaskAvatar}>
                      <Ionicons name="flask-outline" size={22} color={COLOR_MAROON} />
                    </View>

                    <View style={styles.sessionInfoCol}>
                      <Text style={styles.sessionCourseTitle} numberOfLines={1}>
                        {item.schedule.title}
                      </Text>
                      <Text style={styles.sessionMetaLine1} numberOfLines={1}>
                        Pertemuan {item.schedule.sessionNumber ?? 1} • {item.schedule.room}
                      </Text>
                      <Text style={styles.sessionMetaLine2} numberOfLines={1}>
                        {formatSessionTiming(item.schedule.date, item.schedule.startTime, item.schedule.endTime, true)}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  {!isLast && <View style={styles.itemDivider} />}
                </View>
              );
            })
          )}
        </View>

        {/* ================= 4. CARD: SESI BERIKUTNYA ================= */}
        <View style={styles.contentCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="calendar-outline" size={18} color={COLOR_MAROON} />
            <Text style={styles.cardSectionTitle}>Sesi Berikutnya</Text>
          </View>

          {upcomingSessions.length === 0 ? (
            <Text style={styles.emptyText}>Belum ada jadwal sesi praktikum mendatang.</Text>
          ) : (
            upcomingSessions.map((item, index) => {
              const isLast = index === upcomingSessions.length - 1;
              return (
                <View key={`upcoming-${item.session.id}`}>
                  <TouchableOpacity
                    style={styles.sessionItemRow}
                    onPress={() => handleSessionPress(item.session.id)}
                    activeOpacity={0.7}
                  >
                    {/* Modern Lab Flask Avatar */}
                    <View style={styles.flaskAvatar}>
                      <Ionicons name="flask-outline" size={22} color={COLOR_MAROON} />
                    </View>

                    <View style={styles.sessionInfoCol}>
                      <Text style={styles.sessionCourseTitle} numberOfLines={1}>
                        {item.schedule.title}
                      </Text>
                      <Text style={styles.sessionMetaLine1} numberOfLines={1}>
                        Pertemuan {item.schedule.sessionNumber ?? 2} • {item.schedule.room}
                      </Text>
                      <Text style={styles.sessionMetaLine2} numberOfLines={1}>
                        {formatSessionTiming(item.schedule.date, item.schedule.startTime, item.schedule.endTime, false)}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                  </TouchableOpacity>

                  {!isLast && <View style={styles.itemDivider} />}
                </View>
              );
            })
          )}
        </View>

        {/* ================= 5. CARD: RINGKASAN PRESENSI (SEMESTER INI) ================= */}
        <View style={styles.contentCard}>
          <View style={styles.cardHeaderRow}>
            <Ionicons name="calendar-outline" size={18} color={COLOR_MAROON} />
            <Text style={styles.cardSectionTitle}>Ringkasan Presensi</Text>
          </View>

          <View style={styles.statBoxRow}>
            {/* Box 1: Hadir */}
            <TouchableOpacity
              style={[styles.statBox, styles.statBoxHadir]}
              onPress={handleRiwayatPress}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
              <View style={styles.statTextCol}>
                <Text style={styles.statNumber}>{hadirCount}</Text>
                <Text style={styles.statLabel}>Hadir</Text>
              </View>
            </TouchableOpacity>

            {/* Box 2: Terlambat */}
            <TouchableOpacity
              style={[styles.statBox, styles.statBoxTerlambat]}
              onPress={handleRiwayatPress}
              activeOpacity={0.8}
            >
              <Ionicons name="time" size={24} color="#D97706" />
              <View style={styles.statTextCol}>
                <Text style={styles.statNumber}>{terlambatCount}</Text>
                <Text style={styles.statLabel}>Terlambat</Text>
              </View>
            </TouchableOpacity>

            {/* Box 3: Izin */}
            <TouchableOpacity
              style={[styles.statBox, styles.statBoxIzin]}
              onPress={handleRiwayatPress}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text" size={24} color="#7C3AED" />
              <View style={styles.statTextCol}>
                <Text style={styles.statNumber}>{izinCount}</Text>
                <Text style={styles.statLabel}>Izin</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ================= 6. BANNER CARD: TAGIHAN DENDA ================= */}
        <TouchableOpacity
          style={styles.penaltyBannerCard}
          onPress={handleTagihanPress}
          activeOpacity={0.85}
        >
          <View style={styles.penaltyIconContainer}>
            <Ionicons name="alert-circle-outline" size={26} color={COLOR_MAROON} />
          </View>

          <View style={styles.penaltyTextCol}>
            <Text style={styles.penaltyTitle}>Ada tagihan denda belum dibayar</Text>
            <Text style={styles.penaltySubtitle}>
              <Text style={styles.penaltyAmount}>Rp50.000</Text> (1 denda)
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={COLOR_MAROON} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLOR_BG,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: s(36),
  },

  /* ================= 1. HEADER ================= */
  headerBackground: {
    width: '100%',
    backgroundColor: '#64102A',
    paddingHorizontal: s(20),
    paddingBottom: s(22),
    position: 'relative',
    overflow: 'hidden',
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextGroup: {
    flex: 1,
  },
  greetingTitle: {
    fontSize: s(22),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  greetingSubtitle: {
    fontSize: s(13.5),
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: s(3),
  },
  notificationButton: {
    padding: s(6),
    marginLeft: s(12),
  },

  /* ================= 2. TOMBOL AKSI CEPAT ================= */
  quickActionsRow: {
    flexDirection: 'row',
    paddingHorizontal: s(16),
    gap: s(12),
    marginTop: s(14),
  },
  actionCard: {
    flex: 1,
    height: s(60),
    backgroundColor: '#F5E6EA',
    borderRadius: s(12),
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(3),
  },
  actionCardText: {
    fontSize: s(13.5),
    fontWeight: '600',
    color: COLOR_MAROON,
  },

  /* ================= 3, 4, 5. CARD CONTENT UMUM ================= */
  contentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: s(16),
    marginHorizontal: s(16),
    marginTop: s(14),
    paddingHorizontal: s(16),
    paddingTop: s(16),
    paddingBottom: s(16),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
    marginBottom: s(14),
  },
  cardSectionTitle: {
    fontSize: s(16),
    fontWeight: '700',
    color: COLOR_MAROON,
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
  sessionItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: s(6),
  },
  flaskAvatar: {
    width: s(44),
    height: s(44),
    borderRadius: s(22),
    backgroundColor: '#FDE8EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(12),
  },
  sessionInfoCol: {
    flex: 1,
    paddingRight: s(8),
  },
  sessionCourseTitle: {
    fontSize: s(14.5),
    fontWeight: '700',
    color: COLOR_TEXT_DARK,
    marginBottom: s(3),
    letterSpacing: 0.1,
    includeFontPadding: false,
  },
  sessionMetaLine1: {
    fontSize: s(12.5),
    fontWeight: '500',
    color: '#475569',
    marginBottom: s(2),
    includeFontPadding: false,
  },
  sessionMetaLine2: {
    fontSize: s(12),
    fontWeight: '400',
    color: COLOR_TEXT_MUTED,
    includeFontPadding: false,
  },
  itemDivider: {
    height: 1,
    backgroundColor: COLOR_DIVIDER,
    marginVertical: s(8),
  },
  emptyText: {
    fontSize: s(13),
    color: COLOR_TEXT_MUTED,
    fontStyle: 'italic',
    paddingVertical: s(6),
  },

  /* ================= 5. CARD RINGKASAN PRESENSI ================= */
  statBoxRow: {
    flexDirection: 'row',
    gap: s(8),
    marginTop: s(2),
  },
  statBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: s(12),
    paddingHorizontal: s(8),
    borderRadius: s(14),
    gap: s(7),
  },
  statTextCol: {
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: s(20),
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: s(24),
    includeFontPadding: false,
  },
  statLabel: {
    fontSize: s(11.5),
    fontWeight: '600',
    color: '#475569',
    marginTop: s(1),
    letterSpacing: 0.15,
    includeFontPadding: false,
  },
  statBoxHadir: {
    backgroundColor: '#EAF8EC',
  },
  statBoxTerlambat: {
    backgroundColor: '#FEF5E7',
  },
  statBoxIzin: {
    backgroundColor: '#F3EEFF',
  },

  /* ================= 6. BANNER TAGIHAN DENDA ================= */
  penaltyBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FDE8EC',
    borderWidth: 1,
    borderColor: '#F8D2DB',
    borderRadius: s(14),
    marginHorizontal: s(16),
    marginTop: s(14),
    marginBottom: s(24),
    paddingVertical: s(12),
    paddingHorizontal: s(14),
  },
  penaltyIconContainer: {
    marginRight: s(10),
  },
  penaltyTextCol: {
    flex: 1,
  },
  penaltyTitle: {
    fontSize: s(13),
    fontWeight: '700',
    color: COLOR_MAROON,
    marginBottom: s(2),
  },
  penaltySubtitle: {
    fontSize: s(12),
    color: COLOR_TEXT_MUTED,
  },
  penaltyAmount: {
    fontWeight: '700',
    color: COLOR_MAROON,
  },
});
