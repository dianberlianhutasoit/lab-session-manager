import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import PresensiModal from "../../components/praktikan/PresensiModal";
import { schedules, sessions, users } from "../../data/dummy";

export default function PraktikanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [isModalVisible, setModalVisible] = useState(false);
  const [waktuHadir, setWaktuHadir] = useState<string | null>(null);
  const hasAttendedRef = useRef(false);

  const session = sessions.find((item) => item.id === id);
  const schedule = session
    ? schedules.find((item) => item.id === session.scheduleId)
    : undefined;
  const assistant = session
    ? users.find((item) => item.id === session.assistantId)
    : undefined;

  if (!session || !schedule) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: "Detail Tidak Ditemukan" }} />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Sesi praktikum tidak ditemukan.</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Kembali ke Jadwal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isOpen = session.status === "OPEN";
  const hasAttended = waktuHadir !== null;

  const handlePresensi = () => {
    if (!isOpen || hasAttendedRef.current) return;
    hasAttendedRef.current = true;

    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, "0")}:${now
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
    setWaktuHadir(timeString);
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "Detail Praktikum", headerBackTitle: "Kembali" }} />
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{schedule.title}</Text>
          <View style={styles.divider} />
          <InfoRow label="Kode" value={schedule.courseCode} />
          <InfoRow label="Tanggal" value={schedule.date} />
          <InfoRow label="Waktu" value={`${schedule.startTime}–${schedule.endTime}`} />
          <InfoRow label="Ruangan" value={schedule.room} />
          <InfoRow label="Asisten" value={assistant?.name ?? "Belum ditentukan"} />
          <InfoRow label="Status Sesi" value={session.status} />
        </View>

        {hasAttended ? (
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>Presensi Berhasil</Text>
            <Text style={styles.successText}>Tercatat pada pukul: {waktuHadir}</Text>
          </View>
        ) : (
          <>
            <Text style={styles.instructionText}>
              {isOpen
                ? "Sesi ini sedang berlangsung. Silakan lakukan presensi sekarang."
                : "Sesi ini belum terbuka, presensi belum tersedia."}
            </Text>
            <TouchableOpacity
              style={[styles.presensiButton, !isOpen && styles.presensiButtonDisabled]}
              disabled={!isOpen}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.presensiButtonText}>
                {isOpen ? "Lakukan Presensi" : "Sesi Tidak Terbuka"}
              </Text>
            </TouchableOpacity>
          </>
        )}

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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#12121A" },
  container: { flex: 1, padding: 20 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  card: { backgroundColor: "#1E1E2A", borderRadius: 12, padding: 20, borderWidth: 1, borderColor: "#2D2D3D", marginBottom: 20 },
  title: { fontSize: 22, fontWeight: "bold", color: "#F8F8F2", marginBottom: 16 },
  divider: { height: 1, backgroundColor: "#2D2D3D", marginBottom: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  infoLabel: { fontSize: 15, color: "#6272A4" },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#8BE9FD" },
  instructionText: { color: "#6272A4", fontSize: 14, textAlign: "center", marginBottom: 20, paddingHorizontal: 10 },
  presensiButton: { backgroundColor: "#50FA7B", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  presensiButtonDisabled: { backgroundColor: "#2D2D3D" },
  presensiButtonText: { color: "#12121A", fontSize: 16, fontWeight: "bold" },
  errorText: { color: "#FF5555", fontSize: 16, marginBottom: 16 },
  backButton: { padding: 12, backgroundColor: "#6272A4", borderRadius: 8 },
  backButtonText: { color: "#F8F8F2", fontWeight: "bold" },
  successContainer: { backgroundColor: "rgba(80, 250, 123, 0.1)", borderWidth: 1, borderColor: "#50FA7B", borderRadius: 12, padding: 20, alignItems: "center", marginTop: 10 },
  successTitle: { color: "#50FA7B", fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  successText: { color: "#F8F8F2", fontSize: 14 },
});
