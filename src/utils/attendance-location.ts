import type { Coordinates, Lab, RadiusValidationResult } from "@/types";

export const EARTH_RADIUS_METERS = 6_371_000;

export function normalizeRoom(value: string): string {
  return value.trim().toLocaleLowerCase("id-ID");
}

export function findLabForRoom(labs: Lab[], room?: string | null): Lab | undefined {
  if (!room || !room.trim()) return undefined;
  const normalizedRoom = normalizeRoom(room);

  // 1. Direct match: ID, name, code, building
  const exact = labs.find(
    (lab) =>
      lab.id === room.trim() ||
      normalizeRoom(lab.name) === normalizedRoom ||
      (lab.code && normalizeRoom(lab.code) === normalizedRoom) ||
      normalizeRoom(lab.building) === normalizedRoom
  );
  if (exact) return exact;

  // 2. Fuzzy substring match (e.g. "Lab Komputer 1" matches "Laboratorium Komputer 1 (Lt. 2)")
  return labs.find((lab) => {
    const normName = normalizeRoom(lab.name);
    const normCode = lab.code ? normalizeRoom(lab.code) : "";
    return (
      normalizedRoom.includes(normName) ||
      normName.includes(normalizedRoom) ||
      (normCode && (normalizedRoom.includes(normCode) || normCode.includes(normalizedRoom)))
    );
  });
}

export function distanceInMeters(
  latitude: number,
  longitude: number,
  targetLatitude: number,
  targetLongitude: number
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(targetLatitude - latitude);
  const longitudeDelta = toRadians(targetLongitude - longitude);
  const startLatitude = toRadians(latitude);
  const endLatitude = toRadians(targetLatitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(startLatitude) *
      Math.cos(endLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  const distance = 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return Math.round(distance * 10) / 10;
}

export function validateAttendanceGeofence(
  userCoords: Coordinates,
  lab: Lab
): RadiusValidationResult {
  const distance = distanceInMeters(
    userCoords.latitude,
    userCoords.longitude,
    lab.latitude,
    lab.longitude
  );

  return {
    isWithinRadius: distance <= lab.radius,
    distanceMeters: distance,
    maxRadiusMeters: lab.radius,
    userCoordinates: userCoords,
    labLocation: {
      room: lab.name,
      name: `${lab.name} (${lab.building})`,
      latitude: lab.latitude,
      longitude: lab.longitude,
      radiusMeters: lab.radius,
    },
  };
}
