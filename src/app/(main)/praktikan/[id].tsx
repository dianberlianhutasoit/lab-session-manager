import React, { useState } from 'react';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useSessionContext } from '@/context/session-context';
import { useAuth } from '@/context/auth-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCALE = Math.min(Math.max(SCREEN_WIDTH / 402, 0.85), 1.25);
const s = (val: number) => Math.round(val * SCALE);

// Color tokens matching the app theme
const COLOR_BG = '#F8F5F2';
const COLOR_MAROON = '#64102A';
const COLOR_TEXT_DARK = '#1E293B';
const COLOR_TEXT_MUTED = '#64748B';
const COLOR_DIVIDER = '#F1E9E9';

const MONTH_NAMES_INDO = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES_INDO = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function formatDateIndo(dateStr?: string) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const day = DAY_NAMES_INDO[d.getDay()];
      const dateNum = d.getDate();
      const month = MONTH_NAMES_INDO[d.getMonth()].slice(0, 3);
      const year = d.getFullYear();
      return `${day}, ${dateNum} ${month} ${year}`;
    }
  } catch {}
  return dateStr;
}

export default function PraktikanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const safeAreaInsets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);

  const { sessions, schedules, attendance, recordAttendance, loading, users, classes } =
    useSessionContext();
  const { profile } = useAuth();

  const session = sessions.find((item) => item.id === id);
  const schedule = session
    ? schedules.find((item) => item.id === session.scheduleId)
    : undefined;

  const practitioner = profile;
  const attendanceRecord =
    session && practitioner
      ? attendance.find(
          (item) => item.sessionId === session.id && item.userId === practitioner.id
        )
      : undefined;

  // Temukan nama asisten praktikum
  const assistantUser = React.useMemo(() => {
    if (!session && !schedule) return undefined;
    if (session?.assistantId) {
      const u = users.find((user) => user.id === session.assistantId);
      if (u) return u;
    }
    if (schedule?.classId) {
      const c = classes.find((item) => item.id === schedule.classId);
      if (c?.assistantId) {
        return users.find((user) => user.id === c.assistantId);
      }
    }
    return undefined;
  }, [session, schedule, users, classes]);

  if (!session || !schedule) {
    if (loading) {
      return (
        <View style={[styles.screen, styles.centerContainer]}>
          <ActivityIndicator color={COLOR_MAROON} size="large" />
        </View>
      );
    }
    return (
      <View style={[styles.screen, styles.centerContainer]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Ionicons name="alert-circle-outline" size={54} color={COLOR_MAROON} />
        <Text style={styles.errorTitle}>Data tidak ditemukan</Text>
        <Text style={styles.errorSubtitle}>
          Informasi sesi praktikum ini tidak tersedia atau sudah dihapus.
        </Text>
        <TouchableOpacity
          style={styles.errorBackButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Text style={styles.errorBackButtonText}>Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOpen = session.status === 'OPEN';
  const hasAttended = attendanceRecord !== undefined;

  // Nilai data dengan fallback 'Data tidak ditemukan' sesuai instruksi
  const courseTitle = schedule.title || 'Data tidak ditemukan';
  const sessionNumberText =
    schedule.sessionNumber != null ? `Pertemuan ${schedule.sessionNumber}` : 'Data tidak ditemukan';
  const topicText = schedule.topic || 'Data tidak ditemukan';
  const bannerSubtitle = `${sessionNumberText} – ${topicText}`;
  const assistantName = assistantUser?.name || 'Data tidak ditemukan';
  const roomName = schedule.room || 'Data tidak ditemukan';

  // Format tanggal & waktu
  const formattedDate = formatDateIndo(schedule.date);
  const timeRange =
    schedule.startTime && schedule.endTime
      ? `${schedule.startTime} – ${schedule.endTime}`
      : 'Data tidak ditemukan';
  const dateTimeString = formattedDate
    ? `${formattedDate}  |  ${timeRange}`
    : timeRange !== 'Data tidak ditemukan'
    ? timeRange
    : 'Data tidak ditemukan';

  const handlePresensi = async () => {
    if (hasAttended) {
      Alert.alert('Presensi', 'Anda sudah melakukan presensi pada sesi praktikum ini.');
      return;
    }

    if (!isOpen) {
      Alert.alert(
        'Sesi Ditutup',
        'Sesi praktikum ini belum dibuka atau sudah ditutup oleh asisten laboratorium.'
      );
      return;
    }

    if (!practitioner) return;

    try {
      setSubmitting(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        Alert.alert(
          'Izin Lokasi Diperlukan',
          'Izin lokasi GPS diperlukan untuk memverifikasi kehadiran Anda di laboratorium.'
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const success = await recordAttendance(
        session.id,
        practitioner.id,
        new Date().toISOString(),
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }
      );

      if (success) {
        Alert.alert('Presensi Berhasil', 'Presensi Anda telah berhasil diverifikasi dan dicatat.');
      } else {
        Alert.alert('Informasi Presensi', 'Presensi Anda pada sesi ini sudah tercatat sebelumnya.');
      }
    } catch (err) {
      Alert.alert(
        'Presensi Gagal',
        err instanceof Error ? err.message : 'Terjadi kesalahan saat memverifikasi lokasi presensi.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleLihatLokasiLab = () => {
    router.push('/maps' as Href);
  };

  const handleAjukanIzin = () => {
    router.push('/praktikan/izin' as Href);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* ================= 1. HEADER BATIK DENGAN TOMBOL BACK ================= */}
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
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Detail Sesi Praktikum</Text>

          {/* Placeholder seimbang untuk perataan judul di tengah */}
          <View style={styles.headerRightPlaceholder} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= 2. KARTU DETAIL UTAMA (PUTIH) ================= */}
        <View style={styles.detailCard}>
          {/* Banner Top Praktikum */}
          <View style={styles.courseBanner}>
            <View style={styles.flaskBadge}>
              <Ionicons name="flask-outline" size={26} color="#FFFFFF" />
            </View>

            <View style={styles.courseBannerTextCol}>
              <Text style={styles.courseBannerTitle} numberOfLines={1}>
                {courseTitle}
              </Text>
              <Text style={styles.courseBannerSubtitle} numberOfLines={2}>
                {bannerSubtitle}
              </Text>
            </View>
          </View>

          {/* 1. Baris Asisten Praktikum */}
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={20} color={COLOR_TEXT_MUTED} />
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Asisten Praktikum</Text>
              <Text style={styles.infoValue}>{assistantName}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          {/* 2. Baris Tanggal & Waktu */}
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={COLOR_TEXT_MUTED} />
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Tanggal & Waktu</Text>
              <Text style={styles.infoValue}>{dateTimeString}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          {/* 3. Baris Lokasi Laboratorium */}
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={COLOR_TEXT_MUTED} />
            <View style={styles.infoCol}>
              <Text style={styles.infoLabel}>Lokasi Laboratorium</Text>
              <Text style={styles.infoValue}>{roomName}</Text>
            </View>
          </View>

          <View style={styles.rowDivider} />

          {/* 4. Baris Status Sesi */}
          <View style={styles.infoRow}>
            <Ionicons
              name="checkmark-circle-outline"
              size={22}
              color={isOpen ? '#16A34A' : COLOR_TEXT_MUTED}
            />
            <View style={styles.infoCol}>
              <View style={styles.statusHeaderRow}>
                <Text style={styles.statusLabelTitle}>Status Sesi</Text>
                <View
                  style={[
                    styles.statusPill,
                    isOpen ? styles.statusPillOpen : styles.statusPillClosed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isOpen ? styles.statusPillTextOpen : styles.statusPillTextClosed,
                    ]}
                  >
                    {isOpen ? 'Dibuka' : 'Ditutup'}
                  </Text>
                </View>
              </View>
              <Text style={styles.statusSubtext}>
                {isOpen
                  ? 'Sesi presensi sedang berlangsung.'
                  : 'Sesi presensi telah ditutup atau belum dibuka.'}
              </Text>
            </View>
          </View>

          {/* 5. Box Status Kehadiran Anda */}
          <View style={styles.attendanceBox}>
            <Ionicons
              name={hasAttended ? 'checkmark-circle' : 'checkmark-circle'}
              size={24}
              color="#16A34A"
            />
            <View style={styles.attendanceBoxCol}>
              <View style={styles.attendanceHeaderRow}>
                <Text style={styles.attendanceBoxTitle}>Status Kehadiran Anda</Text>
                <View
                  style={[
                    styles.attendanceBadge,
                    hasAttended ? styles.attendanceBadgeAttended : styles.attendanceBadgePending,
                  ]}
                >
                  <Text
                    style={[
                      styles.attendanceBadgeText,
                      hasAttended
                        ? styles.attendanceBadgeTextAttended
                        : styles.attendanceBadgeTextPending,
                    ]}
                  >
                    {hasAttended ? 'Hadir' : 'Belum Presensi'}
                  </Text>
                </View>
              </View>
              <Text style={styles.attendanceBoxSubtext}>
                {hasAttended
                  ? 'Presensi Anda telah berhasil tercatat pada sesi ini.'
                  : 'Anda belum melakukan presensi pada sesi ini.'}
              </Text>
            </View>
          </View>
        </View>

        {/* ================= 3. TOMBOL AKSI ================= */}
        <View style={styles.actionButtonsContainer}>
          {/* Tombol Utama: Presensi */}
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (hasAttended || !isOpen) && styles.primaryButtonDisabled,
            ]}
            onPress={handlePresensi}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Ionicons name="qr-code-outline" size={20} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>
                  {hasAttended ? 'Sudah Presensi' : 'Presensi'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Tombol Kedua: Lihat Lokasi Lab */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleLihatLokasiLab}
            activeOpacity={0.8}
          >
            <Ionicons name="location-outline" size={19} color={COLOR_MAROON} />
            <Text style={styles.secondaryButtonText}>Lihat Lokasi Lab</Text>
          </TouchableOpacity>

          {/* Tombol Ketiga: Ajukan Izin */}
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleAjukanIzin}
            activeOpacity={0.8}
          >
            <Ionicons name="paper-plane-outline" size={18} color={COLOR_MAROON} />
            <Text style={styles.secondaryButtonText}>Ajukan Izin</Text>
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: s(16),
    paddingBottom: s(18),
    position: 'relative',
    overflow: 'hidden',
  },
  headerContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: s(6),
  },
  headerTitle: {
    fontSize: s(18),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  headerRightPlaceholder: {
    width: s(36),
  },

  /* ================= 2. DETAIL CARD ================= */
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: s(20),
    marginHorizontal: s(16),
    marginTop: s(14),
    padding: s(16),
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  courseBanner: {
    backgroundColor: '#FDE8EC',
    borderRadius: s(14),
    padding: s(12),
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: s(14),
  },
  flaskBadge: {
    width: s(48),
    height: s(48),
    borderRadius: s(14),
    backgroundColor: '#64102A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(12),
  },
  courseBannerTextCol: {
    flex: 1,
  },
  courseBannerTitle: {
    fontSize: s(15.5),
    fontWeight: '700',
    color: COLOR_TEXT_DARK,
    marginBottom: s(3),
    includeFontPadding: false,
  },
  courseBannerSubtitle: {
    fontSize: s(12),
    fontWeight: '500',
    color: COLOR_TEXT_MUTED,
    includeFontPadding: false,
  },

  /* Baris Info */
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: s(6),
    gap: s(12),
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: s(11.5),
    fontWeight: '400',
    color: COLOR_TEXT_MUTED,
    marginBottom: s(2),
    includeFontPadding: false,
  },
  infoValue: {
    fontSize: s(13.5),
    fontWeight: '600',
    color: COLOR_TEXT_DARK,
    includeFontPadding: false,
  },
  rowDivider: {
    height: 1,
    backgroundColor: COLOR_DIVIDER,
    marginVertical: s(6),
  },

  /* Baris Status Sesi */
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusLabelTitle: {
    fontSize: s(13.5),
    fontWeight: '700',
    color: COLOR_TEXT_DARK,
    includeFontPadding: false,
  },
  statusPill: {
    paddingVertical: s(3),
    paddingHorizontal: s(10),
    borderRadius: s(12),
  },
  statusPillOpen: {
    backgroundColor: '#EAF8EC',
  },
  statusPillClosed: {
    backgroundColor: '#F1F5F9',
  },
  statusPillText: {
    fontSize: s(11),
    fontWeight: '600',
    includeFontPadding: false,
  },
  statusPillTextOpen: {
    color: '#16A34A',
  },
  statusPillTextClosed: {
    color: COLOR_TEXT_MUTED,
  },
  statusSubtext: {
    fontSize: s(11.5),
    color: COLOR_TEXT_MUTED,
    marginTop: s(2),
    includeFontPadding: false,
  },

  /* Box Status Kehadiran */
  attendanceBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: s(12),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: s(12),
    marginTop: s(12),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: s(10),
  },
  attendanceBoxCol: {
    flex: 1,
  },
  attendanceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  attendanceBoxTitle: {
    fontSize: s(13),
    fontWeight: '700',
    color: COLOR_TEXT_DARK,
    includeFontPadding: false,
  },
  attendanceBadge: {
    paddingVertical: s(3),
    paddingHorizontal: s(8),
    borderRadius: s(12),
  },
  attendanceBadgeAttended: {
    backgroundColor: '#EAF8EC',
  },
  attendanceBadgePending: {
    backgroundColor: '#FDE8EC',
  },
  attendanceBadgeText: {
    fontSize: s(11),
    fontWeight: '600',
    includeFontPadding: false,
  },
  attendanceBadgeTextAttended: {
    color: '#16A34A',
  },
  attendanceBadgeTextPending: {
    color: COLOR_MAROON,
  },
  attendanceBoxSubtext: {
    fontSize: s(11.5),
    color: COLOR_TEXT_MUTED,
    marginTop: s(3),
    includeFontPadding: false,
  },

  /* ================= 3. TOMBOL AKSI ================= */
  actionButtonsContainer: {
    paddingHorizontal: s(16),
    marginTop: s(16),
    gap: s(10),
  },
  primaryButton: {
    backgroundColor: COLOR_MAROON,
    height: s(48),
    borderRadius: s(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
    shadowColor: COLOR_MAROON,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  primaryButtonDisabled: {
    backgroundColor: '#9F6877',
    elevation: 0,
  },
  primaryButtonText: {
    fontSize: s(15),
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
    includeFontPadding: false,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: COLOR_MAROON,
    height: s(48),
    borderRadius: s(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(8),
  },
  secondaryButtonText: {
    fontSize: s(14.5),
    fontWeight: '700',
    color: COLOR_MAROON,
    letterSpacing: 0.2,
    includeFontPadding: false,
  },

  /* Center Container / Error */
  centerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: s(24),
  },
  errorTitle: {
    fontSize: s(18),
    fontWeight: '700',
    color: COLOR_TEXT_DARK,
    marginTop: s(12),
    marginBottom: s(4),
  },
  errorSubtitle: {
    fontSize: s(13),
    color: COLOR_TEXT_MUTED,
    textAlign: 'center',
    marginBottom: s(16),
  },
  errorBackButton: {
    backgroundColor: COLOR_MAROON,
    paddingVertical: s(10),
    paddingHorizontal: s(20),
    borderRadius: s(20),
  },
  errorBackButtonText: {
    fontSize: s(13),
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
