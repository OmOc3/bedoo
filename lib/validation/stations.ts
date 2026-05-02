import { z } from "zod";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isEmptyCoordinate(value: unknown): boolean {
  if (!isRecord(value)) {
    return value === undefined;
  }

  const lat = value.lat;
  const lng = value.lng;

  return (
    (lat === undefined || lat === "" || (typeof lat === "number" && Number.isNaN(lat))) &&
    (lng === undefined || lng === "" || (typeof lng === "number" && Number.isNaN(lng)))
  );
}

const stationLabelSchema = z.string().trim().min(1).max(120);
const stationLocationSchema = z.string().trim().min(1).max(200);
const stationZoneSchema = z.string().trim().max(80).optional();

export const stationCoordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const createStationSchema = z.object({
  label: stationLabelSchema,
  location: stationLocationSchema,
  description: z.string().trim().max(800).optional(),
  photoUrls: z.array(z.string().url()).max(8).optional(),
  zone: stationZoneSchema,
  requiresImmediateSupervision: z.boolean().optional(),
  coordinates: z.preprocess(
    (value) => (isEmptyCoordinate(value) ? undefined : value),
    stationCoordinatesSchema.optional(),
  ),
});

export const updateStationSchema = createStationSchema.partial();

export const stationFormSchema = z.object({
  label: stationLabelSchema,
  location: stationLocationSchema,
  description: z.string().trim().max(800).optional(),
  zone: stationZoneSchema,
  requiresImmediateSupervision: z.boolean().optional(),
  lat: z.string().trim().optional(),
  lng: z.string().trim().optional(),
});

export type CreateStationValues = z.infer<typeof createStationSchema>;
export type UpdateStationValues = z.infer<typeof updateStationSchema>;
export type StationFormValues = z.infer<typeof stationFormSchema>;
