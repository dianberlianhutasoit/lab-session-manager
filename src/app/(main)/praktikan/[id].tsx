import React, { useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather, Ionicons } from "@expo/vector-icons";
import PresensiModal from "@/components/praktikan/PresensiModal";
import { useSessionContext } from "@/context/session-context";
import { useAuth } from "@/context/auth-context";
import { MemphisColors } from "@/constants/theme";

export default function PraktikanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [isModalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const { sessions, schedules, users, attendance, recordAttendance, loading } =
    useSessionContext();
  const { profile } = useAuth();

  const session = sessions.find((item) => item.id === id);
  const schedule = session
    ? schedules.find((item) => item.id === session.scheduleId)
    : undefined;
  const assistant = session
    ? users.find((item) => item.id === session.assistantId)
    : undefined;
  const practitioner = profile;
  const attendanceRecord =
    session && practitioner
      ? attendance.find(
          (item) => item.sessionId === session.id && item.userId === practitioner.id
        )
      : undefined;

  if (!session || !schedule) {
    if (loading) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <ActivityIndicator color={MemphisColors.teal} size="large" />
          </View>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.centerContainer}>
          <Text style={styles.errorTitle}>Sesi Tidak Ditemukan</Text>
          <Text style={styles.errorText}>
            Informasi sesi praktikum ini tidak tersedia atau sudah dihapus.
          </Text>
          <TouchableOpacity
            style={styles.backButtonPill}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonPillText}>Kembali ke Jadwal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isOpen = session.status === "OPEN";
  const hasAttended = attendanceRecord !== undefined;

  const handlePresensi = async () => {
    if (!isOpen || hasAttended || !practitioner) return;
    setSubmitting(true);
    setAttendanceError("");
    try {
      const created = await recordAttendance(
        session.id,
        practitioner.id,
        new Date().toISOString()
      );
      if (!created) {
        setAttendanceError("Presensi untuk sesi ini sudah tercatat sebelumnya.");
      }
      setModalVisible(false);
    } catch (cause) {
      setAttendanceError(
        cause instanceof Error
          ? cause.message
          : "Presensi gagal disimpan. Pastikan Anda berada dalam jangkauan lab."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* 1. Visual Hero Header (sesuai Layar Kanan Mockup) */}
          <View style={styles.heroBanner}>
            <View style={styles.bannerBackground}>
              <Ionicons
                name="laptop-outline"
                size={90}
                color="rgba(37, 99, 235, 0.15)"
              />
            </View>

            {/* Floating Circular Navigation Buttons */}
            <View style={styles.floatingNavRow}>
              <TouchableOpacity
                style={styles.circleNavButton}
                onPress={() => router.back()}
                activeOpacity={0.8}
              >
                <Feather name="chevron-left" size={22} color={MemphisColors.navy} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.circleNavButton}
                onPress={() => router.push("/maps" as any)}
                activeOpacity={0.8}
              >
                <Feather name="map-pin" size={18} color={MemphisColors.teal} />
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. Curved Main Content Sheet (sesuai Layar Kanan Mockup) */}
          <View style={styles.sheetCard}>
            {/* Title & Status */}
            <View style={styles.headerInfo}>
              <View style={styles.titleWrap}>
                <Text style={styles.courseCodeBadge}>{schedule.courseCode}</Text>
                <Text style={styles.titleText}>{schedule.title}</Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  isOpen ? styles.statusBadgeOpen : styles.statusBadgeClosed,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    isOpen ? styles.statusTextOpen : styles.statusTextClosed,
                  ]}
                >
                  {isOpen ? "BUKA (OPEN)" : "TERTUTUP"}
                </Text>
              </View>
            </View>

            {/* Sub-info rating / metadata */}
            <View style={styles.ratingRow}>
              <Feather name="calendar" size={14} color={MemphisColors.teal} />
              <Text style={styles.ratingText}>{schedule.date}</Text>
              <Text style={styles.ratingDot}>·</Text>
              <Text style={styles.ratingSubText}>Semester Ganjil 2026/2027</Text>
            </View>

            {/* 3. 4-Feature Highlights Grid (sesuai Mockup Kanan) */}
            <View style={styles.featureGrid}>
              <View style={styles.featureItem}>
                <View style={styles.featureIconCircle}>
                  <Feather name="map-pin" size={18} color={MemphisColors.teal} />
                </View>
                <Text style={styles.featureLabel}>Ruangan Lab</Text>
                <Text style={styles.featureValue} numberOfLines={1}>
                  {schedule.room}
                </Text>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconCircle}>
                  <Feather name="clock" size={18} color={MemphisColors.teal} />
                </View>
                <Text style={styles.featureLabel}>Waktu</Text>
                <Text style={styles.featureValue} numberOfLines={1}>
                  {schedule.startTime}–{schedule.endTime}
                </Text>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconCircle}>
                  <Feather name="user" size={18} color={MemphisColors.teal} />
                </View>
                <Text style={styles.featureLabel}>Asisten Lab</Text>
                <Text style={styles.featureValue} numberOfLines={1}>
                  {assistant?.name ?? "Asisten"}
                </Text>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconCircle}>
                  <Feather name="shield" size={18} color={MemphisColors.teal} />
                </View>
                <Text style={styles.featureLabel}>Verifikasi</Text>
                <Text style={styles.featureValue} numberOfLines={1}>
                  GPS Presensi
                </Text>
              </View>
            </View>

            {/* 4. Treatment / Session Overview */}
            <View style={styles.overviewSection}>
              <Text style={styles.sectionHeading}>Instruksi & Tata Tertib Praktikum</Text>
              <Text style={styles.overviewParagraph}>
                Praktikan diwajibkan telah hadir di ruangan laboratorium sebelum sesi
                dimulai. Pastikan GPS perangkat Anda aktif untuk memverifikasi
                kehadiran geofence di lokasi lab yang sesuai.
              </Text>
              <TouchableOpacity
                style={styles.learnMoreRow}
                onPress={() => router.push("/maps" as any)}
                activeOpacity={0.7}
              >
                <Text style={styles.learnMoreText}>Cek Lokasi di Peta Lab</Text>
                <Feather name="arrow-right" size={14} color={MemphisColors.teal} />
              </TouchableOpacity>
            </View>

            {/* Result Badge if already attended */}
            {hasAttended && (
              <View style={styles.attendanceSuccessBox}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <View style={styles.attendanceSuccessTextCol}>
                  <Text style={styles.attendanceSuccessTitle}>
                    Kehadiran Anda Sudah Tercatat
                  </Text>
                  <Text style={styles.attendanceSuccessSubtitle}>
                    Pukul: {formatAttendanceTime(attendanceRecord.recordedAt)} WIB
                  </Text>
                </View>
              </View>
            )}

            {!!attendanceError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorAlertText}>{attendanceError}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* 5. Sticky Bottom CTA Bar (sesuai Layar Kanan Mockup: Deep Navy Pill with Arrow) */}
        {!hasAttended ? (
          <View style={styles.bottomBarContainer}>
            <TouchableOpacity
              style={[
                styles.stickyCtaPill,
                (!isOpen || submitting) && styles.stickyCtaPillDisabled,
              ]}
              disabled={!isOpen || submitting}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.85}
            >
              <View style={styles.ctaTextCol}>
                <Text style={styles.ctaMainTitle}>
                  {submitting
                    ? "Menyimpan Kehadiran…"
                    : isOpen
                    ? "Lakukan Presensi Kehadiran"
                    : "Sesi Praktikum Tertutup"}
                </Text>
                <Text style={styles.ctaSubtitle}>
                  {isOpen
                    ? "Klik untuk memverifikasi lokasi lab"
                    : "Menunggu asisten membuka sesi"}
                </Text>
              </View>

              {/* White Circular Arrow Button */}
              <View style={styles.ctaArrowCircle}>
                {submitting ? (
                  <ActivityIndicator size="small" color={MemphisColors.navy} />
                ) : (
                  <Feather
                    name="arrow-right"
                    size={20}
                    color={isOpen ? MemphisColors.navy : "#94A3B8"}
                  />
                )}
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Presensi Modal */}
        <PresensiModal
          visible={isModalVisible && isOpen && !hasAttended}
          sessionTitle={schedule.title}
          onCancel={() => setModalVisible(false)}
          onConfirm={handlePresensi}
        />
      </View>
    </SafeAreaView>
  );
}

