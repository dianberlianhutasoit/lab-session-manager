import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { schedules, sessions, users } from "../../data/dummy";

export default function PraktikanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = sessions.find((item) => item.id === id);
  const schedule = session
    ? schedules.find((item) => item.id === session.scheduleId)
    : undefined;
  const assistant = session
    ? users.find((user) => user.id === session.assistantId)
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
          <InfoRow label="Status" value={session.status} />
        </View>
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
  card: {
    backgroundColor: "#1E1E2A",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2D2D3D",
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: "bold", color: "#F8F8F2", marginBottom: 16 },
  divider: { height: 1, backgroundColor: "#2D2D3D", marginBottom: 16 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  infoLabel: { fontSize: 15, color: "#6272A4" },
  infoValue: { fontSize: 15, fontWeight: "600", color: "#8BE9FD" },
  errorText: { color: "#FF5555", fontSize: 16, marginBottom: 16 },
  backButton: { padding: 12, backgroundColor: "#6272A4", borderRadius: 8 },
  backButtonText: { color: "#F8F8F2", fontWeight: "bold" },
});
