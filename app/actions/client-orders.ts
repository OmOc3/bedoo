"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server-session";
import { createClientOrder, replaceClientStationAccess, updateClientOrderStatus, upsertClientProfile } from "@/lib/db/repositories";
import { writeAuditLog } from "@/lib/audit";
import {
  clientAddressLinesFromText,
  createClientOrderSchema,
  updateClientOrderStatusSchema,
  updateClientProfileSchema,
  updateClientStationAccessSchema,
} from "@/lib/validation/client-orders";

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

export async function createClientOrderAction(formData: FormData): Promise<ClientOrderActionResult> {
  const session = await requireRole(["client"]);
  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");
  const lat = latRaw ? parseFloat(String(latRaw)) : undefined;
  const lng = lngRaw ? parseFloat(String(lngRaw)) : undefined;

  const parsed = createClientOrderSchema.safeParse({
    stationDescription: optionalString(formData, "stationDescription"),
    stationLabel: formData.get("stationLabel"),
    stationLocation: formData.get("stationLocation"),
    note: optionalString(formData, "note"),
    lat: lat !== undefined && !Number.isNaN(lat) ? lat : undefined,
    lng: lng !== undefined && !Number.isNaN(lng) ? lng : undefined,
  });

  if (!parsed.success) {
    return { error: "تحقق من بيانات الطلب." };
  }

  // Handle photo upload
  let photoUrl: string | undefined;
  const photoFile = formData.get("photo");

  if (photoFile instanceof File && photoFile.size > 0) {
    try {
      const uploadForm = new FormData();
      uploadForm.set("image", photoFile);
      const uploadRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/api/upload-profile-image`, {
        method: "POST",
        body: uploadForm,
      });
      if (uploadRes.ok) {
        const { url } = (await uploadRes.json()) as { url?: string };
        if (typeof url === "string") {
          photoUrl = url;
        }
      }
    } catch {
      // Non-fatal: proceed without photo
    }
  }

  const coordinates =
    typeof parsed.data.lat === "number" && typeof parsed.data.lng === "number"
      ? { lat: parsed.data.lat, lng: parsed.data.lng }
      : undefined;

  try {
    await createClientOrder({
      actorRole: session.role,
      clientUid: session.uid,
      clientName: session.user.displayName,
      stationLabel: parsed.data.stationLabel,
      stationLocation: parsed.data.stationLocation,
      stationDescription: parsed.data.stationDescription,
      note: parsed.data.note,
      photoUrl,
      coordinates,
    });

    await writeAuditLog({
      actorUid: session.uid,
      actorRole: session.role,
      action: "client_order.submit",
      entityType: "client_order",
      entityId: session.uid,
      metadata: { stationLabel: parsed.data.stationLabel, hasCoordinates: Boolean(coordinates) },
    });

    revalidatePath("/client/portal");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر إرسال الطلب. حاول مرة أخرى." };
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
    const clientUid = await updateClientOrderStatus(parsed.data.orderId, parsed.data.status, session.uid, session.role);
    revalidatePath("/dashboard/manager/client-orders");
    revalidatePath(`/dashboard/manager/client-orders/${clientUid}`);
    revalidatePath("/dashboard/supervisor/client-orders");
    revalidatePath("/client/portal");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر تحديث حالة الطلب." };
  }
}

export async function updateClientProfileAction(formData: FormData): Promise<ClientOrderActionResult> {
  const session = await requireRole(["manager"]);
  const parsed = updateClientProfileSchema.safeParse({
    addressesText: formData.get("addressesText"),
    clientUid: formData.get("clientUid"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "تحقق من بيانات العميل." };
  }

  try {
    await upsertClientProfile({
      actorRole: session.role,
      actorUid: session.uid,
      addresses: clientAddressLinesFromText(parsed.data.addressesText),
      clientUid: parsed.data.clientUid,
      phone: parsed.data.phone || undefined,
    });

    revalidatePath("/dashboard/manager/client-orders");
    revalidatePath(`/dashboard/manager/client-orders/${parsed.data.clientUid}`);
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر تحديث بيانات العميل." };
  }
}

export async function updateClientStationAccessAction(formData: FormData): Promise<ClientOrderActionResult> {
  const session = await requireRole(["manager"]);
  const parsed = updateClientStationAccessSchema.safeParse({
    clientUid: formData.get("clientUid"),
    stationIds: formData.getAll("stationIds").filter((value): value is string => typeof value === "string"),
  });

  if (!parsed.success) {
    return { error: "تحقق من محطات العميل المحددة." };
  }

  try {
    await replaceClientStationAccess({
      actorUid: session.uid,
      clientUid: parsed.data.clientUid,
      stationIds: parsed.data.stationIds,
    });

    revalidatePath("/dashboard/manager/client-orders");
    revalidatePath(`/dashboard/manager/client-orders/${parsed.data.clientUid}`);
    revalidatePath("/client/portal");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر تحديث محطات العميل." };
  }
}
