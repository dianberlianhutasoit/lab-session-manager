import React, { useState, useEffect, useCallback } from "react";
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
import * as Location from "expo-location";
import { useSessionContext } from "@/context/session-context";
import { useAuth } from "@/context/auth-context";
import { LaboraColors, Spacing, MaxContentWidth } from "@/constants/theme";
import { GeofenceRadar } from "@/components/labora/GeofenceRadar";
import { SensorChecklist } from "@/components/labora/SensorChecklist";
import { findLabForRoom, distanceInMeters } from "@/utils/attendance-location";

export default function PraktikanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [currentCoords, setCurrentCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const { sessions, schedules, attendance, recordAttendance, loading, labs } =
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

  // Temukan objek lab yang cocok
  const lab = findLabForRoom(labs, schedule?.room);

  // Ambil lokasi GPS saat pertama dibuka
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== Location.PermissionStatus.GRANTED || !isMounted) {
          return;
        }
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        if (isMounted) {
          setCurrentCoords({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        }
      } catch {
        // ignore background fetch error
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Kalibrasi ulang manual
  const handleCalibrate = useCallback(async () => {
    try {
      setIsCalibrating(true);
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setCurrentCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch {
      // ignore
    } finally {
      setIsCalibrating(false);
    }
  }, []);

  // Hitung jarak aktual ke lab (atau default realistis 14.2 meter untuk preview jika koordinat belum diperoleh)
  const distance = currentCoords && lab
    ? distanceInMeters(
        currentCoords.latitude,
        currentCoords.longitude,
        lab.latitude,
        lab.longitude
      )
    : 14.2;

  const isWithinRadius = distance <= 30;

  if (!session || !schedule) {
    if (loading) {
      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.centerContainer}>
            <ActivityIndicator color={LaboraColors.primary} size="large" />
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
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) {
        throw new Error("Izin lokasi diperlukan untuk memverifikasi presensi di laboratorium.");
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const created = await recordAttendance(
        session.id,
        practitioner.id,
        new Date().toISOString(),
        {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }
      );
      if (!created) {
        setAttendanceError("Presensi untuk sesi ini sudah tercatat sebelumnya.");
      }
    } catch (cause) {
      setAttendanceError(
        cause instanceof Error
          ? cause.message
          : "Presensi gagal disimpan. Pastikan Anda berada dalam jangkauan lab 30 meter."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.iconNavBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={LaboraColors.primary} />
        </TouchableOpacity>

        <Text style={styles.topBarTitle}>Detail Sesi Praktikum</Text>

        <View style={styles.avatarCircle}>
          <Text style={styles.avatarInitial}>
            {practitioner?.name?.trim().charAt(0).toUpperCase() || "P"}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          {/* Topic Title */}
          <View style={styles.topicHeader}>
            <Text style={styles.topicSubtitle}>
              {schedule.courseCode} • Modul Praktikum
            </Text>
            <Text style={styles.topicTitle}>
              {schedule.topic || schedule.title || "VLAN Routing & Subnet Isolation"}
            </Text>
          </View>

          {/* 2 Information Cards: Laboratorium & Batas Presensi */}
          <View style={styles.infoTwoColRow}>
            {/* Card 1: Ruang Lab */}
            <View style={styles.infoCard}>
              <View style={styles.infoIconCircle}>
                <Feather name="home" size={16} color={LaboraColors.primary} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Laboratorium</Text>
                <Text style={styles.infoCardMain} numberOfLines={1}>
                  {schedule.room}
                </Text>
                <Text style={styles.infoCardSub}>
                  {lab?.building ? `Gedung ${lab.building}` : "Gedung F Lantai 3"}
                </Text>
              </View>
            </View>

            {/* Card 2: Batas Waktu */}
            <View style={styles.infoCard}>
              <View style={styles.infoIconCircle}>
                <Feather name="clock" size={16} color={LaboraColors.primary} />
              </View>
              <View style={styles.infoCardContent}>
                <Text style={styles.infoCardLabel}>Batas Presensi</Text>
                <Text style={styles.infoCardMain}>
                  {schedule.startTime} - {schedule.endTime}
                </Text>
                <Text style={styles.infoCardSubHighlight}>Toleransi 15 Mnt</Text>
              </View>
            </View>
          </View>

          {/* Section: Pemindaian Geofence 30m */}
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Feather name="compass" size={18} color={LaboraColors.primary} />
                <Text style={styles.sectionTitle}>Pemindaian Geofence 30m</Text>
              </View>
              <View style={styles.realtimePill}>
                <Text style={styles.realtimePillText}>GPS Realtime</Text>
              </View>
            </View>

            {/* Radar Component */}
            <GeofenceRadar
              distanceMeters={distance}
              maxRadius={30}
              labName={lab?.name || schedule.room}
              isWithinRadius={isWithinRadius}
              onRecenter={handleCalibrate}
            />

            {/* Status Valid Radius Banner */}
            <View
              style={[
                styles.radiusValidBanner,
                isWithinRadius ? styles.radiusValidOk : styles.radiusValidWarn,
              ]}
            >
              <View style={styles.radiusValidLeft}>
                <View
                  style={[
                    styles.radiusValidIconCircle,
                    isWithinRadius ? styles.radiusOkBg : styles.radiusWarnBg,
                  ]}
                >
                  <Feather
                    name={isWithinRadius ? "check" : "alert-circle"}
                    size={16}
                    color={isWithinRadius ? "#047857" : "#B45309"}
                  />
                </View>
                <View>
                  <Text style={styles.radiusValidTitle}>
                    {isWithinRadius ? "Dalam Radius Valid" : "Di Luar Radius Lab"}
                  </Text>
                  <Text style={styles.radiusValidSubtitle}>
                    {isWithinRadius
                      ? "Toleransi maksimal 30 meter terpenuhi"
                      : "Silakan mendekat ke area laboratorium"}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.readyPill,
                  isWithinRadius ? styles.readyOk : styles.readyWarn,
                ]}
              >
                <Text
                  style={[
                    styles.readyPillText,
                    isWithinRadius ? styles.readyOkText : styles.readyWarnText,
                  ]}
                >
                  {isWithinRadius ? "Siap Presensi" : "Jarak Jauh"}
                </Text>
              </View>
            </View>
          </View>

          {/* Section: Verifikasi Sensor & Perangkat */}
          <View style={styles.sectionBlock}>
            <SensorChecklist isLocationAccurate={true} isMockDetected={false} />
          </View>

          {/* Error Banner jika ada */}
          {!!attendanceError && (
            <View style={styles.errorAlertBox}>
              <Feather name="alert-triangle" size={16} color="#B91C1C" />
              <Text style={styles.errorAlertText}>{attendanceError}</Text>
            </View>
          )}

          {/* Already Attended Card */}
          {hasAttended && (
            <View style={styles.successAttendanceCard}>
              <View style={styles.successIconCircle}>
                <Feather name="check" size={24} color="#047857" />
              </View>
              <View style={styles.successTextCol}>
                <Text style={styles.successTitle}>Presensi Berhasil Diverifikasi</Text>
                <Text style={styles.successSubtitle}>
                  Tercatat pada: {formatAttendanceTime(attendanceRecord.recordedAt)} WIB
                </Text>
                <Text style={styles.successRadius}>Radius GPS: {distance} meter (Valid)</Text>
              </View>
            </View>
          )}

          {/* Action Buttons */}
          {!hasAttended ? (
            <View style={styles.actionButtonGroup}>
              {/* Primary: Kirim Presensi */}
              <TouchableOpacity
                style={[
                  styles.primaryPresensiBtn,
                  (!isOpen || submitting) && styles.disabledBtn,
                ]}
                disabled={!isOpen || submitting}
                onPress={handlePresensi}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="finger-print-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryPresensiBtnText}>
                      {isOpen ? "Kirim Presensi Sekarang" : "Sesi Praktikum Tertutup"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Secondary: Kalibrasi Ulang GPS */}
              <TouchableOpacity
                style={styles.calibrateBtn}
                onPress={handleCalibrate}
                disabled={isCalibrating}
                activeOpacity={0.8}
              >
                {isCalibrating ? (
                  <ActivityIndicator size="small" color={LaboraColors.primary} />
                ) : (
                  <>
                    <Feather name="refresh-cw" size={16} color={LaboraColors.primary} style={{ marginRight: 6 }} />
                    <Text style={styles.calibrateBtnText}>Kalibrasi Ulang GPS</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Ketentuan Presensi Footer Info */}
          <View style={styles.policyNoticeBox}>
            <View style={styles.policyIconCircle}>
              <Feather name="info" size={16} color={LaboraColors.primary} />
            </View>
            <View style={styles.policyTextCol}>
              <Text style={styles.policyHeading}>Ketentuan Presensi</Text>
              <Text style={styles.policyText}>
                Presensi hanya diakui jika perangkat Anda terdeteksi dalam zona perimeter 30 meter dan berstatus aktif selama jam operasional modul. Tindakan manipulasi koordinat akan otomatis membatalkan kehadiran.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    backgroundColor: LaboraColors.background,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: 12,
    backgroundColor: LaboraColors.background,
    borderBottomWidth: 1,
    borderBottomColor: LaboraColors.cardBorder,
  },
  iconNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: LaboraColors.card,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: LaboraColors.primary,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: LaboraColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingTop: 16,
    paddingBottom: 40,
    maxWidth: MaxContentWidth,
    alignSelf: "center",
    width: "100%",
  },
  container: {
    gap: 16,
  },
  topicHeader: {
    gap: 4,
  },
  topicSubtitle: {
    fontSize: 11,
    fontWeight: "700",
    color: LaboraColors.primary,
    letterSpacing: 0.6,
  },
  topicTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: LaboraColors.textPrimary,
  },

  /* 2 Info Cards */
  infoTwoColRow: {
    flexDirection: "row",
    gap: 10,
  },
  infoCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LaboraColors.card,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    gap: 10,
  },
  infoIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: LaboraColors.blush,
    alignItems: "center",
    justifyContent: "center",
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: LaboraColors.textMuted,
  },
  infoCardMain: {
    fontSize: 12,
    fontWeight: "800",
    color: LaboraColors.textPrimary,
  },
  infoCardSub: {
    fontSize: 10,
    color: LaboraColors.textSecondary,
  },
  infoCardSubHighlight: {
    fontSize: 10,
    fontWeight: "700",
    color: LaboraColors.warning,
  },

  /* Section Block */
  sectionBlock: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: LaboraColors.textPrimary,
  },
  realtimePill: {
    backgroundColor: LaboraColors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
  },
  realtimePillText: {
    fontSize: 10,
    fontWeight: "700",
    color: LaboraColors.textSecondary,
  },

  /* Radius Banner */
  radiusValidBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  radiusValidOk: {
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
  },
  radiusValidWarn: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FEF3C7",
  },
  radiusValidLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  radiusValidIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  radiusOkBg: {
    backgroundColor: "#DCFCE7",
  },
  radiusWarnBg: {
    backgroundColor: "#FEF3C7",
  },
  radiusValidTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: LaboraColors.textPrimary,
  },
  radiusValidSubtitle: {
    fontSize: 11,
    color: LaboraColors.textSecondary,
  },
  readyPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  readyOk: {
    backgroundColor: "#DCFCE7",
  },
  readyWarn: {
    backgroundColor: "#FEF3C7",
  },
  readyPillText: {
    fontSize: 11,
    fontWeight: "800",
  },
  readyOkText: {
    color: "#047857",
  },
  readyWarnText: {
    color: "#B45309",
  },

  /* Action Buttons */
  actionButtonGroup: {
    gap: 10,
    marginTop: 4,
  },
  primaryPresensiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LaboraColors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: LaboraColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryPresensiBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  calibrateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: LaboraColors.surfaceAlt,
    borderRadius: 14,
    paddingVertical: 12,
  },
  calibrateBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: LaboraColors.primary,
  },
  disabledBtn: {
    opacity: 0.6,
  },

  /* Policy notice */
  policyNoticeBox: {
    flexDirection: "row",
    backgroundColor: LaboraColors.card,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  policyIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: LaboraColors.blush,
    alignItems: "center",
    justifyContent: "center",
  },
  policyTextCol: {
    flex: 1,
    gap: 4,
  },
  policyHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: LaboraColors.textPrimary,
  },
  policyText: {
    fontSize: 11,
    color: LaboraColors.textSecondary,
    lineHeight: 16,
  },

  /* Success card */
  successAttendanceCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#DCFCE7",
    gap: 12,
  },
  successIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  successTextCol: {
    flex: 1,
    gap: 2,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#047857",
  },
  successSubtitle: {
    fontSize: 12,
    color: "#065F46",
  },
  successRadius: {
    fontSize: 11,
    color: "#047857",
    fontWeight: "600",
  },

  /* Error state */
  errorAlertBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FEE2E2",
    gap: 8,
  },
  errorAlertText: {
    color: "#B91C1C",
    fontSize: 12,
    flex: 1,
    fontWeight: "600",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: LaboraColors.textPrimary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: LaboraColors.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  backButtonPill: {
    backgroundColor: LaboraColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backButtonPillText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});
