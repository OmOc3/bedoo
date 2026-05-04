"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth/better-auth";
import { requireRole } from "@/lib/auth/server-session";
import { db } from "@/lib/db/client";
import { user as usersTable } from "@/lib/db/schema";
import {
  getClientProfile,
  replaceClientStationAccess,
  updateClientOrderStatus,
  upsertClientProfile,
} from "@/lib/db/repositories";
import { writeAuditLog } from "@/lib/audit";
import { getActionMessages } from "@/lib/i18n/action-locale";
import {
  clientAddressLinesFromText,
  updateClientAccountPasswordSchema,
  updateClientAccountProfileSchema,
  updateClientOrderStatusSchema,
  updateClientProfileSchema,
  updateClientStationAccessSchema,
} from "@/lib/validation/client-orders";

export interface ClientOrderActionResult {
  error?: string;
  success?: boolean;
}

function formString(formData: FormData, key: string): string {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function optionalString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function updateClientAccountProfileAction(formData: FormData): Promise<ClientOrderActionResult> {
  const session = await requireRole(["client"]);
  const t = await getActionMessages();
  const parsed = updateClientAccountProfileSchema.safeParse({
    displayName: formString(formData, "displayName"),
    image: formData.get("image") || undefined,
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.actionErrors.clientOrders_accountValidation };
  }

  const profileUpdate: { image?: string | null; name: string } = {
    name: parsed.data.displayName,
  };

  if (parsed.data.image !== undefined) {
    profileUpdate.image = parsed.data.image.length > 0 ? parsed.data.image : null;
  }

  try {
    const currentProfile = await getClientProfile(session.uid);

    await db.update(usersTable).set(profileUpdate).where(eq(usersTable.id, session.uid));

    await upsertClientProfile({
      actorRole: session.role,
      actorUid: session.uid,
      addresses: currentProfile?.addresses ?? [],
      clientUid: session.uid,
      phone: parsed.data.phone || undefined,
    });

    await writeAuditLog({
      actorUid: session.uid,
      actorRole: session.role,
      action: "client_account.profile_update",
      entityType: "user",
      entityId: session.uid,
      metadata: {
        imageChanged: parsed.data.image !== undefined && parsed.data.image !== session.user.image,
        previousName: session.user.displayName,
        nextName: parsed.data.displayName,
      },
    });

    revalidatePath("/client/portal");
    revalidatePath("/dashboard/manager/client-orders");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : t.actionErrors.clientOrders_accountUpdateFailed };
  }
}

export async function updateClientAccountPasswordAction(formData: FormData): Promise<ClientOrderActionResult> {
  const session = await requireRole(["client"]);
  const t = await getActionMessages();
  const parsed = updateClientAccountPasswordSchema.safeParse({
    confirmPassword: formString(formData, "confirmPassword"),
    currentPassword: formString(formData, "currentPassword"),
    newPassword: formString(formData, "newPassword"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.actionErrors.clientOrders_passwordValidation };
  }

  try {
    await auth.api.changePassword({
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: false,
      },
      headers: await headers(),
    });

    await db.update(usersTable).set({ passwordChangedAt: new Date() }).where(eq(usersTable.id, session.uid));

    await writeAuditLog({
      actorUid: session.uid,
      actorRole: session.role,
      action: "client_account.password_change",
      entityType: "user",
      entityId: session.uid,
      metadata: { selfService: true },
    });

    revalidatePath("/client/portal");
    return { success: true };
  } catch (_error: unknown) {
    return { error: t.actionErrors.clientOrders_passwordUpdateFailed };
  }
}

export async function createClientOrderAction(formData: FormData): Promise<ClientOrderActionResult> {
  await requireRole(["manager", "supervisor"]);
  void formData;
  const t = await getActionMessages();

  return {
    error: t.actionErrors.clientOrders_portalOrdersDisabled,
  };

}

export async function updateClientOrderStatusAction(formData: FormData): Promise<ClientOrderActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const t = await getActionMessages();
  const parsed = updateClientOrderStatusSchema.safeParse({
    decisionNote: optionalString(formData, "decisionNote"),
    orderId: formData.get("orderId"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    return { error: t.actionErrors.clientOrders_invalidOrder };
  }

  try {
    const clientUid = await updateClientOrderStatus(
      parsed.data.orderId,
      parsed.data.status,
      session.uid,
      session.role,
      parsed.data.decisionNote,
    );
    revalidatePath("/dashboard/manager/client-orders");
    revalidatePath(`/dashboard/manager/client-orders/${clientUid}`);
    revalidatePath("/dashboard/supervisor/client-orders");
    revalidatePath("/client/portal");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : t.actionErrors.clientOrders_statusUpdateFailed };
  }
}

/** For `<form action={...}>` bindings that expect `Promise<void>` (see client-order-review-actions). */
export async function runClientOrderStatusFormAction(formData: FormData): Promise<void> {
  await updateClientOrderStatusAction(formData);
}

export async function updateClientProfileAction(formData: FormData): Promise<ClientOrderActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const t = await getActionMessages();
  const parsed = updateClientProfileSchema.safeParse({
    addressesText: formData.get("addressesText"),
    clientUid: formData.get("clientUid"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.actionErrors.clientOrders_clientValidation };
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
    return { error: error instanceof Error ? error.message : t.actionErrors.clientOrders_clientUpdateFailed };
  }
}

export async function updateClientStationAccessAction(formData: FormData): Promise<ClientOrderActionResult> {
  const session = await requireRole(["manager", "supervisor"]);
  const t = await getActionMessages();
  const parsed = updateClientStationAccessSchema.safeParse({
    clientUid: formData.get("clientUid"),
    stationIds: formData.getAll("stationIds").filter((value): value is string => typeof value === "string"),
  });

  if (!parsed.success) {
    return { error: t.actionErrors.clientOrders_stationsSelectionInvalid };
  }

  try {
    await replaceClientStationAccess({
      actorRole: session.role,
      actorUid: session.uid,
      clientUid: parsed.data.clientUid,
      stationIds: parsed.data.stationIds,
    });

    revalidatePath("/dashboard/manager/client-orders");
    revalidatePath(`/dashboard/manager/client-orders/${parsed.data.clientUid}`);
    revalidatePath("/client/portal");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : t.actionErrors.clientOrders_stationsUpdateFailed };
  }
}
