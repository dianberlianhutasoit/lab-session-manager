import { NotificationItem } from "@/components/notifications/NotificationItem";
import { Colors, Spacing } from "@/constants/theme";
import { useNotifications } from "@/services/notification-service";
import { Notification } from "@/types/index";
import { useRouter } from "expo-router";
import { FlatList, StyleSheet, Text, View } from "react-native";

/**
 * Notification screen – shows a list of unread/read notifications for the current user.
 * Uses the shared design‑system tokens defined in `src/constants/theme.ts`.
 */
export default function NotificationScreen() {
  const router = useRouter();
  const { notifications, markAsRead, refresh } = useNotifications();

  const renderItem = ({ item }: { item: Notification }) => (
    <NotificationItem
      notification={item as unknown as Parameters<typeof NotificationItem>[0]["notification"]}
      onPress={() => {
        markAsRead(item.id);
        // Example: navigate based on notification type
        if (item.type === "fine_created") {
          router.push({
            pathname: "/features/payment/PaymentScreen",
            params: { fineId: item.data?.fineId },
          });
        }
      }}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList<Notification>
        data={notifications}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderItem}
        refreshing={false}
        onRefresh={refresh}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text style={styles.empty}>Tidak ada notifikasi.</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: Spacing.one,
  },
  listContent: {
    paddingBottom: Spacing.three,
  },
  empty: {
    marginTop: Spacing.four,
    textAlign: "center",
    color: Colors.light.textSecondary,
    fontFamily: "system-ui",
    fontSize: 16,
  },
});
