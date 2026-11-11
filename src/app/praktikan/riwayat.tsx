import { Stack } from "expo-router";
import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { useSessionContext } from "../../context/session-context";

export default function PraktikanRiwayatScreen() {
  const { attendance, sessions, schedules, users } = useSessionContext();
  const practitioner = users.find((user) => user.role === "praktikan");
  const history = attendance
    .filter((record) => record.userId === practitioner?.id)
    .flatMap((record) => {
      const session = sessions.find((item) => item.id === record.sessionId);
      const schedule = session
        ? schedules.find((item) => item.id === session.scheduleId)
        : undefined;
      return schedule ? [{ record, schedule }] : [];
    })
    .sort((a, b) => b.record.recordedAt.localeCompare(a.record.recordedAt));

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ title: "Riwayat Kehadiran", headerBackTitle: "Kembali" }} />
      <FlatList
        data={history}
        keyExtractor={({ record }) => record.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>{item.schedule.title}</Text>
              <View style={styles.timeBadge}>
                <Text style={styles.timeText}>{formatAttendanceTime(item.record.recordedAt)}</Text>
              </View>
            </View>
            <Text style={styles.detailText}>Kode: <Text style={styles.detailHighlight}>{item.schedule.courseCode}</Text></Text>
            <Text style={styles.detailText}>Tanggal: <Text style={styles.detailHighlight}>{item.schedule.date}</Text></Text>
            <Text style={styles.detailText}>Ruangan: <Text style={styles.detailHighlight}>{item.schedule.room}</Text></Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Belum ada riwayat</Text>
            <Text style={styles.emptyText}>Presensi yang berhasil akan tampil di sini.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function formatAttendanceTime(recordedAt: string) {
  return new Date(recordedAt).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#12121A" },
  listContainer: { padding: 20, paddingBottom: 40, flexGrow: 1 },
  card: { backgroundColor: "#1E1E2A", borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#2D2D3D", borderLeftWidth: 4, borderLeftColor: "#50FA7B" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 },
  title: { color: "#F8F8F2", fontSize: 16, fontWeight: "bold", flex: 1 },
  timeBadge: { backgroundColor: "rgba(80, 250, 123, 0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: "#50FA7B" },
  timeText: { color: "#50FA7B", fontSize: 12, fontWeight: "bold" },
  detailText: { color: "#8BE9FD", fontSize: 13, marginTop: 3 },
  detailHighlight: { color: "#F8F8F2", fontWeight: "500" },
  emptyContainer: { alignItems: "center", justifyContent: "center", flex: 1, padding: 20 },
  emptyTitle: { color: "#F8F8F2", fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  emptyText: { color: "#6272A4", fontSize: 14, textAlign: "center" },
});
