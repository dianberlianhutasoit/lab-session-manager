import { Stack, useRouter, type Href } from "expo-router";
import { FlatList, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Schedule, Session } from "../../types";
import SessionCard from "../../components/praktikan/SessionCard";
import { useSessionContext } from "../../context/session-context";

type ScheduledSession = { session: Session; schedule: Schedule };

export default function PraktikanJadwalScreen() {
  const router = useRouter();
  const { schedules, sessions } = useSessionContext();
  const scheduledSessions: ScheduledSession[] = sessions.flatMap((session) => {
    const schedule = schedules.find((item) => item.id === session.scheduleId);
    return schedule ? [{ session, schedule }] : [];
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      <Stack.Screen
        options={{
          title: "Jadwal Praktikum",
          headerRight: () => (
            <TouchableOpacity onPress={() => router.push("/praktikan/riwayat" as Href)}>
              <Text style={styles.historyButton}>Riwayat</Text>
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <Text style={styles.headerTitle}>Jadwal Praktikum</Text>
          <Text style={styles.headerSubtitle}>Pilih sesi untuk melihat detail.</Text>
        </View>

        <FlatList
          data={scheduledSessions}
          keyExtractor={({ session }) => session.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => (
            <SessionCard
              session={item.session}
              schedule={item.schedule}
              onPress={() => router.push(`/praktikan/${item.session.id}` as Href)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Tidak ada jadwal praktikum saat ini.</Text>
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
  headerContainer: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16 },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#F8F8F2", marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: "#6272A4" },
  listContainer: { paddingHorizontal: 20, paddingBottom: 24 },
  emptyContainer: { padding: 20, alignItems: "center" },
  emptyText: { color: "#6272A4", fontSize: 14, fontStyle: "italic" },
  historyButton: { color: "#8BE9FD", fontSize: 14, fontWeight: "600", paddingHorizontal: 12 },
});
