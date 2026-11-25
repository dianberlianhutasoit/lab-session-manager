import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import MapView, { PROVIDER_GOOGLE, Region, Polyline } from 'react-native-maps';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import { useLocation } from '@/hooks/use-location';
import { useSessionContext } from '@/context/session-context';
import type { Lab, LabFormInput } from '@/types';
import { LabMarker } from '@/components/maps/lab-marker';
import { UserMarker } from '@/components/maps/user-marker';
import { LabActivitySheet } from '@/components/maps/lab-activity-sheet';
import { MapFallbackList } from '@/components/maps/map-fallback-list';
import { LabFormModal } from '@/components/asisten/lab-form-modal';
import { Spacing, LaboraColors } from '@/constants/theme';

export default function MapsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { labs, getLabActivity, users, isFirestoreConnected, updateLab } = useSessionContext();

  const mapRef = useRef<MapView | null>(null);

  // Hook Geolocation & WatchPosition (SRS-02 & SRS-09)
  const {
    location: userLocation,
    error: locationError,
    isLoading: isLocationLoading,
    permissionStatus,
    refreshLocation,
    requestPermission,
  } = useLocation({
    autoWatch: true,
    distanceInterval: 5,
    timeInterval: 5000,
  });

  const mapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const isMapKeyConfigured = Boolean(
    mapsApiKey &&
    mapsApiKey !== 'NOT_CONFIGURED' &&
    mapsApiKey !== 'YOUR_GOOGLE_MAPS_API_KEY' &&
    mapsApiKey !== 'your_google_maps_api_key'
  );

  const [selectedLab, setSelectedLab] = useState<Lab | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>(
    Platform.OS === 'web' || !isMapKeyConfigured ? 'list' : 'map'
  );

  // Assistant management modal
  const [editingLab, setEditingLab] = useState<Lab | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);

  const assistants = useMemo(() => users.filter((u) => u.role === 'asisten'), [users]);

  // Initial map region (pusatkan ke lab pertama atau default koordinat kampus)
  const defaultRegion: Region = useMemo(() => {
    if (labs.length > 0) {
      return {
        latitude: labs[0].latitude,
        longitude: labs[0].longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      };
    }
    return {
      latitude: -6.9175,
      longitude: 107.6191,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [labs]);

  // Recenter map on user location
  const handleRecenterUser = useCallback(() => {
    if (!userLocation) {
      refreshLocation();
      return;
    }
    mapRef.current?.animateToRegion(
      {
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      800
    );
  }, [userLocation, refreshLocation]);

  // Recenter map to cover all labs
  const handleRecenterLabs = useCallback(() => {
    if (labs.length === 0) return;
    if (labs.length === 1) {
      mapRef.current?.animateToRegion(
        {
          latitude: labs[0].latitude,
          longitude: labs[0].longitude,
          latitudeDelta: 0.006,
          longitudeDelta: 0.006,
        },
        800
      );
      return;
    }

    const coordinates = labs.map((l) => ({
      latitude: l.latitude,
      longitude: l.longitude,
    }));

    mapRef.current?.fitToCoordinates(coordinates, {
      edgePadding: { top: 60, right: 60, bottom: 180, left: 60 },
      animated: true,
    });
  }, [labs]);

  // Handle marker selection
  const handleSelectLab = useCallback((lab: Lab) => {
    setSelectedLab(lab);
    if (Platform.OS !== 'web' && viewMode === 'map') {
      if (userLocation) {
        mapRef.current?.fitToCoordinates(
          [
            { latitude: userLocation.latitude, longitude: userLocation.longitude },
            { latitude: lab.latitude, longitude: lab.longitude },
          ],
          {
            edgePadding: { top: 80, right: 60, bottom: 240, left: 60 },
            animated: true,
          }
        );
      } else {
        mapRef.current?.animateToRegion(
          {
            latitude: lab.latitude - 0.001, // Sedikit offset agar tidak tertutup bottom sheet
            longitude: lab.longitude,
            latitudeDelta: 0.004,
            longitudeDelta: 0.004,
          },
          600
        );
      }
    }
  }, [userLocation, viewMode]);

  const handleNavigateToPresensi = (sessionId: string) => {
    router.push({
      pathname: '/praktikan',
      params: { activeSessionId: sessionId },
    } as any);
  };

  const handleManageLab = (lab: Lab) => {
    setEditingLab(lab);
    setIsEditModalVisible(true);
  };

  const handleEditModalSubmit = async (data: LabFormInput) => {
    if (!editingLab) return;
    await updateLab(editingLab.id, data);
    setIsEditModalVisible(false);
    setEditingLab(null);
  };

  // Activity data untuk lab terpilih
  const selectedLabActivity = useMemo(() => {
    if (!selectedLab) return { ongoing: null, next: null };
    return getLabActivity(selectedLab.id);
  }, [selectedLab, getLabActivity]);

  const isMapPlatformAvailable = Platform.OS !== 'web' && isMapKeyConfigured;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Bar Header */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Math.max(insets.top, Spacing.two),
            backgroundColor: theme.background,
            borderBottomColor: '#E2E8F0',
          },
        ]}
      >
        <View style={styles.topBarContent}>
          <View>
            <View style={styles.titleRow}>
              <ThemedText type="smallBold" style={styles.pageTitle}>
                Peta Laboratorium
              </ThemedText>
              {!isFirestoreConnected ? (
                <View style={styles.offlinePill}>
                  <ThemedText type="smallBold" style={styles.offlinePillText}>Offline</ThemedText>
                </View>
              ) : null}
            </View>
            <ThemedText type="small" themeColor="textSecondary" style={styles.pageSubtitle}>
              {labs.length} Lab Informatika • Real-time Monitoring
            </ThemedText>
          </View>

          {/* Toggle View Mode: Map / List */}
          {isMapPlatformAvailable ? (
            <View style={[styles.toggleContainer, { backgroundColor: theme.backgroundElement }]}>
              <Pressable
                style={[
                  styles.toggleBtn,
                  viewMode === 'map' && styles.toggleBtnActive,
                ]}
                onPress={() => setViewMode('map')}
              >
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.toggleBtnText,
                    viewMode === 'map' && styles.toggleBtnTextActive,
                  ]}
                >
                  🗺️ Peta
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.toggleBtn,
                  viewMode === 'list' && styles.toggleBtnActive,
                ]}
                onPress={() => setViewMode('list')}
              >
                <ThemedText
                  type="smallBold"
                  style={[
                    styles.toggleBtnText,
                    viewMode === 'list' && styles.toggleBtnTextActive,
                  ]}
                >
                  📋 Daftar
                </ThemedText>
              </Pressable>
            </View>
          ) : null}
        </View>

        {/* Warning Banner untuk Izin Lokasi / GPS (SRS-12) */}
        {locationError ? (
          <View style={styles.warningBanner}>
            <ThemedText type="small" style={styles.warningBannerText}>
              ⚠️ {locationError}
            </ThemedText>
            {permissionStatus !== 'granted' ? (
              <Pressable
                style={styles.permissionActionBtn}
                onPress={requestPermission}
              >
                <ThemedText type="smallBold" style={styles.permissionActionText}>
                  Izinkan Lokasi
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Banner Penjelasan bila Google Maps API Key belum disetel */}
        {!isMapKeyConfigured && Platform.OS !== 'web' ? (
          <View style={[styles.warningBanner, { backgroundColor: '#F0F9FF', borderColor: '#BAE6FD', marginTop: 4 }]}>
            <ThemedText type="small" style={{ color: '#0369A1' }}>
              ℹ️ Google Maps API Key belum disetel di .env. Menggunakan tampilan daftar lab (SRS-12).
            </ThemedText>
          </View>
        ) : null}
      </View>

      {/* Main Content: MapView or Fallback List */}
      <View style={styles.content}>
        {viewMode === 'map' && isMapPlatformAvailable ? (
          <View style={StyleSheet.absoluteFill}>
            <MapView
              ref={mapRef}
              style={StyleSheet.absoluteFill}
              provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
              initialRegion={defaultRegion}
              showsUserLocation={false}
              showsMyLocationButton={false}
              showsCompass={true}
              onPress={() => setSelectedLab(null)}
            >
              {/* Marker Seluruh Lab Informatika (SRS-08) */}
              {labs.map((lab) => {
                const activity = getLabActivity(lab.id);
                const hasOpenSession = activity.ongoing?.session.status === 'OPEN';
                const isSelected = selectedLab?.id === lab.id;

                return (
                  <LabMarker
                    key={lab.id}
                    lab={lab}
                    isSelected={isSelected}
                    hasOngoingOpenSession={hasOpenSession}
                    onPress={() => handleSelectLab(lab)}
                  />
                );
              })}

              {/* Marker Posisi Pengguna Real-time (SRS-09) */}
              {userLocation ? <UserMarker location={userLocation} /> : null}

              {/* Rute Navigasi Visual In-App (Polyline) dari User ke Lab */}
              {selectedLab && userLocation ? (
                <Polyline
                  coordinates={[
                    { latitude: userLocation.latitude, longitude: userLocation.longitude },
                    { latitude: selectedLab.latitude, longitude: selectedLab.longitude },
                  ]}
                  strokeColor={LaboraColors.primary}
                  strokeWidth={3}
                  lineDashPattern={[6, 4]}
                />
              ) : null}
            </MapView>

            {/* Floating Action Buttons */}
            <View style={[styles.floatingControls, { top: Spacing.two }]}>
              {/* Tombol Pusatkan ke Pengguna */}
              <Pressable
                style={({ pressed }) => [
                  styles.fab,
                  { backgroundColor: theme.background },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleRecenterUser}
              >
                {isLocationLoading ? (
                  <ActivityIndicator size="small" color="#0284C7" />
                ) : (
                  <ThemedText style={styles.fabIcon}>📍</ThemedText>
                )}
              </Pressable>

              {/* Tombol Pusatkan ke Semua Lab */}
              <Pressable
                style={({ pressed }) => [
                  styles.fab,
                  { backgroundColor: theme.background },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleRecenterLabs}
              >
                <ThemedText style={styles.fabIcon}>🏢</ThemedText>
              </Pressable>

              {/* Tombol Segarkan Lokasi */}
              <Pressable
                style={({ pressed }) => [
                  styles.fab,
                  { backgroundColor: theme.background },
                  pressed && { opacity: 0.8 },
                ]}
                onPress={refreshLocation}
              >
                <ThemedText style={styles.fabIcon}>🔄</ThemedText>
              </Pressable>

              {/* Tombol Rute Eksternal Google Maps jika Lab Dipilih */}
              {selectedLab ? (
                <Pressable
                  style={({ pressed }) => [
                    styles.fab,
                    { backgroundColor: '#0284C7' },
                    pressed && { opacity: 0.8 },
                  ]}
                  onPress={() => {
                    const originParam = userLocation
                      ? `&origin=${userLocation.latitude},${userLocation.longitude}`
                      : '';
                    Linking.openURL(
                      `https://www.google.com/maps/dir/?api=1${originParam}&destination=${selectedLab.latitude},${selectedLab.longitude}&destination_place_id=${encodeURIComponent(
                        selectedLab.name
                      )}`
                    );
                  }}
                >
                  <ThemedText style={[styles.fabIcon, { color: '#FFFFFF' }]}>🧭</ThemedText>
                </Pressable>
              ) : null}
            </View>

            {/* Bottom Activity Sheet ketika Marker Dipilih (SRS-10) */}
            {selectedLab ? (
              <View style={[styles.bottomSheetContainer, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
                <LabActivitySheet
                  lab={selectedLab}
                  activity={selectedLabActivity}
                  userLocation={userLocation}
                  assistants={assistants}
                  onClose={() => setSelectedLab(null)}
                  onNavigateToPresensi={handleNavigateToPresensi}
                  onManageLab={handleManageLab}
                />
              </View>
            ) : null}
          </View>
        ) : (
          /* Fallback List View (SRS-12 & Web) */
          <MapFallbackList
            labs={labs}
            selectedLabId={selectedLab?.id || null}
            onSelectLab={(lab) => {
              setSelectedLab(lab);
              if (isMapPlatformAvailable) {
                setViewMode('map');
                handleSelectLab(lab);
              }
            }}
            getLabActivity={getLabActivity}
            userLocation={userLocation}
            isMapAvailable={isMapPlatformAvailable}
            onRetryMap={() => setViewMode('map')}
          />
        )}
      </View>

      {/* Modal Edit Lab Asisten */}
      <LabFormModal
        visible={isEditModalVisible}
        initialData={editingLab}
        onClose={() => {
          setIsEditModalVisible(false);
          setEditingLab(null);
        }}
        onSubmit={handleEditModalSubmit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    zIndex: 10,
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pageTitle: {
    fontSize: 18,
  },
  offlinePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  offlinePillText: {
    fontSize: 10,
    color: '#B45309',
  },
  pageSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#0284C7',
  },
  toggleBtnText: {
    fontSize: 12,
  },
  toggleBtnTextActive: {
    color: '#ffffff',
  },
  warningBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  warningBannerText: {
    fontSize: 11,
    color: '#B91C1C',
    flex: 1,
  },
  permissionActionBtn: {
    backgroundColor: '#B91C1C',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  permissionActionText: {
    color: '#ffffff',
    fontSize: 10,
  },
  content: {
    flex: 1,
    position: 'relative',
  },
  floatingControls: {
    position: 'absolute',
    right: Spacing.three,
    gap: 10,
    zIndex: 20,
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
  },
  fabIcon: {
    fontSize: 18,
  },
  bottomSheetContainer: {
    position: 'absolute',
    left: Spacing.two,
    right: Spacing.two,
    bottom: Spacing.one,
    zIndex: 30,
  },
});
