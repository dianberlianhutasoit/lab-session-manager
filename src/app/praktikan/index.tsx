import { Stack, useRouter } from "expo-router"; // Tambahkan Stack di sini
import {
  FlatList,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import SessionCard from "../../components/praktikan/SessionCard";
import { dummySessions } from "../../data/dummy";

export default function PraktikanJadwalScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* Modifikasi Header: Menambahkan tombol navigasi ke halaman riwayat */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity
              onPress={() => router.push("/praktikan/riwayat")}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>Riwayat</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Jadwal Praktikum</Text>
          <Text style={styles.headerSubtitle}>
            Pilih sesi untuk melihat detail dan presensi.
          </Text>
        </View>

        <FlatList
          data={dummySessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <SessionCard
              id={item.id}
              title={item.title}
              kelas={item.kelas}
              waktu={item.waktu}
              status={item.status}
              onPress={() => router.push(`/praktikan/${item.id}`)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Tidak ada jadwal praktikum saat ini.
              </Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ... (Gunakan styles yang sama persis seperti sebelumnya, lalu tambahkan 2 style ini di bagian bawah)
  safeArea: { flex: 1, backgroundColor: "#12121A" },
  container: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F8F8F2",
    marginBottom: 4,
  },
  headerSubtitle: { fontSize: 14, color: "#6272A4" },
  listContainer: { paddingHorizontal: 20, paddingBottom: 24 },
  emptyContainer: { padding: 20, alignItems: "center" },
  emptyText: { color: "#6272A4", fontSize: 14, fontStyle: "italic" },
  // Tambahan untuk tombol header:
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#2D2D3D",
    borderRadius: 6,
    marginRight: 10, // Memberi jarak dari tepi kanan layar
  },
  headerButtonText: {
    color: "#8BE9FD",
    fontSize: 14,
    fontWeight: "600",
  },
});
