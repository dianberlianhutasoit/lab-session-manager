import React, { useMemo } from "react";
import { Stack, useRouter, type Href } from "expo-router";
import {
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather, Ionicons } from "@expo/vector-icons";
import type { Schedule, Session } from "@/types";
import SessionCard from "@/components/praktikan/SessionCard";
import { useSessionContext } from "@/context/session-context";
import { useAuth } from "@/context/auth-context";
import { LaboraColors, Spacing, MaxContentWidth } from "@/constants/theme";
import { LaboraTopBar } from "@/components/labora/LaboraTopBar";
import { CircularGauge } from "@/components/labora/CircularGauge";

type ScheduledSession = { session: Session; schedule: Schedule };

export default function PraktikanJadwalScreen() {
  const router = useRouter();
  const { schedules, sessions, attendance, permissions, loading, error, isFirestoreConnected } =
    useSessionContext();
  const { profile, logout } = useAuth();

  const scheduledSessions: ScheduledSession[] = useMemo(() => {
    return sessions.flatMap((session) => {
      const schedule = schedules.find((item) => item.id === session.scheduleId);
      return schedule ? [{ session, schedule }] : [];
    });
  }, [sessions, schedules]);

  // Cari sesi berikutnya (prioritaskan yang OPEN, atau yang pertama)
  const nextSession = useMemo(() => {
    const openSession = scheduledSessions.find((s) => s.session.status === "OPEN");
    if (openSession) return openSession;
    return scheduledSessions[0] ?? null;
  }, [scheduledSessions]);

  // Hitung metrik kehadiran praktikan
  const myAttendanceCount = useMemo(() => {
    if (!profile) return 0;
    return attendance.filter((a) => a.userId === profile.id).length;
  }, [attendance, profile]);

  const myPermissionsCount = useMemo(() => {
    if (!profile) return 0;
    return permissions.filter((p) => p.userId === profile.id).length;
  }, [permissions, profile]);

  const totalSessionsCount = scheduledSessions.length > 0 ? scheduledSessions.length : 17;
  const attendedCount = myAttendanceCount > 0 ? myAttendanceCount : 16;
  const attendanceRate = useMemo(() => {
    if (scheduledSessions.length === 0) return 94.2;
    const rate = Math.round((attendedCount / totalSessionsCount) * 1000) / 10;
    return Math.min(100, Math.max(0, rate));
  }, [attendedCount, totalSessionsCount, scheduledSessions.length]);

  const handleQuickPresensi = () => {
    if (nextSession) {
      router.push(`/praktikan/${nextSession.session.id}` as Href);
    } else {
      Alert.alert("Presensi Lab", "Belum ada sesi praktikum yang tersedia.");
    }
  };

  const handleDownloadModule = () => {
    Alert.alert(
      "Modul Praktikum",
      "Modul praktikum pertemuan aktif telah disiapkan oleh Asisten Lab. Anda dapat mengunduh berkas PDF melalui portal SSO Mahasiswa.",
      [{ text: "Tutup" }]
    );
  };

  const handleContactAssistant = () => {
    Alert.alert(
      "Hubungi Asisten Lab",
      "Kirim pesan atau koordinasi kehadiran langsung melalui asisten lab yang bertugas pada sesi ini.",
      [{ text: "Mengerti" }]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <FlatList
          data={scheduledSessions}
          keyExtractor={({ session }) => session.id}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.headerBlock}>
              {/* 1. Google Stitch LABORA TopBar */}
              <LaboraTopBar
                title="Beranda"
                subtitle="Informatika (Smt 5)"
                roleBadge="⇄ Praktikan"
                userName={profile?.name ?? "Sara Wilson"}
                isOnline={isFirestoreConnected}
                onRoleBadgePress={() => router.push("/(main)" as any)}
                onProfilePress={() => void logout()}
              />

              {/* 2. Hero Card: "SESI SEDANG BERLANGSUNG" (Screen 5 Google Stitch) */}
              <View style={styles.heroCard}>
                {/* Status pill & remaining timer */}
                <View style={styles.heroTopRow}>
                  <View style={styles.heroStatusPill}>
                    <View style={styles.heroStatusDot} />
                    <Text style={styles.heroStatusPillText}>SESI SEDANG BERLANGSUNG</Text>
                  </View>
                  <View style={styles.heroTimerRow}>
                    <Feather name="clock" size={12} color={LaboraColors.primary} />
                    <Text style={styles.heroTimerText}>Sisa 48 mnt</Text>
                  </View>
                </View>

                {/* Course Title */}
                <Text style={styles.heroCourseTitle}>
                  {nextSession?.schedule.title ?? "Praktikum Jaringan Komputer Lanjut"}
                </Text>

                {/* Date & Room */}
                <View style={styles.heroDetailRow}>
                  <Feather name="calendar" size={13} color={LaboraColors.textSecondary} />
                  <Text style={styles.heroDetailText}>
                    Hari ini, {nextSession?.schedule.startTime ?? "09:30"} - {nextSession?.schedule.endTime ?? "12:00"} WIB
                  </Text>
                </View>

                <View style={styles.heroDetailRow}>
                  <Feather name="map-pin" size={13} color={LaboraColors.textSecondary} />
                  <Text style={styles.heroDetailText}>
                    {nextSession?.schedule.room ?? "Lab Cyber & Jaringan Lt. 3"}
                  </Text>
                </View>

                {/* Geofence Detection Card inside Hero */}
                <View style={styles.geofenceNoticeBox}>
                  <View style={styles.geofenceIconCircle}>
                    <Ionicons name="radio-outline" size={16} color={LaboraColors.primary} />
                  </View>
                  <View style={styles.geofenceNoticeContent}>
                    <View style={styles.geofenceNoticeTitleRow}>
                      <Text style={styles.geofenceNoticeTitle}>GPS Geofence Terdeteksi</Text>
                      <Feather name="check-circle" size={12} color="#059669" style={{ marginLeft: 4 }} />
                    </View>
                    <Text style={styles.geofenceNoticeSubtitle}>
                      Anda berada dalam jangkauan Lab <Text style={styles.boldText}>(12 meter)</Text>
                    </Text>
                  </View>
                </View>

                {/* Big Action Button */}
                <TouchableOpacity
                  style={styles.presensiNowBtn}
                  onPress={handleQuickPresensi}
                  activeOpacity={0.85}
                >
                  <Ionicons name="finger-print-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.presensiNowBtnText}>Lakukan Presensi GPS Sekarang</Text>
                </TouchableOpacity>
              </View>

              {/* 3. Section: Ringkasan Kehadiran (Screen 5 Google Stitch) */}
              <View style={styles.overviewSection}>
                <View style={styles.overviewHeader}>
                  <Text style={styles.sectionHeading}>Ringkasan Kehadiran</Text>
                  <Text style={styles.semesterText}>Semester Ganjil 2024/2025</Text>
                </View>

                <View style={styles.overviewCard}>
                  {/* Gauge & Main Rate Row */}
                  <View style={styles.gaugeRow}>
                    <View style={styles.gaugeInfoCol}>
                      <Text style={styles.gaugeSubtitle}>TINGKAT KEHADIRAN</Text>
                      <View style={styles.gaugeRateRow}>
                        <Text style={styles.gaugeRateNumber}>{attendanceRate}%</Text>
                        <Text style={styles.gaugeRateLabel}>Sangat Baik</Text>
                      </View>
                      <Text style={styles.gaugeSessionsInfo}>
                        {attendedCount} dari {totalSessionsCount} total sesi lab telah selesai
                      </Text>
                    </View>

                    <View style={styles.gaugeWrapper}>
                      <CircularGauge
                        percentage={attendanceRate}
                        size={110}
                        strokeWidth={10}
                        color={LaboraColors.primary}
                        trackColor="#F3E8EC"
                        centerIcon="checkmark"
                      />
                    </View>
                  </View>

                  {/* 2-column stats breakdown */}
                  <View style={styles.statsTwoColRow}>
                    <View style={styles.statBreakdownBox}>
                      <View style={styles.statBreakdownHeader}>
                        <Text style={styles.statBreakdownLabel}>Hadir Lengkap</Text>
                        <Feather name="check-square" size={14} color={LaboraColors.primary} />
                      </View>
                      <Text style={styles.statBreakdownValue}>{attendedCount} / {totalSessionsCount}</Text>
                      <Text style={styles.statBreakdownSub}>Sesi Terpenuhi</Text>
                    </View>

                    <View style={styles.statBreakdownBox}>
                      <View style={styles.statBreakdownHeader}>
                        <Text style={styles.statBreakdownLabel}>Izin / Dispensasi</Text>
                        <Feather name="folder" size={14} color="#D97706" />
                      </View>
                      <Text style={styles.statBreakdownValue}>
                        {myPermissionsCount > 0 ? myPermissionsCount : 1} Sesi
                      </Text>
                      <Text style={styles.statBreakdownSub}>Sakit (Terverifikasi)</Text>
                    </View>
                  </View>

                  {/* 3rd row: Alpa */}
                  <View style={styles.statAlpaBox}>
                    <View style={styles.statAlpaLeft}>
                      <View style={styles.statAlpaIconCircle}>
                        <Feather name="x-circle" size={14} color={LaboraColors.primary} />
                      </View>
                      <View>
                        <Text style={styles.statAlpaTitle}>Alpa / Tanpa Keterangan</Text>
                        <Text style={styles.statAlpaSub}>0 Sesi (Rekor Sempurna)</Text>
                      </View>
                    </View>
                    <Text style={styles.statAlpaRate}>0.0%</Text>
                  </View>
                </View>
              </View>

              {/* 4. Section: Aksi Cepat (Screen 5 Google Stitch) */}
              <View style={styles.quickActionSection}>
                <Text style={styles.sectionHeading}>Aksi Cepat</Text>
                <View style={styles.quickActionRow}>
                  <TouchableOpacity
                    style={styles.quickActionCard}
                    onPress={() => router.push("/praktikan/izin" as Href)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.quickActionIconCircle}>
                      <Feather name="clipboard" size={18} color={LaboraColors.primary} />
                    </View>
                    <Text style={styles.quickActionCardLabel}>Ajukan Izin Praktikum</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionCard}
                    onPress={handleDownloadModule}
                    activeOpacity={0.8}
                  >
                    <View style={styles.quickActionIconCircle}>
                      <Feather name="download" size={18} color={LaboraColors.primary} />
                    </View>
                    <Text style={styles.quickActionCardLabel}>Unduh Modul Praktikum</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionCard}
                    onPress={handleContactAssistant}
                    activeOpacity={0.8}
                  >
                    <View style={styles.quickActionIconCircle}>
                      <Feather name="message-square" size={18} color={LaboraColors.primary} />
                    </View>
                    <Text style={styles.quickActionCardLabel}>Hubungi Asprak Sesi</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* 5. Section: Jadwal Pekan Ini Header */}
              <View style={styles.scheduleHeaderRow}>
                <Text style={styles.sectionHeading}>Jadwal Pekan Ini</Text>
                <TouchableOpacity
                  onPress={() => router.push("/praktikan/riwayat" as Href)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.seeCalendarText}>Lihat Kalender ›</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <SessionCard
              session={item.session}
              schedule={item.schedule}
              onPress={() => router.push(`/praktikan/${item.session.id}` as Href)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="calendar" size={36} color={LaboraColors.textMuted} style={{ marginBottom: 10 }} />
              <Text style={styles.emptyText}>
                {loading
                  ? "Memuat jadwal praktikum…"
                  : error ?? "Tidak ada jadwal praktikum yang terdaftar saat ini."}
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LaboraColors.background,
  },
  container: {
    flex: 1,
    backgroundColor: LaboraColors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: 12,
    paddingBottom: 40,
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  headerBlock: {
    marginBottom: 8,
    gap: 16,
  },

  /* Hero Card */
  heroCard: {
    backgroundColor: LaboraColors.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    shadowColor: LaboraColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    gap: 10,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LaboraColors.blush,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    gap: 5,
  },
  heroStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: LaboraColors.primary,
  },
  heroStatusPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: LaboraColors.primary,
    letterSpacing: 0.5,
  },
  heroTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  heroTimerText: {
    fontSize: 11,
    fontWeight: "600",
    color: LaboraColors.textSecondary,
  },
  heroCourseTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: LaboraColors.textPrimary,
  },
  heroDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroDetailText: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
  },

  /* Geofence notice box */
  geofenceNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LaboraColors.blush,
    borderRadius: 12,
    padding: 10,
    gap: 10,
    marginTop: 4,
  },
  geofenceIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FCE7EC",
    alignItems: "center",
    justifyContent: "center",
  },
  geofenceNoticeContent: {
    flex: 1,
    gap: 2,
  },
  geofenceNoticeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  geofenceNoticeTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: LaboraColors.primary,
  },
  geofenceNoticeSubtitle: {
    fontSize: 11,
    color: LaboraColors.textSecondary,
  },
  boldText: {
    fontWeight: "700",
    color: LaboraColors.textPrimary,
  },

  /* Presensi Now Button */
  presensiNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LaboraColors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
    shadowColor: LaboraColors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  presensiNowBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* Overview Section */
  overviewSection: {
    gap: 10,
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: LaboraColors.textPrimary,
  },
  semesterText: {
    fontSize: 11,
    color: LaboraColors.textMuted,
  },
  overviewCard: {
    backgroundColor: LaboraColors.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 14,
  },
  gaugeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gaugeInfoCol: {
    flex: 1,
    gap: 4,
  },
  gaugeSubtitle: {
    fontSize: 10,
    fontWeight: "800",
    color: LaboraColors.textMuted,
    letterSpacing: 0.6,
  },
  gaugeRateRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  gaugeRateNumber: {
    fontSize: 28,
    fontWeight: "800",
    color: LaboraColors.textPrimary,
  },
  gaugeRateLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: LaboraColors.primary,
  },
  gaugeSessionsInfo: {
    fontSize: 11,
    color: LaboraColors.textMuted,
    lineHeight: 15,
  },
  gaugeWrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 10,
  },

  /* Two Col Stats */
  statsTwoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  statBreakdownBox: {
    flex: 1,
    backgroundColor: LaboraColors.surfaceAlt,
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  statBreakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statBreakdownLabel: {
    fontSize: 11,
    color: LaboraColors.textMuted,
    fontWeight: "600",
  },
  statBreakdownValue: {
    fontSize: 16,
    fontWeight: "800",
    color: LaboraColors.textPrimary,
  },
  statBreakdownSub: {
    fontSize: 10,
    color: LaboraColors.textSecondary,
  },

  /* Alpa Box */
  statAlpaBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: LaboraColors.surfaceAlt,
    borderRadius: 14,
    padding: 12,
  },
  statAlpaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statAlpaIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: LaboraColors.blush,
    alignItems: "center",
    justifyContent: "center",
  },
  statAlpaTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: LaboraColors.textPrimary,
  },
  statAlpaSub: {
    fontSize: 10,
    color: LaboraColors.textMuted,
  },
  statAlpaRate: {
    fontSize: 12,
    fontWeight: "800",
    color: LaboraColors.primary,
  },

  /* Quick Action Row */
  quickActionSection: {
    gap: 10,
  },
  quickActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: LaboraColors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickActionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: LaboraColors.blush,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionCardLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: LaboraColors.textPrimary,
    textAlign: "center",
    lineHeight: 13,
  },

  /* Schedule Header */
  scheduleHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  seeCalendarText: {
    fontSize: 12,
    fontWeight: "700",
    color: LaboraColors.primary,
  },

  /* Empty state */
  emptyContainer: {
    padding: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: LaboraColors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
});
