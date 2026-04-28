"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server-session";
import { uploadReportImageToCloudinary } from "@/lib/cloudinary/report-images";
import { createClientOrder, updateClientOrderStatus } from "@/lib/db/repositories";
import { createClientOrderSchema, updateClientOrderStatusSchema } from "@/lib/validation/client-orders";

export interface ClientOrderActionResult {
  error?: string;
  success?: boolean;
}

function optionalString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getImageFile(formData: FormData, key: string): File | undefined {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : undefined;
}

export async function createClientOrderAction(formData: FormData): Promise<ClientOrderActionResult> {
  const session = await requireRole(["client"]);
  const parsed = createClientOrderSchema.safeParse({
    stationId: formData.get("stationId"),
    note: optionalString(formData, "note"),
  });

  if (!parsed.success) {
    return { error: "تحقق من بيانات الطلب." };
  }

  try {
    const photoFile = getImageFile(formData, "photo");
    const photoUrl = photoFile
      ? await uploadReportImageToCloudinary(photoFile, parsed.data.stationId, `client-order-${crypto.randomUUID()}`)
      : undefined;
    await createClientOrder({
      actorRole: session.role,
      clientUid: session.uid,
      clientName: session.user.displayName,
      stationId: parsed.data.stationId,
      note: parsed.data.note,
      photoUrl,
    });

    revalidatePath("/client/portal");
    revalidatePath("/dashboard/manager/client-orders");
    revalidatePath("/dashboard/supervisor/client-orders");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر إنشاء الطلب." };
  }
}

export async function updateClientOrderStatusAction(formData: FormData): Promise<ClientOrderActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const parsed = updateClientOrderStatusSchema.safeParse({
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: "بيانات الطلب غير صحيحة." };
  }

  try {
    await updateClientOrderStatus(parsed.data.orderId, parsed.data.status, session.uid, session.role);
    revalidatePath("/dashboard/manager/client-orders");
    revalidatePath("/dashboard/supervisor/client-orders");
    revalidatePath("/client/portal");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر تحديث حالة الطلب." };
  }
}
