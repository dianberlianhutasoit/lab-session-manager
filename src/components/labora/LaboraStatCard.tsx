import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LaboraColors } from '@/constants/theme';

interface LaboraStatCardProps {
  label: string;
  value: string | number;
  badgeText?: string;
  subLabel?: string;
  badgeType?: 'live' | 'active' | 'review' | 'neutral' | 'success';
  iconName?: keyof typeof Feather.glyphMap;
  compact?: boolean;
}

export function LaboraStatCard({
  label,
  value,
  badgeText,
  subLabel,
  badgeType = 'neutral',
  iconName,
  compact = false,
}: LaboraStatCardProps) {
  const effectiveBadge = badgeText || subLabel;
  const getBadgeColors = () => {
    switch (badgeType) {
      case 'live':
        return { bg: '#E6F4EA', text: '#137333', dot: true };
      case 'review':
        return { bg: '#FEF3C7', text: '#B45309' };
      case 'active':
        return { bg: '#FCE7EC', text: LaboraColors.primary };
      case 'success':
        return { bg: '#ECFDF5', text: '#059669' };
      default:
        return { bg: '#F5F0F2', text: LaboraColors.textSecondary };
    }
  };

  const badgeStyle = getBadgeColors();

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactValue}>{value}</Text>
        <Text style={styles.compactLabel} numberOfLines={2}>{label}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.iconCircle}>
          {iconName && <Feather name={iconName} size={15} color={LaboraColors.primary} />}
        </View>
        {effectiveBadge && (
          <View style={[styles.badge, { backgroundColor: badgeStyle.bg }]}>
            {badgeStyle.dot && <View style={[styles.liveDot, { backgroundColor: badgeStyle.text }]} />}
            <Text style={[styles.badgeText, { color: badgeStyle.text }]}>{effectiveBadge}</Text>
          </View>
        )}
      </View>
      <Text style={styles.valueText}>{value}</Text>
      <Text style={styles.labelText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: LaboraColors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  valueText: {
    fontSize: 24,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
    lineHeight: 28,
  },
  labelText: {
    fontSize: 12,
    fontWeight: '500',
    color: LaboraColors.textSecondary,
    marginTop: 2,
  },
  // Compact style for 4-box summary
  compactContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  compactValue: {
    fontSize: 18,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
  compactLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: LaboraColors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
});
