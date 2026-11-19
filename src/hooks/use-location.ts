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
  };
}
