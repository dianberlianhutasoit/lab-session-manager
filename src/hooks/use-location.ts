<<<<<<< HEAD
import type { Coordinates } from "@/types";
import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

export type LocationErrorCode =
  | "PERMISSION_DENIED"
  | "SERVICES_DISABLED"
  | "UNAVAILABLE"
  | "TIMEOUT";

export interface LocationError {
  code: LocationErrorCode;
  message: string;
}

export interface UseLocationOptions {
  autoFetch?: boolean;
  initialMock?: Coordinates | null;
}

export interface UseLocationResult {
  location: Coordinates | null;
  loading: boolean;
  error: LocationError | null;
  permissionStatus: "undetermined" | "granted" | "denied";
  isGpsEnabled: boolean;
  isMocking: boolean;
  refreshLocation: () => Promise<Coordinates | null>;
  setMockCoordinates: (coords: Coordinates | null) => void;
  clearError: () => void;
}

/**
 * SRS-02: Hook Geolocation & Izin Lokasi
 * Menangani 3 kondisi utama kegagalan lokasi:
 * 1. Izin ditolak (PERMISSION_DENIED)
 * 2. GPS / Layanan lokasi mati (SERVICES_DISABLED)
 * 3. Lokasi belum tersedia / timeout (UNAVAILABLE)
 */
