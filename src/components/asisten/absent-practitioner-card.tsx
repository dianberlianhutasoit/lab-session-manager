import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { User } from '@/types';

interface AbsentPractitionerCardProps {
  user: User;
  index: number;
}

export function AbsentPractitionerCard({ user, index }: AbsentPractitionerCardProps) {
  const initial = user.name.charAt(0).toUpperCase();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.numberBadge}>
        <ThemedText type="small" style={styles.numberText}>
          #{index + 1}
        </ThemedText>
      </View>

      <View style={styles.avatar}>
        <ThemedText type="smallBold" style={styles.avatarText}>
          {initial}
        </ThemedText>
      </View>

      <View style={styles.infoCol}>
        <ThemedText type="smallBold" style={styles.nameText}>
          {user.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.emailText}>
          {user.email}
        </ThemedText>
      </View>

      <View style={styles.statusBadge}>
        <ThemedText type="smallBold" style={styles.statusText}>
          Belum Hadir
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: 14,
    gap: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    opacity: 0.85,
  },
  numberBadge: {
    width: 28,
    alignItems: 'center',
  },
  numberText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  nameText: {
    fontSize: 15,
  },
  emailText: {
    fontSize: 12,
  },
  statusBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  statusText: {
    color: '#64748B',
    fontSize: 11,
  },
});
