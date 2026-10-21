import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type { Schedule, Session } from "../../types";

export interface SessionCardProps {
  session: Session;
  schedule: Schedule;
  onPress: () => void;
}

export default function SessionCard({ session, schedule, onPress }: SessionCardProps) {
  const isOpen = session.status === "OPEN";

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {schedule.title}
        </Text>
        <View style={[styles.badge, isOpen ? styles.statusOpen : styles.statusClosed]}>
          <Text style={styles.badgeText}>{session.status}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.detailText}>
          Kode: <Text style={styles.detailHighlight}>{schedule.courseCode}</Text>
        </Text>
        <Text style={styles.detailText}>
          Jadwal: <Text style={styles.detailHighlight}>{schedule.date} · {schedule.startTime}–{schedule.endTime}</Text>
        </Text>
        <Text style={styles.detailText}>
          Ruangan: <Text style={styles.detailHighlight}>{schedule.room}</Text>
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1E1E2A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2D2D3D",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  title: { color: "#F8F8F2", fontSize: 16, fontWeight: "bold", flex: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { color: "#1E1E2A", fontSize: 10, fontWeight: "bold", letterSpacing: 0.5 },
  statusClosed: { backgroundColor: "#6272A4" },
  statusOpen: { backgroundColor: "#F1FA8C" },
  details: { flexDirection: "column", gap: 4 },
  detailText: { color: "#8BE9FD", fontSize: 13 },
  detailHighlight: { color: "#F8F8F2", fontWeight: "500" },
});
