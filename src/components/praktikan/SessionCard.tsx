/** @jsxRuntime classic */
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

// Tipe data disesuaikan dengan kebutuhan prop komponen.
// Jika di src/types/index.ts sudah ada tipe Session, Anda bisa menyesuaikannya nanti.
export interface SessionCardProps {
  id: string;
  title: string;
  kelas: string;
  waktu: string;
  status: "TERTUTUP" | "TERBUKA" | "SELESAI";
  onPress: () => void;
}

export default function SessionCard({
  title,
  kelas,
  waktu,
  status,
  onPress,
}: SessionCardProps) {
  const getStatusStyle = () => {
    switch (status) {
      case "TERBUKA":
        return styles.statusTerbuka;
      case "SELESAI":
        return styles.statusSelesai;
      default:
        return styles.statusTertutup;
    }
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={[styles.badge, getStatusStyle()]}>
          <Text style={styles.badgeText}>{status}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <Text style={styles.detailText}>
          Kelas: <Text style={styles.detailHighlight}>{kelas}</Text>
        </Text>
        <Text style={styles.detailText}>
          Waktu: <Text style={styles.detailHighlight}>{waktu}</Text>
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
  title: {
    color: "#F8F8F2",
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: "#1E1E2A",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  statusTertutup: {
    backgroundColor: "#6272A4",
  },
  statusTerbuka: {
    backgroundColor: "#F1FA8C", // Aksen gold/kuning
  },
  statusSelesai: {
    backgroundColor: "#BD93F9", // Aksen ungu
  },
  details: {
    flexDirection: "column",
    gap: 4,
  },
  detailText: {
    color: "#8BE9FD",
    fontSize: 13,
  },
  detailHighlight: {
    color: "#F8F8F2",
    fontWeight: "500",
  },
});
