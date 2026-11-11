import React from 'react';
import { View, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import type { User } from '@/types';

export type StatusFilter = 'ALL' | 'OPEN' | 'CLOSED';

interface SessionFilterHeaderProps {
  assistants: User[];
  selectedAssistantId: string; // 'ALL' or specific assistantId
  onSelectAssistant: (id: string) => void;
  statusFilter: StatusFilter;
  onSelectStatusFilter: (status: StatusFilter) => void;
  counts: {
    total: number;
    open: number;
    closed: number;
  };
}

export function SessionFilterHeader({
  assistants,
  selectedAssistantId,
  onSelectAssistant,
  statusFilter,
  onSelectStatusFilter,
  counts,
}: SessionFilterHeaderProps) {
  return (
    <View style={styles.container}>
      {/* Stats Counter Bar (SRS-07 Visual overview) */}
      <View style={styles.statsRow}>
        <ThemedView type="backgroundElement" style={styles.statBox}>
          <ThemedText type="small" themeColor="textSecondary">
            Total Sesi
          </ThemedText>
          <ThemedText type="subtitle">{counts.total}</ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={[styles.statBox, styles.statBoxOpen]}>
          <ThemedText type="small" style={styles.statLabelOpen}>
            Sesi Terbuka
          </ThemedText>
          <ThemedText type="subtitle" style={styles.statValueOpen}>
            {counts.open}
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={[styles.statBox, styles.statBoxClosed]}>
          <ThemedText type="small" style={styles.statLabelClosed}>
            Sesi Ditutup
          </ThemedText>
          <ThemedText type="subtitle" style={styles.statValueClosed}>
            {counts.closed}
          </ThemedText>
        </ThemedView>
      </View>

      {/* Assistant Filter Pills */}
      <View style={styles.filterSection}>
        <ThemedText type="smallBold" themeColor="textSecondary">
          Pilih Akun Asisten:
        </ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillScroll}>
          <Pressable
            onPress={() => onSelectAssistant('ALL')}
            style={[
              styles.pill,
              selectedAssistantId === 'ALL' && styles.pillActive,
            ]}>
            <ThemedText
              type="small"
              style={[
                styles.pillText,
                selectedAssistantId === 'ALL' && styles.pillTextActive,
              ]}>
              Semua Asisten
            </ThemedText>
          </Pressable>

          {assistants.map((ast) => {
            const isSelected = selectedAssistantId === ast.id;
            return (
              <Pressable
                key={ast.id}
                onPress={() => onSelectAssistant(ast.id)}
                style={[styles.pill, isSelected && styles.pillActive]}>
                <ThemedText
                  type="small"
                  style={[styles.pillText, isSelected && styles.pillTextActive]}>
                  👤 {ast.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.statusTabRow}>
        {(['ALL', 'OPEN', 'CLOSED'] as StatusFilter[]).map((st) => {
          const isSelected = statusFilter === st;
          const label = st === 'ALL' ? 'Semua Status' : st === 'OPEN' ? '🟢 Sesi Dibuka' : '🔴 Sesi Ditutup';
          return (
            <Pressable
              key={st}
              onPress={() => onSelectStatusFilter(st)}
              style={[styles.statusTab, isSelected && styles.statusTabActive]}>
              <ThemedText
                type="smallBold"
                style={[
                  styles.statusTabText,
                  isSelected && styles.statusTabTextActive,
                ]}>
                {label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  statBox: {
    flex: 1,
    padding: Spacing.three,
    borderRadius: 14,
    alignItems: 'center',
    gap: 4,
  },
  statBoxOpen: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  statLabelOpen: {
    color: '#15803D',
  },
  statValueOpen: {
    color: '#16A34A',
  },
  statBoxClosed: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  statLabelClosed: {
    color: '#B91C1C',
  },
  statValueClosed: {
    color: '#DC2626',
  },
  filterSection: {
    gap: 8,
  },
  pillScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  pillActive: {
    backgroundColor: '#0284C7',
    borderColor: '#0284C7',
  },
  pillText: {
    color: '#475569',
  },
  pillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  statusTabRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  statusTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  statusTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusTabText: {
    color: '#64748B',
    fontSize: 12,
  },
  statusTabTextActive: {
    color: '#0F172A',
  },
});
