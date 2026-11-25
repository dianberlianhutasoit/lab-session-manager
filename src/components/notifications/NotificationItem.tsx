import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Spacing, Radii } from '@/constants/theme';
import { MaterialIcons } from '@expo/vector-icons';

/**
 * A single notification list item.
 * Props:
 *   - notification: the notification object from Firestore
 *   - onPress: callback when the item is tapped
 */
export function NotificationItem({ notification, onPress }: { notification: Notification; onPress: () => void }) {
  const getIconName = () => {
    switch (notification.type) {
      case 'fine_created':
        return 'receipt';
      case 'payment_success':
        return 'check-circle';
      case 'payment_failed':
        return 'error';
      default:
        return 'info';
    }
  };

  const iconColor = () => {
    switch (notification.type) {
      case 'fine_created':
        return Colors.light.info;
      case 'payment_success':
        return Colors.light.success;
      case 'payment_failed':
        return Colors.light.danger;
      default:
        return Colors.light.text;
    }
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <MaterialIcons name={getIconName()} size={24} color={iconColor()} style={styles.icon} />
      <View style={styles.content}>
        <Text style={styles.title}>{notification.title}</Text>
        <Text style={styles.body} numberOfLines={2} ellipsizeMode="tail">
          {notification.body}
        </Text>
        <Text style={styles.time}>{new Date(notification.createdAt).toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: Spacing.one,
    backgroundColor: Colors.light.surface,
    borderRadius: Radii.small,
    marginBottom: Spacing.one,
    alignItems: 'flex-start',
  },
  icon: {
    marginRight: Spacing.one,
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.light.text,
  },
  body: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: Colors.light.textMuted,
    marginTop: 4,
    textAlign: 'right',
  },
});
