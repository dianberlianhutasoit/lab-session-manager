import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import PresensiModal from "../../components/praktikan/PresensiModal";
import { dummySessions } from "../../data/dummy";
import { useAttendance } from "./_layout"; // Import dari Context

export default function PraktikanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Menggunakan Global State Context
  const { attendedSessions, addAttendance } = useAttendance();

  const [isModalVisible, setModalVisible] = useState(false);

  const session = dummySessions.find((s) => s.id === id);

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <Stack.Screen options={{ title: "Detail Tidak Ditemukan" }} />
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Sesi praktikum tidak ditemukan.</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Kembali ke Jadwal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isTerbuka = session.status === "TERBUKA";

  // Pengecekan Presensi Ganda: Cek apakah ID sesi ini sudah ada di state global
  const waktuHadir = attendedSessions[session.id];
  const hasAttended = !!waktuHadir;

  const handlePresensi = () => {
    // Validasi ekstra: Jika sudah hadir, jangan lakukan apapun
    if (hasAttended) {
      setModalVisible(false);
      return;
    }

    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    // Simpan ke Global State
    addAttendance(session.id, timeString);
    setModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{ title: "Detail Praktikum", headerBackTitle: "Kembali" }}
      />

      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>{session.title}</Text>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kelas</Text>
            <Text style={styles.infoValue}>{session.kelas}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Waktu</Text>
            <Text style={styles.infoValue}>{session.waktu}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status Sesi</Text>
            <View
              style={[
                styles.badge,
                isTerbuka ? styles.badgeTerbuka : styles.badgeTertutup,
              ]}
            >
              <Text style={styles.badgeText}>{session.status}</Text>
            </View>
          </View>
        </View>

        {hasAttended ? (
          <View style={styles.successContainer}>
            <Text style={styles.successTitle}>✅ Presensi Tercatat</Text>
            <Text style={styles.successText}>
              Anda sudah presensi pada pukul {waktuHadir}
            </Text>
            <Text style={styles.warningText}>
              Tidak dapat melakukan presensi ulang pada sesi yang sama.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.instructionText}>
              {isTerbuka
                ? "Sesi ini sedang berlangsung. Silakan lakukan presensi sekarang."
                : "Presensi hanya dapat dilakukan ketika sesi berstatus TERBUKA."}
            </Text>

            <TouchableOpacity
              style={[
                styles.presensiButton,
                !isTerbuka && styles.presensiButtonDisabled,
              ]}
              disabled={!isTerbuka}
              onPress={() => setModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.presensiButtonText}>
                {isTerbuka ? "Lakukan Presensi" : "Sesi Belum/Sudah Ditutup"}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <PresensiModal
          visible={isModalVisible}
          sessionTitle={session.title}
          onCancel={() => setModalVisible(false)}
          onConfirm={handlePresensi}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Tetap gunakan style yang sama persis dengan tahap 2
  safeArea: { flex: 1, backgroundColor: "#12121A" },
  container: { flex: 1, padding: 20 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#1E1E2A",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2D2D3D",
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#F8F8F2",
    marginBottom: 16,
  },
  divider: { height: 1, backgroundColor: "#2D2D3D", marginBottom: 16 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: { fontSize: 15, color: "#6272A4" },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#8BE9FD" },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
  badgeTerbuka: { backgroundColor: "#F1FA8C" },
  badgeTertutup: { backgroundColor: "#6272A4" },
  badgeText: { fontSize: 12, fontWeight: "bold", color: "#1E1E2A" },
  instructionText: {
    color: "#6272A4",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  presensiButton: {
    backgroundColor: "#50FA7B",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  presensiButtonDisabled: { backgroundColor: "#2D2D3D" },
  presensiButtonText: { color: "#12121A", fontSize: 16, fontWeight: "bold" },
  errorText: { color: "#FF5555", fontSize: 16, marginBottom: 16 },
  backButton: { padding: 12, backgroundColor: "#6272A4", borderRadius: 8 },
  backButtonText: { color: "#F8F8F2", fontWeight: "bold" },
  successContainer: {
    backgroundColor: "rgba(80, 250, 123, 0.1)",
    borderWidth: 1,
    borderColor: "#50FA7B",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    marginTop: 10,
  },
  successTitle: {
    color: "#50FA7B",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  successText: { color: "#F8F8F2", fontSize: 14, marginBottom: 4 },
  warningText: {
    color: "#8BE9FD",
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
    textAlign: "center",
  },
});
