import { Feather } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { NotificationItem } from "@/components/notifications/NotificationItem";
import {
  LaboraColors,
  MaxContentWidth,
  Radii,
  Spacing,
} from "@/constants/theme";
import type {
  NotificationDoc,
  NotificationFilter,
} from "@/features/notifications/types";
import { useNotifications } from "@/features/notifications/useNotifications";

export interface NotificationScreenProps {
  onSelectNotification?: (notification: NotificationDoc) => void;
}

const FILTER_OPTIONS: { key: NotificationFilter; label: string }[] = [
  { key: "ALL", label: "Semua" },
  { key: "UNREAD", label: "Belum Dibaca" },
  { key: "FINE", label: "Denda" },
  { key: "PAYMENT", label: "Pembayaran" },
];

export default function NotificationScreen({
  onSelectNotification,
}: NotificationScreenProps) {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    loading,
    refreshing,
    error,
    refresh,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("ALL");

  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case "UNREAD":
        return notifications.filter((item) => !item.isRead);
      case "FINE":
        return notifications.filter((item) => item.type === "fine_created");
      case "PAYMENT":
        return notifications.filter(
          (item) =>
            item.type === "payment_success" || item.type === "payment_failed",
        );
      default:
        return notifications;
    }
  }, [notifications, activeFilter]);

  const handlePressItem = (item: NotificationDoc) => {
    if (!item.isRead) {
      void markAsRead(item.id);
    }
    onSelectNotification?.(item);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.wrapper}>
        {/* Top Bar Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={LaboraColors.primary} />
          </TouchableOpacity>

          <View style={styles.topBarCenter}>
            <Text style={styles.topBarBrand}>LABORA</Text>
            <Text style={styles.topBarTitle}>Notifikasi</Text>
          </View>

          {unreadCount > 0 ? (
            <TouchableOpacity
              style={styles.markAllBtn}
              onPress={() => void markAllAsRead()}
              activeOpacity={0.75}
            >
              <Feather
                name="check-square"
                size={14}
                color={LaboraColors.primary}
              />
              <Text style={styles.markAllText}>Baca Semua</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.topBarSpacer} />
          )}
        </View>

        {/* Summary & Filter Section */}
        <View style={styles.headerSection}>
          <View style={styles.summaryBanner}>
            <View style={styles.summaryIconBox}>
              <Feather name="bell" size={18} color={LaboraColors.primary} />
            </View>
            <View style={styles.summaryTextCol}>
              <Text style={styles.summaryTitle}>
                {unreadCount > 0
                  ? `${unreadCount} notifikasi belum dibaca`
                  : "Semua notifikasi sudah dibaca"}
              </Text>
              <Text style={styles.summarySubtitle}>
                Info tagihan denda keterlambatan & status pembayaran Midtrans
              </Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTER_OPTIONS.map((option) => {
              const isSelected = activeFilter === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterChip,
                    isSelected && styles.filterChipActive,
                  ]}
                  onPress={() => setActiveFilter(option.key)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.filterText,
                      isSelected && styles.filterTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {error && (
            <View style={styles.errorBanner}>
              <Feather
                name="alert-triangle"
                size={15}
                color={LaboraColors.danger}
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={LaboraColors.primary} />
            <Text style={styles.loadingText}>Memuat notifikasi...</Text>
          </View>
        ) : (
          <FlatList<NotificationDoc>
            data={filteredNotifications}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <NotificationItem notification={item} onPress={handlePressItem} />
            )}
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                <View style={styles.emptyIconBox}>
                  <Feather
                    name="bell-off"
                    size={26}
                    color={LaboraColors.primary}
                  />
                </View>
                <Text style={styles.emptyTitle}>Belum ada notifikasi</Text>
                <Text style={styles.emptySubtitle}>
                  {activeFilter === "ALL"
                    ? "Pemberitahuan tagihan denda dan status pembayaran akan muncul di sini."
                    : "Tidak ada notifikasi yang cocok dengan filter saat ini."}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: LaboraColors.background,
  },
  wrapper: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
    alignSelf: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.oneAndHalf,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: Radii.pill,
    backgroundColor: LaboraColors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  topBarCenter: {
    flex: 1,
    marginLeft: Spacing.oneAndHalf,
  },
  topBarBrand: {
    fontSize: 10,
    fontWeight: "700",
    color: LaboraColors.primaryLight,
    letterSpacing: 1.2,
    marginBottom: -2,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: LaboraColors.textPrimary,
  },
  topBarSpacer: {
    width: 38,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LaboraColors.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: LaboraColors.primaryBorder,
    gap: 6,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: LaboraColors.primary,
  },
  headerSection: {
    paddingHorizontal: Spacing.two,
    paddingBottom: Spacing.one,
  },
  summaryBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LaboraColors.surface,
    borderRadius: Radii.large,
    padding: Spacing.oneAndHalf,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    marginBottom: Spacing.oneAndHalf,
    gap: Spacing.oneAndHalf,
  },
  summaryIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radii.medium,
    backgroundColor: LaboraColors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTextCol: {
    flex: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: LaboraColors.textPrimary,
  },
  summarySubtitle: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
    marginTop: 2,
  },
  filterRow: {
    gap: Spacing.one,
    paddingBottom: Spacing.half,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    backgroundColor: LaboraColors.surface,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  filterChipActive: {
    backgroundColor: LaboraColors.primary,
    borderColor: LaboraColors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: LaboraColors.textSecondary,
  },
  filterTextActive: {
    color: LaboraColors.primaryText,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LaboraColors.dangerSoft,
    borderRadius: Radii.medium,
    borderWidth: 1,
    borderColor: LaboraColors.dangerBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: Spacing.one,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#B91C1C",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
  },
  loadingText: {
    fontSize: 14,
    color: LaboraColors.textSecondary,
  },
  listContent: {
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.four,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: LaboraColors.surface,
    borderRadius: Radii.xlarge,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    padding: Spacing.three,
    marginTop: Spacing.two,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: Radii.pill,
    backgroundColor: LaboraColors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.oneAndHalf,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: LaboraColors.textPrimary,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: LaboraColors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
});