export function useLocation(
  options: UseLocationOptions = {},
): UseLocationResult {
  const { autoFetch = true, initialMock = null } = options;

  const [location, setLocation] = useState<Coordinates | null>(initialMock);
  const [loading, setLoading] = useState<boolean>(autoFetch && !initialMock);
  const [error, setError] = useState<LocationError | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    "undetermined" | "granted" | "denied"
  >("undetermined");
  const [isGpsEnabled, setIsGpsEnabled] = useState<boolean>(true);
  const [mockCoords, setMockCoords] = useState<Coordinates | null>(initialMock);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const setMockCoordinates = useCallback((coords: Coordinates | null) => {
    setMockCoords(coords);
    if (coords) {
      setLocation(coords);
      setError(null);
      setLoading(false);
      setPermissionStatus("granted");
      setIsGpsEnabled(true);
    }
  }, []);

  const refreshLocation = useCallback(async (): Promise<Coordinates | null> => {
    if (mockCoords) {
      setLocation(mockCoords);
      setError(null);
      setLoading(false);
      return mockCoords;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Cek apakah layanan GPS perangkat aktif
      let servicesEnabled = true;
      try {
        servicesEnabled = await Location.hasServicesEnabledAsync();
      } catch {
        // Fallback untuk platform tertentu yang tidak mendukung pengecekan
        servicesEnabled = true;
      }

      if (!servicesEnabled) {
        const err: LocationError = {
          code: "SERVICES_DISABLED",
          message:
            "GPS / Layanan lokasi pada perangkat Anda sedang mati. Harap aktifkan GPS Anda di Pengaturan.",
        };
        if (isMountedRef.current) {
          setIsGpsEnabled(false);
          setError(err);
          setLoading(false);
        }
        return null;
      }

      if (isMountedRef.current) {
        setIsGpsEnabled(true);
      }

      // 2. Minta izin akses lokasi (Foreground Permission)
      let permResult: Location.LocationPermissionResponse;
      try {
        permResult = await Location.requestForegroundPermissionsAsync();
      } catch (e) {
        permResult = await Location.getForegroundPermissionsAsync();
        console.error("Error", e);
      }

      const granted = permResult.status === Location.PermissionStatus.GRANTED;

      if (!granted) {
        const err: LocationError = {
          code: "PERMISSION_DENIED",
          message:
            "Izin akses lokasi ditolak. Aplikasi memerlukan izin lokasi untuk memverifikasi kehadiran Anda di lab.",
        };
        if (isMountedRef.current) {
          setPermissionStatus("denied");
          setError(err);
          setLoading(false);
        }
        return null;
      }

      if (isMountedRef.current) {
        setPermissionStatus("granted");
      }

      // 3. Mengambil koordinat lokasi saat ini
      let currentPosition: Location.LocationObject | null = null;
      try {
        currentPosition = await Location.getCurrentPositionAsync({
          accuracy:
            Platform.OS === "web"
              ? Location.Accuracy.Balanced
              : Location.Accuracy.High,
        });
      } catch (locErr) {
        // Coba periksa apakah ada lokasi terakhir yang tercatat
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          currentPosition = lastKnown;
        } else {
          throw locErr;
        }
      }

      if (!currentPosition || !currentPosition.coords) {
        throw new Error("Koordinat tidak valid");
      }

      const resultCoords: Coordinates = {
        latitude: currentPosition.coords.latitude,
        longitude: currentPosition.coords.longitude,
        accuracy: currentPosition.coords.accuracy ?? null,
      };

      if (isMountedRef.current) {
        setLocation(resultCoords);
        setError(null);
        setLoading(false);
      }

      return resultCoords;
    } catch (err) {
      const isDenied =
        err instanceof Error &&
        (err.message.includes("denied") || err.message.includes("permission"));

      const errorObj: LocationError = isDenied
        ? {
            code: "PERMISSION_DENIED",
            message: "Izin akses lokasi ditolak oleh pengguna atau sistem.",
          }
        : {
            code: "UNAVAILABLE",
            message:
              "Lokasi perangkat belum tersedia atau gagal didapatkan. Pastikan sinyal GPS optimal dan coba lagi.",
          };

      if (isMountedRef.current) {
        setError(errorObj);
        setLoading(false);
      }
      return null;
    }
  }, [mockCoords]);

  useEffect(() => {
    if (autoFetch && !mockCoords) {
      const timeout = setTimeout(() => {
        void refreshLocation();
      }, 0);

      return () => clearTimeout(timeout);
    }
  }, [autoFetch, mockCoords, refreshLocation]);

  return {
    location,
    loading,
    error,
    permissionStatus,
    isGpsEnabled,
    isMocking: !!mockCoords,
    refreshLocation,
    setMockCoordinates,
    clearError,
=======
import { useState, useEffect, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface UserCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export interface UseLocationOptions {
  autoWatch?: boolean;
  accuracy?: Location.Accuracy;
  timeInterval?: number;
  distanceInterval?: number;
}

export interface UseLocationResult {
  location: UserCoordinates | null;
  coords: UserCoordinates | null; // Alias untuk kenyamanan
  permissionStatus: Location.PermissionStatus | 'undetermined';
  isLoading: boolean;
  error: string | null;
  isWatching: boolean;
  refreshLocation: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
}

/**
 * Hook geolocation reaktif untuk SRS-02 & SRS-09
 * Mendukung permintaan izin lokasi, perolehan posisi awal, dan pembaruan real-time (watchPositionAsync)
 * Dilengkapi pembersihan subscription saat unmount untuk efisiensi baterai.
 */
export function useLocation(options: UseLocationOptions = {}): UseLocationResult {
  const {
    autoWatch = true,
    accuracy = Location.Accuracy.Balanced,
    timeInterval = 5000,
    distanceInterval = 5,
  } = options;

  const [location, setLocation] = useState<UserCoordinates | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    Location.PermissionStatus | 'undetermined'
  >('undetermined');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState<boolean>(false);

  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Fungsi untuk meminta izin akses lokasi perangkat
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      setError(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (isMountedRef.current) {
        setPermissionStatus(status);
      }
      if (status !== Location.PermissionStatus.GRANTED) {
        if (isMountedRef.current) {
          setError('Izin akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan perangkat.');
        }
        return false;
      }
      return true;
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Gagal meminta izin lokasi.');
      }
      return false;
    }
  }, []);

  // Periksa apakah layanan GPS / lokasi aktif
  const checkServicesAndPermissions = useCallback(async (): Promise<boolean> => {
    try {
      if (Platform.OS !== 'web') {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) {
          if (isMountedRef.current) {
            setError('Layanan lokasi (GPS) nonaktif. Harap aktifkan GPS perangkat Anda.');
          }
          return false;
        }
      }

      const { status } = await Location.getForegroundPermissionsAsync();
      if (isMountedRef.current) {
        setPermissionStatus(status);
      }

      if (status !== Location.PermissionStatus.GRANTED) {
        return await requestPermission();
      }

      return true;
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Gagal memeriksa status lokasi.');
      }
      return false;
    }
  }, [requestPermission]);

  // Fungsi untuk mendapatkan posisi saat ini (one-shot refresh)
  const refreshLocation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const hasPermission = await checkServicesAndPermissions();
      if (!hasPermission) {
        if (isMountedRef.current) setIsLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy,
      });

      if (isMountedRef.current) {
        setLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed,
        });
        setError(null);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || 'Gagal memperoleh lokasi terkini.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [accuracy, checkServicesAndPermissions]);

  // Inisialisasi watchPositionAsync
  useEffect(() => {
    isMountedRef.current = true;

    async function startWatch() {
      setIsLoading(true);
      const ready = await checkServicesAndPermissions();
      if (!ready) {
        if (isMountedRef.current) setIsLoading(false);
        return;
      }

      try {
        // Ambil posisi awal terlebih dahulu agar UI segera mendapatkan koordinat
        const initialPos = await Location.getCurrentPositionAsync({ accuracy });
        if (isMountedRef.current) {
          setLocation({
            latitude: initialPos.coords.latitude,
            longitude: initialPos.coords.longitude,
            accuracy: initialPos.coords.accuracy,
            altitude: initialPos.coords.altitude,
            heading: initialPos.coords.heading,
            speed: initialPos.coords.speed,
          });
          setIsLoading(false);
        }

        if (autoWatch) {
          const sub = await Location.watchPositionAsync(
            {
              accuracy,
              timeInterval,
              distanceInterval,
            },
            (newPos) => {
              if (isMountedRef.current) {
                setLocation({
                  latitude: newPos.coords.latitude,
                  longitude: newPos.coords.longitude,
                  accuracy: newPos.coords.accuracy,
                  altitude: newPos.coords.altitude,
                  heading: newPos.coords.heading,
                  speed: newPos.coords.speed,
                });
                setError(null);
              }
            }
          );
          watchSubscriptionRef.current = sub;
          if (isMountedRef.current) setIsWatching(true);
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err.message || 'Gagal memantau pembaruan lokasi.');
          setIsLoading(false);
        }
      }
    }

    startWatch();

    return () => {
      isMountedRef.current = false;
      if (watchSubscriptionRef.current) {
        watchSubscriptionRef.current.remove();
        watchSubscriptionRef.current = null;
      }
    };
  }, [autoWatch, accuracy, timeInterval, distanceInterval, checkServicesAndPermissions]);

  return {
    location,
    coords: location,
    permissionStatus,
    isLoading,
    error,
    isWatching,
    refreshLocation,
    requestPermission,
>>>>>>> 2d78c47257728397e78b6d98e98cae724dcd107f
  };
}
