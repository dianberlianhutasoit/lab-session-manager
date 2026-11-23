import type {
  Coordinates,
  LabLocationConfig,
  RadiusValidationResult,
} from "@/types";

/**
 * Radius Bumi rata-rata dalam meter (WGS84 spherical approximation)
 */
export const EARTH_RADIUS_METERS = 6371000;

/**
 * Konfigurasi default lokasi laboratorium dan radius toleransi (50 meter)
 */
export const DEFAULT_LAB_LOCATION: LabLocationConfig = {
  room: "Default Lab",
  name: "Gedung Laboratorium Komputer Terpadu",
  latitude: -6.974001,
  longitude: 107.630348,
  radiusMeters: 50,
};

/**
 * Pemetaan koordinat laboratorium berdasarkan nama ruangan
 */
export const LAB_ROOM_LOCATIONS: Record<string, LabLocationConfig> = {
  "Lab Komputer 1": {
    room: "Lab Komputer 1",
    name: "Laboratorium Komputer 1 (Lt. 2)",
    latitude: -6.974001,
    longitude: 107.630348,
    radiusMeters: 50,
  },
  "Lab Komputer 2": {
    room: "Lab Komputer 2",
    name: "Laboratorium Komputer 2 (Lt. 2)",
    latitude: -6.974025,
    longitude: 107.630385,
    radiusMeters: 50,
  },
  "Lab Jaringan": {
    room: "Lab Jaringan",
    name: "Laboratorium Jaringan & Sistem (Lt. 3)",
    latitude: -6.97398,
    longitude: 107.63031,
    radiusMeters: 50,
  },
};

/**
 * Mencari konfigurasi koordinat lab berdasarkan nama ruangan
 */
export function getLabLocationForRoom(room?: string): LabLocationConfig {
  if (!room) return DEFAULT_LAB_LOCATION;
  const directMatch = LAB_ROOM_LOCATIONS[room.trim()];
  if (directMatch) return directMatch;

  const foundKey = Object.keys(LAB_ROOM_LOCATIONS).find((key) =>
    room.toLowerCase().includes(key.toLowerCase()),
  );
  if (foundKey) return LAB_ROOM_LOCATIONS[foundKey];

  return {
    ...DEFAULT_LAB_LOCATION,
    room,
    name: `Ruang ${room}`,
  };
}

/**
 * SRS-03: Menghitung jarak lingkaran besar antara dua koordinat menggunakan Formula Haversine
 * @returns Jarak dalam meter
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_METERS * c;

  return Math.round(distance * 10) / 10;
}

/**
 * SRS-03: Validasi apakah posisi praktikan berada di dalam radius laboratorium yang ditentukan
 */
export function validateLabRadius(
  userCoords: Coordinates,
  room?: string,
): RadiusValidationResult {
  const labLocation = getLabLocationForRoom(room);
  const distanceMeters = calculateHaversineDistance(
    userCoords.latitude,
    userCoords.longitude,
    labLocation.latitude,
    labLocation.longitude,
  );

  const isWithinRadius = distanceMeters <= labLocation.radiusMeters;

  return {
    isWithinRadius,
    distanceMeters,
    maxRadiusMeters: labLocation.radiusMeters,
    userCoordinates: userCoords,
    labLocation,
  };
}

/**
 * Format representasi jarak untuk tampilan antarmuka
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}
