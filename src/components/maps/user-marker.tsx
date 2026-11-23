import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Marker, Circle } from 'react-native-maps';
import type { UserCoordinates } from '@/hooks/use-location';

interface UserMarkerProps {
  location: UserCoordinates;
}

export const UserMarker = React.memo(function UserMarker({ location }: UserMarkerProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.6,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <>
      {location.accuracy && location.accuracy > 0 && location.accuracy < 200 ? (
        <Circle
          center={{
            latitude: location.latitude,
            longitude: location.longitude,
          }}
          radius={location.accuracy}
          fillColor="rgba(59, 130, 246, 0.12)"
          strokeColor="rgba(59, 130, 246, 0.3)"
          strokeWidth={1}
        />
      ) : null}

      <Marker
        coordinate={{
          latitude: location.latitude,
          longitude: location.longitude,
        }}
        title="Posisi Anda"
        description="Lokasi perangkat saat ini (Real-time)"
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <View style={styles.container}>
          <Animated.View
            style={[
              styles.pulseCircle,
              {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          />
          <View style={styles.coreCircle}>
            <View style={styles.innerDot} />
          </View>
        </View>
      </Marker>
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircle: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(59, 130, 246, 0.35)',
  },
  coreCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  innerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2563EB',
  },
});
