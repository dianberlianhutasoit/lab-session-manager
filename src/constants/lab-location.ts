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
 * Konfigurasi default lokasi laboratorium dan radius toleransi (30 meter)
 */
export const DEFAULT_LAB_LOCATION: LabLocationConfig = {
  room: "Default Lab",
  name: "Gedung Laboratorium Komputer Terpadu",
  latitude: 2.38324,
  longitude: 99.14845,
  radiusMeters: 30,
};

/**
 * Pemetaan koordinat laboratorium berdasarkan nama ruangan (Sinkron dengan data Del / dummy.ts)
 */
export const LAB_ROOM_LOCATIONS: Record<string, LabLocationConfig> = {
  "Lab Komputer 1": {
    room: "Lab Komputer 1",
    name: "Laboratorium Komputer 1 (Lt. 2)",
    latitude: 2.38324,
    longitude: 99.14845,
    radiusMeters: 30,
  },
  "Lab Komputer 2": {
    room: "Lab Komputer 2",
    name: "Laboratorium Komputer 2 (Lt. 3)",
    latitude: 2.38340,
    longitude: 99.14855,
    radiusMeters: 30,
  },
  "Lab Jaringan": {
    room: "Lab Jaringan",
    name: "Laboratorium Jaringan & Sistem (Lt. 1)",
    latitude: 2.38310,
    longitude: 99.14825,
    radiusMeters: 35,
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
