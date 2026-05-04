import { z } from "zod";

export const stationImportFormSchema = z.object({
  clientUid: z.string().trim().min(1, "اختر العميل."),
  csvText: z.string().trim().min(20, "ألصق محتوى CSV أو ارفع ملف CSV صالح."),
  sourceDocumentId: z.string().trim().optional(),
  sourceName: z.string().trim().min(2, "اكتب اسم مصدر الاستيراد.").max(160, "اسم المصدر طويل."),
});

export type StationImportFormValues = z.infer<typeof stationImportFormSchema>;
