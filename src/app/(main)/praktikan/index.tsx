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
import { MemphisColors } from "@/constants/theme";

type ScheduledSession = { session: Session; schedule: Schedule };

export default function PraktikanJadwalScreen() {
  const router = useRouter();
  const { schedules, sessions, attendance, permissions, loading, error } =
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

  const attendanceRate = useMemo(() => {
    if (scheduledSessions.length === 0) return 100;
    const rate = Math.round((myAttendanceCount / scheduledSessions.length) * 100);
    return Math.min(100, Math.max(0, rate));
  }, [myAttendanceCount, scheduledSessions.length]);

  const initial = profile?.name?.trim().charAt(0).toUpperCase() || "M";

  const handleNotificationPress = () => {
    Alert.alert(
      "Notifikasi Praktikum",
      "Tidak ada pengumuman mendesak baru hari ini. Pastikan hadir tepat waktu sebelum sesi dibuka.",
      [{ text: "Mengerti" }]
    );
  };

  const handleQuickPresensi = () => {
    if (nextSession) {
      router.push(`/praktikan/${nextSession.session.id}` as Href);
    } else {
      Alert.alert("Presensi Lab", "Belum ada sesi praktikum yang tersedia.");
    }
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
              {/* 1. Top Profile Bar (sesuai Mockup Kiri) */}
              <View style={styles.topProfileBar}>
                <View style={styles.profileLeft}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  </View>
                  <View style={styles.greetingCol}>
                    <Text style={styles.greetingText}>Good Morning,</Text>
                    <Text style={styles.userName} numberOfLines={1}>
                      {profile?.name ?? "Sara Wilson"}
                    </Text>
                  </View>
                </View>

                <View style={styles.profileRight}>
                  {/* Notification Bell with Badge */}
                  <TouchableOpacity
                    style={styles.bellButton}
                    onPress={handleNotificationPress}
                    activeOpacity={0.8}
                  >
                    <Feather name="bell" size={20} color={MemphisColors.navy} />
                    <View style={styles.bellBadgeDot} />
                  </TouchableOpacity>

                  {/* Minimal Logout Button */}
                  <TouchableOpacity
                    style={styles.logoutIconButton}
                    onPress={() => void logout()}
                    activeOpacity={0.8}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="log-out" size={18} color={MemphisColors.error} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* 2. Hero Card: "Your Next Appointment" -> "Sesi Praktikum Berikutnya" */}
              <View style={styles.heroCard}>
                <View style={styles.heroLeft}>
                  <Text style={styles.heroSubtitle}>SESI PRAKTIKUM BERIKUTNYA</Text>
                  {nextSession ? (
                    <>
                      <Text style={styles.heroDateNumber}>
                        {nextSession.schedule.date.slice(0, 2) || "08"}
                      </Text>
                      <Text style={styles.heroDateSub}>
                        {nextSession.schedule.date} · {nextSession.schedule.startTime} WIB
                      </Text>
                      <Text style={styles.heroCourseTitle} numberOfLines={1}>
                        {nextSession.schedule.title}
                      </Text>
                      <View style={styles.heroBadgeRow}>
                        <View
                          style={[
                            styles.heroStatusBadge,
                            nextSession.session.status === "OPEN"
                              ? styles.heroStatusOpen
                              : styles.heroStatusClosed,
                          ]}
                        >
                          <Text
                            style={[
                              styles.heroStatusText,
                              nextSession.session.status === "OPEN"
                                ? styles.heroStatusOpenText
                                : styles.heroStatusClosedText,
                            ]}
                          >
                            {nextSession.session.status === "OPEN"
                              ? "SEDANG DIBUKA"
                              : "TERJADWAL"}
                          </Text>
                        </View>
                        <Text style={styles.heroRoomText}>
                          📍 {nextSession.schedule.room}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <Text style={styles.heroEmptyText}>
                      Semua sesi praktikum telah selesai atau belum dimulai.
                    </Text>
                  )}
                </View>

                <View style={styles.heroRight}>
                  {/* Technology / Stethoscope Illustration Icon */}
                  <View style={styles.heroGraphicCircle}>
                    <Ionicons name="hardware-chip-outline" size={42} color="#93C5FD" />
                  </View>
                </View>
              </View>

              {/* 3. Overview Card: "Health Overview" -> "Ringkasan Kehadiran" */}
              <View style={styles.overviewCard}>
                <View style={styles.overviewHeader}>
                  <Text style={styles.overviewTitle}>Ringkasan Kehadiran</Text>
                  <View style={styles.dropdownPill}>
                    <Text style={styles.dropdownPillText}>Semester Ini ⌄</Text>
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  {/* Metric 1 */}
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Sesi Diikuti</Text>
                    <View style={styles.metricValueRow}>
                      <Text style={styles.metricNumber}>{scheduledSessions.length}</Text>
                      <Text style={styles.metricUnit}>sesi</Text>
                    </View>
                    <Feather
                      name="calendar"
                      size={14}
                      color={MemphisColors.teal}
                      style={styles.metricIcon}
                    />
                  </View>

                  <View style={styles.metricDivider} />

                  {/* Metric 2 */}
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Tingkat Hadir</Text>
                    <View style={styles.metricValueRow}>
                      <Text style={styles.metricNumber}>{attendanceRate}%</Text>
                      <Text style={styles.metricUnit}>hadir</Text>
                    </View>
                    <Feather
                      name="check-circle"
                      size={14}
                      color="#10B981"
                      style={styles.metricIcon}
                    />
                  </View>

                  <View style={styles.metricDivider} />

                  {/* Metric 3 */}
                  <View style={styles.metricCol}>
                    <Text style={styles.metricLabel}>Izin / Sakit</Text>
                    <View style={styles.metricValueRow}>
                      <Text style={styles.metricNumber}>{myPermissionsCount}</Text>
                      <Text style={styles.metricUnit}>izin</Text>
                    </View>
                    <Feather
                      name="file-text"
                      size={14}
                      color="#F59E0B"
                      style={styles.metricIcon}
                    />
                  </View>
                </View>
              </View>

              {/* 4. Quick Access Row (sesuai Mockup Kiri) */}
              <View style={styles.quickAccessSection}>
                <Text style={styles.quickAccessHeading}>Quick Access</Text>
                <View style={styles.quickAccessRow}>
                  {/* Quick Action 1: Presensi Lab */}
                  <TouchableOpacity
                    style={styles.quickActionItem}
                    onPress={handleQuickPresensi}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickActionCircle, styles.quickActionCircleActive]}>
                      <Feather name="user-check" size={20} color={MemphisColors.teal} />
                    </View>
                    <Text style={styles.quickActionLabel}>Presensi</Text>
                  </TouchableOpacity>

                  {/* Quick Action 2: Ajukan Izin */}
                  <TouchableOpacity
                    style={styles.quickActionItem}
                    onPress={() => router.push("/praktikan/izin" as Href)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.quickActionCircle}>
                      <Feather name="file-text" size={20} color={MemphisColors.slate} />
                    </View>
                    <Text style={styles.quickActionLabel}>Ajukan Izin</Text>
                  </TouchableOpacity>

                  {/* Quick Action 3: Riwayat */}
                  <TouchableOpacity
                    style={styles.quickActionItem}
                    onPress={() => router.push("/praktikan/riwayat" as Href)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.quickActionCircle}>
                      <Feather name="clock" size={20} color={MemphisColors.slate} />
                    </View>
                    <Text style={styles.quickActionLabel}>Riwayat</Text>
                  </TouchableOpacity>

                  {/* Quick Action 4: Peta Lab */}
                  <TouchableOpacity
                    style={styles.quickActionItem}
                    onPress={() => router.push("/maps" as Href)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.quickActionCircle}>
                      <Feather name="map-pin" size={20} color={MemphisColors.slate} />
                    </View>
                    <Text style={styles.quickActionLabel}>Peta Lab</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Section Header untuk List Jadwal */}
              <View style={styles.scheduleListHeader}>
                <Text style={styles.scheduleListTitle}>Jadwal Praktikum Anda</Text>
                <Text style={styles.scheduleListCount}>
                  ({scheduledSessions.length} Sesi)
                </Text>
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
              <Feather name="calendar" size={36} color={MemphisColors.muted} style={{ marginBottom: 10 }} />
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
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: MemphisColors.surface,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  headerBlock: {
    marginBottom: 8,
  },
  topProfileBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingTop: 8,
  },
  profileLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#0B192C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarInitial: {
    fontSize: 20,
    fontWeight: "800",
    color: MemphisColors.teal,
  },
  greetingCol: {
    justifyContent: "center",
  },
  greetingText: {
    fontSize: 13,
    color: MemphisColors.muted,
    fontWeight: "500",
  },
  userName: {
    fontSize: 20,
    fontWeight: "800",
    color: MemphisColors.navy,
  },
  profileRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: MemphisColors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#0B192C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  bellBadgeDot: {
    position: "absolute",
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  logoutIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  heroCard: {
    backgroundColor: MemphisColors.navy,
    borderRadius: 24,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    shadowColor: MemphisColors.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 6,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 10,
  },
  heroSubtitle: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  heroDateNumber: {
    color: "#FFFFFF",
    fontSize: 40,
    fontWeight: "800",
    lineHeight: 44,
  },
  heroDateSub: {
    color: "#E2E8F0",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 6,
  },
  heroCourseTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 8,
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  heroStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  heroStatusOpen: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
  heroStatusOpenText: {
    color: "#34D399",
    fontSize: 10,
    fontWeight: "800",
  },
  heroStatusClosed: {
    backgroundColor: "rgba(148, 163, 184, 0.2)",
  },
  heroStatusClosedText: {
    color: "#CBD5E1",
    fontSize: 10,
    fontWeight: "700",
  },
  heroStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  heroRoomText: {
    color: "#93C5FD",
    fontSize: 12,
    fontWeight: "600",
  },
  heroEmptyText: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 6,
  },
  heroRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  heroGraphicCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  overviewCard: {
    backgroundColor: MemphisColors.mintSurface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#DBEAFE",
    padding: 18,
    marginBottom: 20,
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  overviewTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: MemphisColors.navy,
  },
  dropdownPill: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  dropdownPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: MemphisColors.teal,
  },
  metricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricCol: {
    flex: 1,
    alignItems: "center",
  },
  metricDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#DBEAFE",
  },
  metricLabel: {
    fontSize: 12,
    color: MemphisColors.muted,
    fontWeight: "500",
    marginBottom: 4,
  },
  metricValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    marginBottom: 4,
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: "800",
    color: MemphisColors.navy,
  },
  metricUnit: {
    fontSize: 11,
    color: MemphisColors.muted,
    fontWeight: "600",
  },
  metricIcon: {
    marginTop: 2,
  },
  quickAccessSection: {
    marginBottom: 20,
  },
  quickAccessHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: MemphisColors.navy,
    marginBottom: 14,
  },
  quickAccessRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  quickActionItem: {
    alignItems: "center",
    width: 72,
  },
  quickActionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: MemphisColors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#0B192C",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionCircleActive: {
    backgroundColor: MemphisColors.blueActiveCircle,
    borderColor: "#BFDBFE",
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: MemphisColors.slate,
    textAlign: "center",
  },
  scheduleListHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 12,
    paddingTop: 4,
  },
  scheduleListTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: MemphisColors.navy,
  },
  scheduleListCount: {
    fontSize: 12,
    fontWeight: "600",
    color: MemphisColors.muted,
  },
  emptyContainer: {
    padding: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: MemphisColors.muted,
    fontSize: 14,
    textAlign: "center",
  },
});
