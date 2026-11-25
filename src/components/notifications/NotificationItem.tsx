import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { LaboraColors, Radii, Spacing } from "@/constants/theme";
import type {
  NotificationDoc,
  NotificationType,
} from "@/features/notifications/types";

export interface NotificationItemProps {
  notification: NotificationDoc;
  onPress: (notification: NotificationDoc) => void;
}

interface NotificationVisualConfig {
  iconName: React.ComponentProps<typeof Feather>["name"];
  iconColor: string;
  iconBg: string;
  badgeLabel: string;
  badgeBg: string;
  badgeText: string;
}

function getVisualConfig(type: NotificationType): NotificationVisualConfig {
  switch (type) {
    case "fine_created":
      return {
        iconName: "alert-circle",
        iconColor: LaboraColors.warning,
        iconBg: LaboraColors.warningSoft,
        badgeLabel: "Tagihan Denda",
        badgeBg: LaboraColors.warningSoft,
        badgeText: "#B45309",
      };
    case "payment_success":
      return {
        iconName: "check-circle",
        iconColor: LaboraColors.success,
        iconBg: LaboraColors.successSoft,
        badgeLabel: "Pembayaran Lunas",
        badgeBg: LaboraColors.successSoft,
        badgeText: LaboraColors.successDark,
      };
    case "payment_failed":
      return {
        iconName: "x-circle",
        iconColor: LaboraColors.danger,
        iconBg: LaboraColors.dangerSoft,
        badgeLabel: "Pembayaran Gagal",
        badgeBg: LaboraColors.dangerSoft,
        badgeText: "#B91C1C",
      };
    default:
      return {
        iconName: "bell",
        iconColor: LaboraColors.info,
        iconBg: LaboraColors.infoSoft,
        badgeLabel: "Informasi",
        badgeBg: LaboraColors.infoSoft,
        badgeText: "#1D4ED8",
      };
  }
}

function formatNotificationTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes >= 0 && diffMinutes < 1) {
    return "Baru saja";
  }
  if (diffMinutes >= 1 && diffMinutes < 60) {
    return `${diffMinutes} mnt lalu`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours >= 1 && diffHours < 24) {
    return `${diffHours} jam lalu`;
  }

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function NotificationItem({
  notification,
  onPress,
}: NotificationItemProps) {
  const visual = getVisualConfig(notification.type);
  const isUnread = !notification.isRead;
  const isActionable =
    notification.type === "fine_created" ||
    notification.type === "payment_failed";

  return (
    <TouchableOpacity
      style={[styles.card, isUnread && styles.cardUnread]}
      onPress={() => onPress(notification)}
      activeOpacity={0.8}
    >
      <View style={[styles.iconBox, { backgroundColor: visual.iconBg }]}>
        <Feather name={visual.iconName} size={20} color={visual.iconColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <View style={[styles.typeBadge, { backgroundColor: visual.badgeBg }]}>
            <Text style={[styles.typeBadgeText, { color: visual.badgeText }]}>
              {visual.badgeLabel}
            </Text>
          </View>

          <View style={styles.metaRight}>
            <Text style={styles.timeText}>
              {formatNotificationTime(notification.createdAt)}
            </Text>
            {isUnread && <View style={styles.unreadDot} />}
          </View>
        </View>

        <Text
          style={[styles.title, isUnread && styles.titleUnread]}
          numberOfLines={1}
        >
          {notification.title}
        </Text>

        <Text style={styles.body} numberOfLines={3}>
          {notification.body}
        </Text>

        {isActionable && (
          <View style={styles.actionRow}>
            <Text style={styles.actionText}>
              {notification.type === "fine_created"
                ? "Lihat & Bayar Tagihan"
                : "Coba Bayar Ulang"}
            </Text>
            <Feather
              name="chevron-right"
              size={14}
              color={LaboraColors.primary}
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: LaboraColors.card,
    borderRadius: Radii.large,
    padding: Spacing.two,
    marginBottom: Spacing.oneAndHalf,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    shadowColor: "#0B192C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    gap: Spacing.oneAndHalf,
  },
  cardUnread: {
    backgroundColor: LaboraColors.primarySoft,
    borderColor: LaboraColors.primaryBorder,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: Radii.medium,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: Spacing.one,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metaRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    fontSize: 11,
    fontWeight: "500",
    color: LaboraColors.textMuted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.pill,
    backgroundColor: LaboraColors.primary,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: LaboraColors.textPrimary,
    marginBottom: 3,
  },
  titleUnread: {
    fontWeight: "700",
  },
  body: {
    fontSize: 13,
    lineHeight: 19,
    color: LaboraColors.textSecondary,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "700",
    color: LaboraColors.primary,
  },
});
