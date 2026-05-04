import type { Coordinates } from "@/types";

export const stationAccessRadiusMeters = 100;
export const maxLocationAccuracyMeters = 50;

export interface LocatedStation<T> {
  distanceMeters: number;
  station: T;
}

export function isValidCoordinates(coordinates: Coordinates): boolean {
  return (
    Number.isFinite(coordinates.lat) &&
    Number.isFinite(coordinates.lng) &&
    coordinates.lat >= -90 &&
    coordinates.lat <= 90 &&
    coordinates.lng >= -180 &&
    coordinates.lng <= 180
  );
}

export function distanceMeters(left: Coordinates, right: Coordinates): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLat = toRadians(right.lat - left.lat);
  const deltaLng = toRadians(right.lng - left.lng);
  const lat1 = toRadians(left.lat);
  const lat2 = toRadians(right.lat);
  const haversine =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function stationsWithinRadius<T extends { coordinates?: Coordinates }>(
  stations: T[],
  origin: Coordinates,
  radiusMeters = stationAccessRadiusMeters,
): LocatedStation<T>[] {
  return stations
    .filter((station): station is T & { coordinates: Coordinates } => station.coordinates !== undefined)
    .map((station) => ({
      distanceMeters: Math.round(distanceMeters(origin, station.coordinates)),
      station,
    }))
    .filter((entry) => entry.distanceMeters <= radiusMeters)
    .sort((first, second) => first.distanceMeters - second.distanceMeters);
}
