import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { LaboraColors } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';

interface CircularGaugeProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  centerIcon?: string;
  title?: string;
  statusText?: string;
  subtitle?: string;
  showCheckBadge?: boolean;
}

export function CircularGauge({
  percentage = 94.2,
  size = 140,
  strokeWidth = 14,
  color = LaboraColors.primary,
  trackColor = '#FDF2F4',
  centerIcon,
  title = 'TINGKAT KEHADIRAN',
  statusText = 'Sangat Baik',
  subtitle = '16 dari 17 total sesi lab telah selesai',
  showCheckBadge = true,
}: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  const strokeDashoffset = circumference - (circumference * clampedPercentage) / 100;

  return (
    <View style={styles.card}>
      <View style={styles.contentRow}>
        <View style={styles.textColumn}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.percentageRow}>
            <Text style={styles.percentageText}>{percentage.toFixed(1)}%</Text>
            {statusText && (
              <Text style={styles.statusText}>{statusText}</Text>
            )}
          </View>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        <View style={[styles.gaugeContainer, { width: size, height: size }]}>
          <Svg width={size} height={size}>
            {/* Background Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#F3D8DF"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress Circle */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={LaboraColors.primary}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </Svg>

          {showCheckBadge && (
            <View style={styles.centerBadge}>
              <Feather name="check" size={18} color={LaboraColors.primary} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginVertical: 8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textColumn: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    color: LaboraColors.textSecondary,
    letterSpacing: 0.8,
  },
  percentageRow: {
    marginTop: 4,
    marginBottom: 4,
  },
  percentageText: {
    fontSize: 32,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
    lineHeight: 38,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
    color: LaboraColors.primary,
    marginTop: -2,
  },
  subtitle: {
    fontSize: 12,
    color: LaboraColors.textSecondary,
    marginTop: 4,
    lineHeight: 16,
  },
  gaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  centerBadge: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FCE7EC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: LaboraColors.primaryBorder,
  },
});
