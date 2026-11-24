import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { Feather, MaterialIcons } from '@expo/vector-icons';
import { LaboraColors } from '@/constants/theme';

interface GeofenceRadarProps {
  distanceMeters: number;
  maxRadiusMeters?: number;
  maxRadius?: number;
  labName?: string;
  isWithinRadius?: boolean;
  onTargetPress?: () => void;
  onLayersPress?: () => void;
  onRecenter?: () => void;
}

export function GeofenceRadar({
  distanceMeters = 14.2,
  maxRadiusMeters = 30,
  maxRadius,
  labName = 'Lab Jaringan',
  isWithinRadius = true,
  onTargetPress,
  onLayersPress,
  onRecenter,
}: GeofenceRadarProps) {
  const effectiveMaxRadius = maxRadius || maxRadiusMeters;
  const effectiveTargetPress = onRecenter || onTargetPress;
  const radarSize = 240;
  const center = radarSize / 2;
  const safeRadius = 90; // visual representation of max radius

  // Calculate relative position of user marker based on distance
  const ratio = Math.min(distanceMeters / effectiveMaxRadius, 1.4);
  const userOffset = safeRadius * ratio * 0.75;
  const userX = center + userOffset * 0.707;
  const userY = center - userOffset * 0.707;

  return (
    <View style={styles.card}>
      {/* Header Info */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Feather name="compass" size={16} color={LaboraColors.primary} />
          <Text style={styles.headerTitle}>Pemindaian Geofence {effectiveMaxRadius}m</Text>
        </View>
        <View style={styles.realtimePill}>
          <Text style={styles.realtimeText}>GPS Realtime</Text>
        </View>
      </View>

      {/* Radar Map Container */}
      <View style={styles.radarWrapper}>
        <Svg width={radarSize} height={radarSize} style={styles.radarSvg}>
          {/* Subtle Grid Lines */}
          <Line x1={20} y1={center} x2={radarSize - 20} y2={center} stroke="#F0E6EA" strokeDasharray="3 3" />
          <Line x1={center} y1={20} x2={center} y2={radarSize - 20} stroke="#F0E6EA" strokeDasharray="3 3" />

          {/* Outer Boundary Ring (Dashed) */}
          <Circle
            cx={center}
            cy={center}
            r={safeRadius * 1.15}
            stroke={LaboraColors.primaryBorder}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            fill="none"
          />

          {/* Max Geofence Range Zone */}
          <Circle
            cx={center}
            cy={center}
            r={safeRadius}
            fill="#FCE7EC"
            fillOpacity="0.45"
            stroke={LaboraColors.primary}
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          {/* Inner Sweetspot Ring */}
          <Circle
            cx={center}
            cy={center}
            r={safeRadius * 0.45}
            fill="#F9D8E0"
            fillOpacity="0.6"
            stroke={LaboraColors.primary}
            strokeWidth="1.2"
          />

          {/* Center Anchor Point (Lab Location) */}
          <Circle cx={center} cy={center} r={12} fill={LaboraColors.primary} />
          <Circle cx={center} cy={center} r={4} fill="#FFFFFF" />

          {/* Line Connecting Lab to User */}
          <Line
            x1={center}
            y1={center}
            x2={userX}
            y2={userY}
            stroke={isWithinRadius ? LaboraColors.primary : LaboraColors.danger}
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />

          {/* User Marker Dot */}
          <Circle
            cx={userX}
            cy={userY}
            r={9}
            fill={isWithinRadius ? '#10B981' : LaboraColors.danger}
            stroke="#FFFFFF"
            strokeWidth="2"
          />
        </Svg>

        {/* Floating Distance Badge on Top-Left */}
        <View style={styles.distanceBadge}>
          <Feather name="check-circle" size={14} color="#10B981" />
          <View style={{ marginLeft: 6 }}>
            <Text style={styles.distanceLabel}>Jarak ke Laboratorium</Text>
            <Text style={styles.distanceValue}>{distanceMeters.toFixed(1)} Meter</Text>
          </View>
        </View>

        {/* Center Tag Label */}
        <View style={[styles.centerTag, { top: center + 14 }]}>
          <Text style={styles.centerTagText}>{labName}</Text>
          <Text style={styles.centerTagSub}>Radius {effectiveMaxRadius} Meter</Text>
        </View>

        {/* User Tag Label */}
        <View style={[styles.userTag, { top: userY - 26, left: userX - 28 }]}>
          <View style={styles.userDotSmall} />
          <Text style={styles.userTagText}>Kamu ({distanceMeters.toFixed(1)}m)</Text>
        </View>

        {/* Floating Controls */}
        <View style={styles.controlsColumn}>
          <TouchableOpacity style={styles.controlBtn} onPress={effectiveTargetPress} activeOpacity={0.7}>
            <MaterialIcons name="my-location" size={16} color={LaboraColors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlBtn} onPress={onLayersPress} activeOpacity={0.7}>
            <Feather name="layers" size={15} color={LaboraColors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Status Banner */}
      <View
        style={[
          styles.statusBanner,
          {
            backgroundColor: isWithinRadius ? '#ECFDF5' : '#FEE2E2',
            borderColor: isWithinRadius ? '#A7F3D0' : '#FECACA',
          },
        ]}
      >
        <View style={styles.statusLeft}>
          <View
            style={[
              styles.statusIconCircle,
              { backgroundColor: isWithinRadius ? '#10B981' : LaboraColors.danger },
            ]}
          >
            <Feather name={isWithinRadius ? 'check' : 'x'} size={14} color="#FFFFFF" />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.statusTitle}>
              {isWithinRadius ? 'Dalam Radius Valid' : 'Di Luar Radius'}
            </Text>
            <Text style={styles.statusSub}>
              {isWithinRadius
                ? `Toleransi maksimal ${maxRadiusMeters} meter terpenuhi`
                : `Jarak Anda (${distanceMeters.toFixed(1)}m) melebihi batas toleransi`}
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.statusPill,
            { backgroundColor: isWithinRadius ? '#D1FAE5' : '#FED7D7' },
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              { color: isWithinRadius ? '#065F46' : '#991B1B' },
            ]}
          >
            {isWithinRadius ? 'Siap Presensi' : 'Tidak Valid'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    marginVertical: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  realtimePill: {
    backgroundColor: '#F5F0F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  realtimeText: {
    fontSize: 10,
    fontWeight: '600',
    color: LaboraColors.textSecondary,
  },
  radarWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAF5F7',
    borderRadius: 16,
    height: 250,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
  },
  radarSvg: {
    position: 'absolute',
  },
  distanceBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE5EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  distanceLabel: {
    fontSize: 9,
    color: LaboraColors.textSecondary,
    fontWeight: '500',
  },
  distanceValue: {
    fontSize: 12,
    fontWeight: '800',
    color: LaboraColors.textPrimary,
  },
  centerTag: {
    position: 'absolute',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: LaboraColors.primaryBorder,
  },
  centerTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: LaboraColors.primary,
  },
  centerTagSub: {
    fontSize: 8,
    color: LaboraColors.textSecondary,
  },
  userTag: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  userDotSmall: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  userTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#065F46',
  },
  controlsColumn: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    gap: 8,
  },
  controlBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: LaboraColors.cardBorder,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 12,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: LaboraColors.textPrimary,
  },
  statusSub: {
    fontSize: 11,
    color: LaboraColors.textSecondary,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