function formatAttendanceTime(recordedAt: string) {
  try {
    const d = new Date(recordedAt);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "-";
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  scrollContent: {
    paddingBottom: 110,
  },
  heroBanner: {
    height: 190,
    backgroundColor: MemphisColors.mintSurface,
    position: "relative",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    overflow: "hidden",
  },
  bannerBackground: {
    position: "absolute",
    bottom: -10,
    right: 20,
    opacity: 0.6,
  },
  floatingNavRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  circleNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0B192C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  sheetCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 32,
    shadowColor: "#0B192C",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 4,
  },
  headerInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 12,
  },
  titleWrap: {
    flex: 1,
  },
  courseCodeBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: MemphisColors.teal,
    letterSpacing: 1,
    marginBottom: 4,
  },
  titleText: {
    fontSize: 22,
    fontWeight: "800",
    color: MemphisColors.navy,
    lineHeight: 28,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
  },
  statusBadgeOpen: {
    backgroundColor: "#ECFDF5",
  },
  statusBadgeClosed: {
    backgroundColor: "#F1F5F9",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  statusTextOpen: {
    color: "#059669",
  },
  statusTextClosed: {
    color: "#64748B",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: "700",
    color: MemphisColors.navy,
  },
  ratingDot: {
    color: MemphisColors.muted,
    fontSize: 14,
  },
  ratingSubText: {
    fontSize: 13,
    color: MemphisColors.muted,
  },
  featureGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: MemphisColors.cardBorder,
    marginBottom: 24,
  },
  featureItem: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 2,
  },
  featureIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  featureLabel: {
    fontSize: 11,
    color: MemphisColors.muted,
    fontWeight: "500",
    marginBottom: 2,
    textAlign: "center",
  },
  featureValue: {
    fontSize: 12,
    fontWeight: "700",
    color: MemphisColors.navy,
    textAlign: "center",
  },
  overviewSection: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    color: MemphisColors.navy,
    marginBottom: 8,
  },
  overviewParagraph: {
    fontSize: 14,
    color: MemphisColors.slate,
    lineHeight: 22,
    marginBottom: 12,
  },
  learnMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  learnMoreText: {
    fontSize: 13,
    fontWeight: "700",
    color: MemphisColors.teal,
  },
  attendanceSuccessBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    marginTop: 10,
  },
  attendanceSuccessTextCol: {
    flex: 1,
  },
  attendanceSuccessTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#065F46",
  },
  attendanceSuccessSubtitle: {
    fontSize: 12,
    color: "#047857",
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginTop: 12,
  },
  errorAlertText: {
    fontSize: 13,
    color: MemphisColors.error,
    textAlign: "center",
  },
  bottomBarContainer: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
  },
  stickyCtaPill: {
    height: 64,
    borderRadius: 32,
    backgroundColor: MemphisColors.navy,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    shadowColor: MemphisColors.navy,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  stickyCtaPillDisabled: {
    backgroundColor: "#475569",
    opacity: 0.85,
  },
  ctaTextCol: {
    flex: 1,
  },
  ctaMainTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  ctaSubtitle: {
    fontSize: 11,
    color: "#93C5FD",
    marginTop: 2,
  },
  ctaArrowCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: MemphisColors.navy,
    marginBottom: 6,
  },
  errorText: {
    fontSize: 14,
    color: MemphisColors.muted,
    textAlign: "center",
    marginBottom: 16,
  },
  backButtonPill: {
    backgroundColor: MemphisColors.teal,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 22,
  },
  backButtonPillText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
});
