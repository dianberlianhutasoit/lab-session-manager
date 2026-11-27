import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { Marker, Circle } from 'react-native-maps';
import type { Lab } from '@/types';

interface LabMarkerProps {
  lab: Lab;
  isSelected: boolean;
  hasOngoingOpenSession: boolean;
  onPress: () => void;
}

export const LabMarker = React.memo(function LabMarker({
  lab,
  isSelected,
  hasOngoingOpenSession,
  onPress,
}: LabMarkerProps) {
  return (
    <>
      {isSelected ? (
        <Circle
          center={{
            latitude: lab.latitude,
            longitude: lab.longitude,
          }}
          radius={lab.radius}
          fillColor="rgba(79, 70, 229, 0.18)"
          strokeColor="rgba(79, 70, 229, 0.75)"
          strokeWidth={2}
        />
      ) : null}

      <Marker
        coordinate={{
          latitude: lab.latitude,
          longitude: lab.longitude,
        }}
        title={lab.name}
        description={`${lab.building} (Radius ${lab.radius}m)`}
        onPress={onPress}
      >
        <View
          style={[
            styles.customMarker,
            isSelected && styles.markerSelected,
            hasOngoingOpenSession && styles.markerActiveSession,
          ]}
        >
          <View
            style={[
              styles.iconWrapper,
              hasOngoingOpenSession && styles.iconActiveWrapper,
              isSelected && styles.iconSelectedWrapper,
            ]}
          >
            <Text style={styles.iconText}>
              {hasOngoingOpenSession ? '🟢' : '💻'}
            </Text>
          </View>
          <View style={styles.labelContainer}>
            <Text style={styles.labelText} numberOfLines={1}>
              {lab.name}
            </Text>
            {hasOngoingOpenSession ? (
              <View style={styles.liveBadge}>
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Marker>
    </>
  );
});

const styles = StyleSheet.create({
  customMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#4F46E5',
    flexDirection: 'row',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  markerSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EEF2FF',
    transform: [{ scale: 1.1 }],
    elevation: 8,
  },
  markerActiveSession: {
    borderColor: '#16A34A',
    backgroundColor: '#F0FDF4',
  },
  iconWrapper: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActiveWrapper: {
    backgroundColor: '#DCFCE7',
  },
  iconSelectedWrapper: {
    backgroundColor: '#DBEAFE',
  },
  iconText: {
    fontSize: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
    maxWidth: 110,
  },
  liveBadge: {
    backgroundColor: '#16A34A',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  liveBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
});
