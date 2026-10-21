/** @jsxRuntime classic */
import { useRouter } from "expo-router";
import {
    FlatList,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";
import SessionCard from "../../components/praktikan/SessionCard";

// PERHATIAN: Sesuaikan nama variabel import 'dummySessions' dengan
// apa yang diekspor oleh PM Anda di dalam file src/data/dummy.ts
import { dummySessions } from "../../data/dummy";

type Session = {
  id: string;
  title: string;
  kelas: string;
  waktu: string;
  status: (typeof dummySessions)[number]["status"];
};

export default function PraktikanJadwalScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Jadwal Praktikum</Text>
          <Text style={styles.headerSubtitle}>
            Pilih sesi untuk melihat detail dan presensi.
          </Text>
        </View>

        <FlatList<Session>
          data={dummySessions as Session[]}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <SessionCard
              id={item.id}
              title={item.title} // Pastikan field ini sesuai dengan struktur dari PM (misal: namaPraktikum)
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
  safeArea: {
    flex: 1,
    backgroundColor: "#12121A", // Tema gelap konsisten
  },
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#F8F8F2",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#6272A4",
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    color: "#6272A4",
    fontSize: 14,
    fontStyle: "italic",
  },
});
