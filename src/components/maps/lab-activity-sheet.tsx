import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Lab, Schedule, Session, User } from '@/types';
import type { UserCoordinates } from '@/hooks/use-location';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/context/auth-context';

export interface LabActivityData {
  ongoing: { session: Session; schedule: Schedule } | null;
  next: { session: Session; schedule: Schedule } | null;
}

interface LabActivitySheetProps {
  lab: Lab;
  activity: LabActivityData;
  userLocation: UserCoordinates | null;
  assistants: User[];
  onClose: () => void;
  onNavigateToPresensi?: (sessionId: string) => void;
  onManageLab?: (lab: Lab) => void;
}

/**
 * Menghitung jarak dua titik koordinat dalam meter menggunakan rumus Haversine
 */
export function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radius bumi dalam meter
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export function LabActivitySheet({
  lab,
  activity,
  userLocation,
  assistants,
  onClose,
  onNavigateToPresensi,
  onManageLab,
}: LabActivitySheetProps) {
  const theme = useTheme();
  const { profile } = useAuth();
  const isAssistant = profile?.role === 'asisten';

  // Hitung jarak perangkat ke laboratorium jika koordinat tersedia
  const distance = userLocation
    ? getDistanceInMeters(
        userLocation.latitude,
        userLocation.longitude,
        lab.latitude,
        lab.longitude
      )
    : null;

  const isWithinRadius = distance !== null ? distance <= lab.radius : null;

  const ongoingAssistant = activity.ongoing
    ? assistants.find((a) => a.id === activity.ongoing?.session.assistantId)
    : null;

  return (
    <ThemedView
      style={[
        styles.sheet,
        {
          backgroundColor: theme.background,
          borderColor: '#CBD5E1',
        },
      ]}
    >
      {/* Header Sheet */}
      <View style={styles.header}>
        <View style={styles.titleArea}>
          <View style={styles.nameRow}>
            <ThemedText type="smallBold" style={styles.labName}>
              {lab.name}
            </ThemedText>
            {lab.code ? (
              <View style={styles.codeBadge}>
                <ThemedText type="smallBold" style={styles.codeText}>{lab.code}</ThemedText>
              </View>
            ) : null}
          </View>
          <ThemedText type="small" themeColor="textSecondary" style={styles.buildingText}>
            🏢 {lab.building} • Geofence {lab.radius}m
          </ThemedText>
        </View>

        <Pressable
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.6 }]}
          onPress={onClose}
        >
          <ThemedText type="smallBold" style={styles.closeBtnText}>✕</ThemedText>
        </Pressable>
      </View>

      {/* Info Status Jarak (SRS-03 & SRS-10) */}
      {distance !== null ? (
        <View
          style={[
            styles.distanceBanner,
            isWithinRadius ? styles.distanceInside : styles.distanceOutside,
          ]}
        >
          <ThemedText
            type="smallBold"
            style={{ color: isWithinRadius ? '#15803D' : '#B45309' }}
          >
            {isWithinRadius
              ? `🎯 Anda berada di dalam radius presensi (${distance}m dari lab)`
              : `📍 Jarak Anda: ${distance}m (Di luar batas radius ${lab.radius}m)`}
          </ThemedText>
        </View>
      ) : null}

      {/* Sesi Berlangsung (Ongoing Activity) */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>
            🔴 Praktikum Berlangsung
          </ThemedText>
          {activity.ongoing ? (
            <View
              style={[
                styles.statusBadge,
                activity.ongoing.session.status === 'OPEN'
                  ? styles.statusOpen
                  : styles.statusClosed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={[
                  styles.statusBadgeText,
                  activity.ongoing.session.status === 'OPEN'
                    ? styles.statusOpenText
                    : styles.statusClosedText,
                ]}
              >
                {activity.ongoing.session.status === 'OPEN' ? 'SESI DIBUKA' : 'TERJADWAL'}
              </ThemedText>
            </View>
          ) : null}
        </View>

        {activity.ongoing ? (
          <View style={[styles.activityCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.courseTitle}>
              {activity.ongoing.schedule.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.classInfo}>
              {activity.ongoing.schedule.className || 'Kelas Praktikum'} •{' '}
              {activity.ongoing.schedule.courseCode}
            </ThemedText>
            <View style={styles.timeRow}>
              <ThemedText type="smallBold" style={styles.timeText}>
                ⏰ {activity.ongoing.schedule.startTime} - {activity.ongoing.schedule.endTime} WIB
              </ThemedText>
              {ongoingAssistant ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.assistantText}>
                  👤 {ongoingAssistant.name}
                </ThemedText>
              ) : null}
            </View>

            {/* Tombol Aksi Praktikan jika Sesi Terbuka */}
            {!isAssistant && activity.ongoing.session.status === 'OPEN' && onNavigateToPresensi ? (
              <Pressable
                style={({ pressed }) => [
                  styles.presensiBtn,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={() => onNavigateToPresensi(activity.ongoing!.session.id)}
              >
                <ThemedText type="smallBold" style={styles.presensiBtnText}>
                  📋 Buka Layar Presensi
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <View style={[styles.emptySection, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Tidak ada praktikum aktif saat ini di laboratorium ini.
            </ThemedText>
          </View>
        )}
      </View>

      {/* Sesi Berikutnya (Next Activity) */}
      <View style={styles.section}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>
          ⏭️ Praktikum Berikutnya
        </ThemedText>

        {activity.next ? (
          <View style={[styles.activityCard, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold" style={styles.courseTitle}>
              {activity.next.schedule.title}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.classInfo}>
              {activity.next.schedule.className || 'Kelas Praktikum'} •{' '}
              {activity.next.schedule.courseCode}
            </ThemedText>
            <ThemedText type="smallBold" style={styles.timeText}>
              ⏰ {activity.next.schedule.startTime} - {activity.next.schedule.endTime} WIB
            </ThemedText>
          </View>
        ) : (
          <View style={[styles.emptySection, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
              Tidak ada jadwal praktikum lanjutan hari ini.
            </ThemedText>
          </View>
        )}
      </View>

      {/* Action Footer untuk Asisten */}
      {isAssistant && onManageLab ? (
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.manageBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={() => onManageLab(lab)}
          >
            <ThemedText type="smallBold" style={{ color: '#0284C7' }}>
              ⚙️ Kelola Laboratorium Ini
            </ThemedText>
          </Pressable>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.one,
  },
  titleArea: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labName: {
    fontSize: 18,
  },
  codeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
  },
  codeText: {
    fontSize: 11,
    color: '#0284C7',
  },
  buildingText: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  closeBtnText: {
    fontSize: 14,
  },
  distanceBanner: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: Spacing.one,
  },
  distanceInside: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  distanceOutside: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  section: {
    marginTop: Spacing.one,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusOpen: {
    backgroundColor: '#DCFCE7',
  },
  statusClosed: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 10,
  },
  statusOpenText: {
    color: '#16A34A',
  },
  statusClosedText: {
    color: '#64748B',
  },
  activityCard: {
    padding: 10,
    borderRadius: 8,
    gap: 3,
  },
  courseTitle: {
    fontSize: 14,
  },
  classInfo: {
    fontSize: 12,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  timeText: {
    fontSize: 12,
  },
  assistantText: {
    fontSize: 11,
  },
  presensiBtn: {
    marginTop: 8,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#0284C7',
  },
  presensiBtnText: {
    color: '#ffffff',
    fontSize: 13,
  },
  emptySection: {
    padding: 10,
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  footer: {
    marginTop: Spacing.two,
    paddingTop: Spacing.one,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  manageBtn: {
    borderWidth: 1,
    borderColor: '#0284C7',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
});
