import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import type { Schedule, Session } from "../../types";
import { MemphisColors } from "@/constants/theme";

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
        <View style={styles.titleCol}>
          <Text style={styles.courseCode}>{schedule.courseCode}</Text>
          <Text style={styles.title} numberOfLines={1}>
            {schedule.title}
          </Text>
        </View>
        <View style={[styles.badge, isOpen ? styles.statusOpen : styles.statusClosed]}>
          <View style={[styles.badgeDot, isOpen ? styles.dotOpen : styles.dotClosed]} />
          <Text style={[styles.badgeText, isOpen ? styles.statusOpenText : styles.statusClosedText]}>
            {isOpen ? "BUKA (OPEN)" : "TERTUTUP"}
          </Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.metaList}>
          <View style={styles.metaItem}>
            <Feather name="clock" size={13} color={MemphisColors.teal} style={styles.icon} />
            <Text style={styles.metaText}>
              {schedule.date} · {schedule.startTime}–{schedule.endTime}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Feather name="map-pin" size={13} color={MemphisColors.teal} style={styles.icon} />
            <Text style={styles.metaText}>Ruangan: {schedule.room}</Text>
          </View>
        </View>

        {/* Circular Arrow Button (as shown in reference photo) */}
        <View style={styles.arrowButton}>
          <Feather name="arrow-right" size={16} color={MemphisColors.teal} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: MemphisColors.cardBorder,
    shadowColor: "#0B192C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 8,
  },
  titleCol: {
    flex: 1,
  },
  courseCode: {
    fontSize: 11,
    fontWeight: "700",
    color: MemphisColors.teal,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  title: {
    color: MemphisColors.navy,
    fontSize: 16,
    fontWeight: "700",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    gap: 5,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOpen: {
    backgroundColor: "#10B981",
  },
  dotClosed: {
    backgroundColor: "#94A3B8",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  statusClosed: {
    backgroundColor: "#F1F5F9",
  },
  statusClosedText: {
    color: "#64748B",
  },
  statusOpen: {
    backgroundColor: "#ECFDF5",
  },
  statusOpenText: {
    color: "#059669",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F8FAFC",
  },
  metaList: {
    flex: 1,
    gap: 4,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 6,
  },
  metaText: {
    fontSize: 13,
    color: MemphisColors.slate,
    fontWeight: "500",
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: MemphisColors.mintSurface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
});
