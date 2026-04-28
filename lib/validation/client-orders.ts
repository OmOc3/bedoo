import { z } from "zod";

export const createClientOrderSchema = z.object({
  stationId: z.string().trim().min(1),
  note: z.string().trim().max(600).optional(),
});

export const updateClientOrderStatusSchema = z.object({
  orderId: z.string().trim().min(1),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
});

export type CreateClientOrderValues = z.infer<typeof createClientOrderSchema>;
export type UpdateClientOrderStatusValues = z.infer<typeof updateClientOrderStatusSchema>;
