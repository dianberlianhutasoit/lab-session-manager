import React from "react";
import { Stack } from "expo-router";
import { FlatList, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSessionContext } from "@/context/session-context";
import { useAuth } from "@/context/auth-context";
import { MemphisColors } from "@/constants/theme";

export default function PraktikanRiwayatScreen() {
  const { attendance, sessions, schedules } = useSessionContext();
  const { profile } = useAuth();
  const practitioner = profile;

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
      <Stack.Screen
        options={{
          title: "Riwayat Kehadiran",
          headerBackTitle: "Kembali",
          headerTintColor: MemphisColors.navy,
          headerStyle: { backgroundColor: "#FFFFFF" },
        }}
      />
      <FlatList
        data={history}
        keyExtractor={({ record }) => record.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>
                {item.schedule.title}
              </Text>
              <View style={styles.timeBadge}>
                <Feather name="check-circle" size={12} color={MemphisColors.teal} style={{ marginRight: 4 }} />
                <Text style={styles.timeText}>
                  {formatAttendanceTime(item.record.recordedAt)}
                </Text>
              </View>
            </View>

            <View style={styles.details}>
              <Text style={styles.detailText}>
                Kode Mata Kuliah:{" "}
                <Text style={styles.detailHighlight}>{item.schedule.courseCode}</Text>
              </Text>
              <Text style={styles.detailText}>
                Tanggal:{" "}
                <Text style={styles.detailHighlight}>{item.schedule.date}</Text>
              </Text>
              <Text style={styles.detailText}>
                Ruangan:{" "}
                <Text style={styles.detailHighlight}>{item.schedule.room}</Text>
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="inbox" size={36} color={MemphisColors.muted} style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>Belum Ada Riwayat Presensi</Text>
            <Text style={styles.emptyText}>
              Presensi yang berhasil dicatat akan otomatis tampil pada halaman ini.
            </Text>
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
  safeArea: {
    flex: 1,
    backgroundColor: MemphisColors.surface,
  },
  listContainer: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  card: {
    backgroundColor: MemphisColors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: MemphisColors.cardBorder,
    shadowColor: "#64748B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  title: {
    color: MemphisColors.navy,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: MemphisColors.mintSurface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: MemphisColors.mint,
  },
  timeText: {
    color: MemphisColors.teal,
    fontSize: 11,
    fontWeight: "700",
  },
  details: {
    gap: 4,
  },
  detailText: {
    color: MemphisColors.slate,
    fontSize: 13,
  },
  detailHighlight: {
    color: MemphisColors.navy,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    padding: 32,
  },
  emptyTitle: {
    color: MemphisColors.navy,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyText: {
    color: MemphisColors.muted,
    fontSize: 14,
    textAlign: "center",
  },
});
