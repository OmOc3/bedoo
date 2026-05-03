import { AppError } from "@/lib/errors";
import {
  distanceMeters,
  isValidCoordinates,
  maxLocationAccuracyMeters,
  stationAccessRadiusMeters,
} from "@/lib/geo";
import type { Coordinates, Station } from "@/types";

export type StationAccessLocation = Coordinates & {
  accuracyMeters?: number;
};

export interface StationAccessResult {
  distanceMeters: number;
}

export function assertStationAccessLocation(
  station: Pick<Station, "coordinates">,
  location: StationAccessLocation,
): StationAccessResult {
  const coordinates = {
    lat: location.lat,
    lng: location.lng,
  };

  if (!isValidCoordinates(coordinates)) {
    throw new AppError("إحداثيات الموقع غير صالحة.", "STATION_ACCESS_LOCATION_INVALID", 400);
  }

  if (
    typeof location.accuracyMeters === "number" &&
    (!Number.isFinite(location.accuracyMeters) || location.accuracyMeters > maxLocationAccuracyMeters)
  ) {
    throw new AppError(
      "دقة الموقع ضعيفة. فعّل GPS واقترب من المحطة ثم حاول مرة أخرى.",
      "STATION_ACCESS_LOCATION_ACCURACY_LOW",
      400,
    );
  }

  if (!station.coordinates) {
    throw new AppError(
      "لا توجد إحداثيات مسجلة لهذه المحطة. تواصل مع المدير لتحديث موقع المحطة قبل حفظ التقرير.",
      "STATION_ACCESS_LOCATION_MISSING",
      409,
    );
  }

  const distance = distanceMeters(coordinates, station.coordinates);

  if (distance > stationAccessRadiusMeters) {
    throw new AppError(
      `المحطة دي خارج النطاق المسموح. لازم تكون داخل ${stationAccessRadiusMeters} متر من المحطة عشان تسجل التقرير.`,
      "STATION_ACCESS_OUT_OF_RANGE",
      403,
    );
  }

  return { distanceMeters: Math.round(distance) };
}
