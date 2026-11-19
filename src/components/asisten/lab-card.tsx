import React from 'react';
import { View, StyleSheet, Pressable, Alert, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Lab } from '@/types';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface LabCardProps {
  lab: Lab;
  onEdit: (lab: Lab) => void;
  onDelete: (labId: string) => Promise<boolean> | boolean;
  onViewOnMap?: (lab: Lab) => void;
}

export function LabCard({ lab, onEdit, onDelete, onViewOnMap }: LabCardProps) {
  const theme = useTheme();

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleDeletePress = async () => {
    const confirmMessage = `Apakah Anda yakin ingin menghapus laboratorium "${lab.name}"?`;

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(confirmMessage);
      if (confirmed) {
        await onDelete(lab.id);
      }
    } else {
      Alert.alert('Konfirmasi Hapus Lab', confirmMessage, [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              await onDelete(lab.id);
            } catch (err: any) {
              showAlert('Gagal Menghapus', err.message || 'Terjadi kesalahan saat menghapus.');
            }
          },
        },
      ]);
    }
  };

  return (
    <ThemedView
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: '#E2E8F0',
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <ThemedText type="smallBold" style={styles.labName}>
            {lab.name}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.building}>
            🏢 {lab.building} {lab.code ? `• [${lab.code}]` : ''}
          </ThemedText>
        </View>
        <View style={styles.badge}>
          <ThemedText type="smallBold" style={styles.badgeText}>
            Radius {lab.radius}m
          </ThemedText>
        </View>
      </View>

      <View style={styles.coordinatesRow}>
        <View style={styles.coordItem}>
          <ThemedText type="small" themeColor="textSecondary">
            Latitude:
          </ThemedText>
          <ThemedText type="smallBold">{lab.latitude.toFixed(6)}</ThemedText>
        </View>
        <View style={styles.coordItem}>
          <ThemedText type="small" themeColor="textSecondary">
            Longitude:
          </ThemedText>
          <ThemedText type="smallBold">{lab.longitude.toFixed(6)}</ThemedText>
        </View>
        {lab.capacity ? (
          <View style={styles.coordItem}>
            <ThemedText type="small" themeColor="textSecondary">
              Kapasitas:
            </ThemedText>
            <ThemedText type="smallBold">{lab.capacity} Kursi</ThemedText>
          </View>
        ) : null}
      </View>

      {lab.description ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.description}
          numberOfLines={2}
        >
          {lab.description}
        </ThemedText>
      ) : null}

      <View style={styles.actions}>
        {onViewOnMap ? (
          <Pressable
            style={({ pressed }) => [
              styles.actionBtn,
              { backgroundColor: '#EFF6FF' },
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => onViewOnMap(lab)}
          >
            <ThemedText type="smallBold" style={{ color: '#0284C7' }}>
              🗺️ Lihat di Peta
            </ThemedText>
          </Pressable>
        ) : null}
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: '#F1F5F9' },
            pressed && { opacity: 0.7 },
          ]}
          onPress={() => onEdit(lab)}
        >
          <ThemedText type="smallBold">
            ✏️ Ubah
          </ThemedText>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.actionBtn,
            { backgroundColor: '#FEE2E2' },
            pressed && { opacity: 0.7 },
          ]}
          onPress={handleDeletePress}
        >
          <ThemedText type="smallBold" style={{ color: '#DC2626' }}>
            🗑️ Hapus
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.one,
  },
  titleContainer: {
    flex: 1,
    marginRight: Spacing.one,
  },
  labName: {
    fontSize: 16,
    marginBottom: 2,
  },
  building: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
  },
  badgeText: {
    fontSize: 11,
    color: '#0284C7',
  },
  coordinatesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 6,
    marginBottom: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  coordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  description: {
    fontSize: 12,
    fontStyle: 'italic',
    marginBottom: Spacing.one,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: Spacing.one,
    marginTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
});
