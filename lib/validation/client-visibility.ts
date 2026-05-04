import { z } from "zod";
import { clientAnalysisDocumentCategories } from "@ecopest/shared/constants";

const uidSchema = z.string().trim().min(1, "اختر العميل.");
const optionalTrimmedText = z
  .string()
  .trim()
  .max(800, "النص طويل أكثر من اللازم.")
  .optional();

export const uploadClientAnalysisDocumentSchema = z.object({
  clientUid: uidSchema,
  documentCategory: z.enum(clientAnalysisDocumentCategories),
  title: z.string().trim().min(2, "اكتب عنوان الملف.").max(120, "عنوان الملف طويل."),
});

export type UploadClientAnalysisDocumentValues = z.infer<typeof uploadClientAnalysisDocumentSchema>;

export const createClientServiceAreaSchema = z
  .object({
    clientUid: uidSchema,
    description: optionalTrimmedText,
    lat: z.number().finite().min(-90).max(90).optional(),
    lng: z.number().finite().min(-180).max(180).optional(),
    location: z.string().trim().min(3, "اكتب موقع المنطقة.").max(240, "موقع المنطقة طويل."),
    name: z.string().trim().min(2, "اكتب اسم المنطقة.").max(120, "اسم المنطقة طويل."),
  })
  .refine((value) => (value.lat === undefined && value.lng === undefined) || (value.lat !== undefined && value.lng !== undefined), {
    message: "حدد خط العرض وخط الطول معًا.",
    path: ["lat"],
  });

export type CreateClientServiceAreaValues = z.infer<typeof createClientServiceAreaSchema>;

export const updateClientStationVisibilitySchema = z.object({
  clientUid: uidSchema,
  reportsVisibleToClient: z.boolean(),
  stationId: z.string().trim().min(1, "اختر المحطة."),
  stationVisibleToClient: z.boolean(),
});

export type UpdateClientStationVisibilityValues = z.infer<typeof updateClientStationVisibilitySchema>;

export const createDailyAreaTaskSchema = z.object({
  areaId: z.string().trim().min(1, "اختر المنطقة."),
  notes: optionalTrimmedText,
  scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "اختر تاريخ صحيح."),
  technicianUid: z.string().trim().min(1, "اختر الفني."),
});

export type CreateDailyAreaTaskValues = z.infer<typeof createDailyAreaTaskSchema>;

export const completeDailyAreaTaskSchema = z.object({
  notes: optionalTrimmedText,
  sprayStatus: z.enum(["sprayed", "not_sprayed"]),
  taskId: z.string().trim().min(1),
});

export type CompleteDailyAreaTaskValues = z.infer<typeof completeDailyAreaTaskSchema>;
