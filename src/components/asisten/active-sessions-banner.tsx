import React from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { ThemedText } from '@/components/themed-text';
import type { SessionWithDetails } from '@/context/session-context';
import type { User } from '@/types';
import { Spacing } from '@/constants/theme';

interface ActiveSessionsControlBannerProps {
  openSessions: SessionWithDetails[];
  selectedAssistantId: string;
  activeAssistant?: User;
  updatingSessionIds: string[];
  onCloseSingleSession: (session: SessionWithDetails) => void;
  onCloseAllSessions: () => void;
}

export function formatTimeWIB(isoString?: string): string {
  if (!isoString) return '-';
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) return '-';
  return `${parsed.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  })} WIB`;
}

export function ActiveSessionsControlBanner({
  openSessions,
  selectedAssistantId,
  activeAssistant,
  updatingSessionIds,
  onCloseSingleSession,
  onCloseAllSessions,
}: ActiveSessionsControlBannerProps) {
  if (openSessions.length === 0) {
    return null;
  }

  const handleConfirmCloseAll = () => {
    const foreignSessions =
      selectedAssistantId !== 'ALL'
        ? openSessions.filter((s) => s.assistantId !== selectedAssistantId)
        : [];

    const warningPrefix =
      foreignSessions.length > 0
        ? `⚠️ PERINGATAN: Terdapat ${foreignSessions.length} sesi milik asisten lain yang akan ikut ditutup oleh ${activeAssistant?.name ?? 'Anda'}.\n\n`
        : '';

    const message = `${warningPrefix}Apakah Anda yakin ingin menutup seluruh (${openSessions.length}) sesi praktikum yang sedang berlangsung sekarang?`;

    if (Platform.OS === 'web') {
      if (window.confirm(message)) {
        onCloseAllSessions();
      }
    } else {
      Alert.alert('Konfirmasi Tutup Semua Sesi', message, [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Tutup Semua',
          style: 'destructive',
          onPress: onCloseAllSessions,
        },
      ]);
    }
  };

  return (
    <View style={styles.banner}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <ThemedText type="smallBold" style={styles.liveText}>
              KONTROL SESI AKTIF (SRS-08)
            </ThemedText>
          </View>
          <ThemedText type="smallBold" style={styles.bannerSubtitle}>
            {openSessions.length} Sesi Sedang Dibuka untuk Presensi Praktikan
          </ThemedText>
        </View>

        <Pressable
          onPress={handleConfirmCloseAll}
          style={({ pressed }) => [
            styles.closeAllButton,
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={styles.closeAllText}>
            🔴 Tutup Semua ({openSessions.length})
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.activeItemsList}>
        {openSessions.map((sess) => {
          const isUpdating = updatingSessionIds.includes(sess.id);
          const isDifferentAssistant =
            selectedAssistantId !== 'ALL' &&
            selectedAssistantId !== sess.assistantId;

          return (
            <View key={sess.id} style={styles.activeItem}>
              <View style={styles.activeItemInfo}>
                <View style={styles.activeItemTop}>
                  <ThemedText type="smallBold" style={styles.itemCode}>
                    {sess.schedule?.courseCode ?? 'LAB'}
                  </ThemedText>
                  {sess.schedule?.className ? (
                    <ThemedText type="small" style={styles.itemClass}>
                      • {sess.schedule.className}
                    </ThemedText>
                  ) : null}
                  {isDifferentAssistant ? (
                    <View style={styles.otherAstBadge}>
                      <ThemedText type="small" style={styles.otherAstText}>
                        👤 {sess.assistant?.name ?? 'Asisten Lain'}
                      </ThemedText>
                    </View>
                  ) : null}
                </View>

                <ThemedText type="smallBold" style={styles.itemTitle} numberOfLines={1}>
                  {sess.schedule?.title ?? 'Praktikum'}
                </ThemedText>

                <ThemedText type="small" style={styles.itemMeta}>
                  📍 {sess.schedule?.room ?? '-'} • 🕒 Dibuka: {formatTimeWIB(sess.openedAt)}
                </ThemedText>
              </View>

              <Pressable
                disabled={isUpdating}
                onPress={() => onCloseSingleSession(sess)}
                style={({ pressed }) => [
                  styles.quickCloseButton,
                  isUpdating && styles.disabledButton,
                  pressed && styles.pressed,
                ]}>
                <ThemedText type="smallBold" style={styles.quickCloseText}>
                  {isUpdating ? '...' : 'Tutup Sesi'}
                </ThemedText>
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 16,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  titleGroup: {
    gap: 2,
    flex: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  liveText: {
    color: '#15803D',
    fontSize: 11,
    letterSpacing: 0.4,
  },
  bannerSubtitle: {
    color: '#14532D',
    fontSize: 14,
  },
  closeAllButton: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  closeAllText: {
    color: '#FFFFFF',
    fontSize: 12,
  },
  activeItemsList: {
    gap: 8,
  },
  activeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    gap: 10,
  },
  activeItemInfo: {
    flex: 1,
    gap: 2,
  },
  activeItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  itemCode: {
    color: '#0369A1',
    fontSize: 11,
  },
  itemClass: {
    color: '#4F46E5',
    fontSize: 11,
    fontWeight: '600',
  },
  otherAstBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  otherAstText: {
    color: '#92400E',
    fontSize: 10,
  },
  itemTitle: {
    color: '#0F172A',
    fontSize: 13,
  },
  itemMeta: {
    color: '#475569',
    fontSize: 11,
  },
  quickCloseButton: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  quickCloseText: {
    color: '#B91C1C',
    fontSize: 12,
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});

