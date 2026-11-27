import * as Location from "expo-location";
import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

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
  permissionStatus: Location.PermissionStatus | "undetermined";
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
export function useLocation(
  options: UseLocationOptions = {},
): UseLocationResult {
  const {
    autoWatch = true,
    accuracy = Location.Accuracy.Balanced,
    timeInterval = 5000,
    distanceInterval = 5,
  } = options;

  const [location, setLocation] = useState<UserCoordinates | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<
    Location.PermissionStatus | "undetermined"
  >("undetermined");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isWatching, setIsWatching] = useState<boolean>(false);

  const watchSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );
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
          setError(
            "Izin akses lokasi ditolak. Silakan izinkan akses lokasi di pengaturan perangkat.",
          );
        }
        return false;
      }
      return true;
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err.message || "Gagal meminta izin lokasi.");
      }
      return false;
    }
  }, []);

  // Periksa apakah layanan GPS / lokasi aktif
  const checkServicesAndPermissions =
    useCallback(async (): Promise<boolean> => {
      try {
        if (Platform.OS !== "web") {
          const servicesEnabled = await Location.hasServicesEnabledAsync();
          if (!servicesEnabled) {
            if (isMountedRef.current) {
              setError(
                "Layanan lokasi (GPS) nonaktif. Harap aktifkan GPS perangkat Anda.",
              );
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
          setError(err.message || "Gagal memeriksa status lokasi.");
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
        setError(err.message || "Gagal memperoleh lokasi terkini.");
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
            (newPos: Location.LocationObject) => {
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
            },
          );
          watchSubscriptionRef.current = sub;
          if (isMountedRef.current) setIsWatching(true);
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err.message || "Gagal memantau pembaruan lokasi.");
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
  }, [
    autoWatch,
    accuracy,
    timeInterval,
    distanceInterval,
    checkServicesAndPermissions,
  ]);

  return {
    location,
    coords: location,
    permissionStatus,
    isLoading,
    error,
    isWatching,
    refreshLocation,
    requestPermission,
  };
}
