import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Lab, Schedule, Session } from '@/types';
import type { UserCoordinates } from '@/hooks/use-location';
import { getDistanceInMeters } from './lab-activity-sheet';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface MapFallbackListProps {
  labs: Lab[];
  selectedLabId: string | null;
  onSelectLab: (lab: Lab) => void;
  getLabActivity: (labId: string) => {
    ongoing: { session: Session; schedule: Schedule } | null;
    next: { session: Session; schedule: Schedule } | null;
  };
  userLocation: UserCoordinates | null;
  onRetryMap?: () => void;
  isMapAvailable?: boolean;
}

export function MapFallbackList({
  labs,
  selectedLabId,
  onSelectLab,
  getLabActivity,
  userLocation,
  onRetryMap,
  isMapAvailable = true,
}: MapFallbackListProps) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLabs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return labs;
    return labs.filter(
      (l) =>
        l.name.toLowerCase().includes(query) ||
        l.building.toLowerCase().includes(query) ||
        (l.code && l.code.toLowerCase().includes(query))
    );
  }, [labs, searchQuery]);

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={[styles.searchBox, { backgroundColor: theme.backgroundElement, borderColor: '#CBD5E1' }]}>
        <ThemedText style={styles.searchIcon}>🔍</ThemedText>
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Cari laboratorium atau gedung..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <Pressable onPress={() => setSearchQuery('')}>
            <ThemedText type="small" themeColor="textSecondary">✕</ThemedText>
          </Pressable>
        ) : null}
      </View>

      {/* Info Banner jika fallback aktif */}
      <View style={[styles.infoBanner, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText type="small" themeColor="textSecondary">
          📋 Daftar Laboratorium (Fallback SRS-12)
        </ThemedText>
        {isMapAvailable && onRetryMap ? (
          <Pressable onPress={onRetryMap} style={styles.retryBtn}>
            <ThemedText type="smallBold" style={{ color: '#0284C7' }}>
              🗺️ Tampilkan Peta
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {/* Daftar Laboratorium */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {filteredLabs.length === 0 ? (
          <ThemedView style={[styles.emptyBox, { borderColor: '#E2E8F0' }]}>
            <ThemedText style={styles.emptyIcon}>🏢</ThemedText>
            <ThemedText type="smallBold" style={styles.emptyTitle}>
              Laboratorium Tidak Ditemukan
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptySubtitle}>
              Tidak ada data laboratorium yang cocok dengan kata kunci &quot;{searchQuery}&quot;.
            </ThemedText>
          </ThemedView>
        ) : (
          filteredLabs.map((lab) => {
            const isSelected = selectedLabId === lab.id;
            const activity = getLabActivity(lab.id);
            const hasOngoing = Boolean(activity.ongoing);
            const isOngoingOpen = activity.ongoing?.session.status === 'OPEN';

            const distance = userLocation
              ? getDistanceInMeters(
                  userLocation.latitude,
                  userLocation.longitude,
                  lab.latitude,
                  lab.longitude
                )
              : null;

            return (
              <Pressable
                key={lab.id}
                style={({ pressed }) => [
                  styles.card,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: isSelected ? '#0284C7' : '#E2E8F0',
                    borderWidth: isSelected ? 2 : 1,
                  },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => onSelectLab(lab)}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleArea}>
                    <ThemedText type="smallBold" style={styles.cardLabName}>
                      {lab.name}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.cardBuilding}
                    >
                      🏢 {lab.building} {lab.code ? `• [${lab.code}]` : ''}
                    </ThemedText>
                  </View>

                  {isOngoingOpen ? (
                    <View style={styles.badgeLive}>
                      <ThemedText type="smallBold" style={styles.badgeLiveText}>SESI BUKA</ThemedText>
                    </View>
                  ) : (
                    <View style={styles.badgeRadius}>
                      <ThemedText type="small" themeColor="textSecondary">
                        R: {lab.radius}m
                      </ThemedText>
                    </View>
                  )}
                </View>

                {/* Info Praktikum Berjalan */}
                {hasOngoing ? (
                  <View style={styles.activityRow}>
                    <ThemedText type="smallBold" style={styles.activityLabel}>🔴 Sedang Aktif:</ThemedText>
                    <ThemedText type="small" style={styles.activityTitle} numberOfLines={1}>
                      {activity.ongoing!.schedule.title} ({activity.ongoing!.schedule.startTime} -{' '}
                      {activity.ongoing!.schedule.endTime})
                    </ThemedText>
                  </View>
                ) : activity.next ? (
                  <View style={styles.activityRow}>
                    <ThemedText type="smallBold" style={styles.activityLabelNext}>⏭️ Berikutnya:</ThemedText>
                    <ThemedText type="small" style={styles.activityTitle} numberOfLines={1}>
                      {activity.next.schedule.title} ({activity.next.schedule.startTime})
                    </ThemedText>
                  </View>
                ) : (
                  <ThemedText type="small" themeColor="textSecondary" style={styles.idleText}>
                    Tidak ada jadwal praktikum aktif saat ini.
                  </ThemedText>
                )}

                {/* Koordinat & Jarak */}
                <View style={styles.footerRow}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.coordsText}>
                    🌐 {lab.latitude.toFixed(4)}, {lab.longitude.toFixed(4)}
                  </ThemedText>

                  {distance !== null ? (
                    <ThemedText
                      type="smallBold"
                      style={{ color: distance <= lab.radius ? '#16A34A' : '#D97706' }}
                    >
                      📏 {distance}m {distance <= lab.radius ? '(Dalam Radius)' : ''}
                    </ThemedText>
                  ) : null}

                  <Pressable
                    style={styles.directRouteBtn}
                    onPress={() => {
                      const originParam = userLocation
                        ? `&origin=${userLocation.latitude},${userLocation.longitude}`
                        : '';
                      Linking.openURL(
                        `https://www.google.com/maps/dir/?api=1${originParam}&destination=${lab.latitude},${lab.longitude}&destination_place_id=${encodeURIComponent(
                          lab.name
                        )}`
                      );
                    }}
                  >
                    <ThemedText style={styles.directRouteBtnText}>🧭 Buka Rute</ThemedText>
                  </Pressable>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Spacing.two,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: Spacing.one,
    gap: 8,
  },
  searchIcon: {
    fontSize: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  infoBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: Spacing.one,
  },
  retryBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  list: {
    flex: 1,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitleArea: {
    flex: 1,
  },
  cardLabName: {
    fontSize: 15,
  },
  cardBuilding: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeLive: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeLiveText: {
    color: '#16A34A',
    fontSize: 10,
  },
  badgeRadius: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 6,
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  activityLabel: {
    fontSize: 11,
    color: '#DC2626',
  },
  activityLabelNext: {
    fontSize: 11,
    color: '#2563EB',
  },
  activityTitle: {
    fontSize: 11,
    flex: 1,
  },
  idleText: {
    fontSize: 11,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  coordsText: {
    fontSize: 10,
  },
  emptyBox: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  emptyIcon: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: 16,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  directRouteBtn: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  directRouteBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});
