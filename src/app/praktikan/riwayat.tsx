import { Stack } from "expo-router";
import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { dummySessions } from "../../data/dummy";
import { useAttendance } from "./_layout";

export default function PraktikanRiwayatScreen() {
  const { attendedSessions } = useAttendance();

  // Mengubah Object global state { 'id-sesi': '08:30' } menjadi Array agar bisa di-mapping oleh FlatList
  const historyList = Object.entries(attendedSessions).map(
    ([sessionId, time]) => {
      // Cari detail sesi dari dummy data berdasarkan ID
      const sessionData = dummySessions.find((s) => s.id === sessionId);
      return {
        id: sessionId,
        time: time,
        title: sessionData?.title || "Sesi Tidak Diketahui",
        kelas: sessionData?.kelas || "-",
      };
    },
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen
        options={{ title: "Riwayat Kehadiran", headerBackTitle: "Kembali" }}
      />

      <View style={styles.container}>
        <FlatList
          data={historyList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.header}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.timeBadge}>
                  <Text style={styles.timeText}>{item.time}</Text>
                </View>
              </View>
              <Text style={styles.detailText}>
                Kelas: <Text style={styles.detailHighlight}>{item.kelas}</Text>
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>Belum ada riwayat</Text>
              <Text style={styles.emptyText}>
                Anda belum melakukan presensi di sesi manapun.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#12121A" },
  container: { flex: 1 },
  listContainer: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: "#1E1E2A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2D2D3D",
    borderLeftWidth: 4,
    borderLeftColor: "#50FA7B", // Aksen hijau menandakan sukses hadir
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  title: {
    color: "#F8F8F2",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  timeBadge: {
    backgroundColor: "rgba(80, 250, 123, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#50FA7B",
  },
  timeText: {
    color: "#50FA7B",
    fontSize: 12,
    fontWeight: "bold",
  },
  detailText: { color: "#8BE9FD", fontSize: 13 },
  detailHighlight: { color: "#F8F8F2", fontWeight: "500" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 60,
    padding: 20,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    color: "#F8F8F2",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptyText: { color: "#6272A4", fontSize: 14, textAlign: "center" },
});
