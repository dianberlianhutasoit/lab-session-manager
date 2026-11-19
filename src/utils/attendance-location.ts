import type { Lab } from "@/types";

const EARTH_RADIUS_METERS = 6_371_000;

function normalizeRoom(value: string): string {
  return value.trim().toLocaleLowerCase("id-ID");
}

export function findLabForRoom(labs: Lab[], room: string): Lab | undefined {
  const normalizedRoom = normalizeRoom(room);
  return labs.find(
    (lab) =>
      normalizeRoom(lab.name) === normalizedRoom ||
      normalizeRoom(lab.building) === normalizedRoom
  );
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

  return 2 * EARTH_RADIUS_METERS * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}
