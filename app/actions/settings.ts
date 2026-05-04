"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/server-session";
import { updateAppSettings } from "@/lib/db/repositories";
import { getActionMessages } from "@/lib/i18n/action-locale";
import { updateAppSettingsSchema } from "@/lib/validation/settings";

function booleanFromFormData(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function numberFromFormData(formData: FormData, key: string): number {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? Number(value) : 0;
}

function stringFromFormData(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

export async function updateAppSettingsAction(formData: FormData): Promise<void> {
  const session = await requireRole(["manager"]);
  const t = await getActionMessages();

  const parsed = updateAppSettingsSchema.safeParse({
    maintenanceEnabled: booleanFromFormData(formData, "maintenanceEnabled"),
    maintenanceMessage: stringFromFormData(formData, "maintenanceMessage"),
    clientDailyStationOrderLimit: numberFromFormData(formData, "clientDailyStationOrderLimit"),
    supportEmail: stringFromFormData(formData, "supportEmail"),
    supportHours: stringFromFormData(formData, "supportHours"),
    supportPhone: stringFromFormData(formData, "supportPhone"),
  });

  if (!parsed.success) {
    redirect(
      `/dashboard/manager/settings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? t.actionErrors.settings_validationFailed)}`,
    );
  }

  try {
    await updateAppSettings({
      actorUid: session.uid,
      actorRole: session.role,
      maintenanceEnabled: parsed.data.maintenanceEnabled,
      maintenanceMessage: parsed.data.maintenanceMessage,
      clientDailyStationOrderLimit: parsed.data.clientDailyStationOrderLimit,
      supportEmail: parsed.data.supportEmail,
      supportHours: parsed.data.supportHours,
      supportPhone: parsed.data.supportPhone,
    });
  } catch (error: unknown) {
    redirect(
      `/dashboard/manager/settings?error=${encodeURIComponent(error instanceof Error ? error.message : t.actionErrors.settings_saveFailed)}`,
    );
  }

  revalidatePath("/dashboard/manager/settings");
  revalidatePath("/dashboard/manager");
  revalidatePath("/client/portal");
  revalidatePath("/client/signup");
  revalidatePath("/scan");
  redirect("/dashboard/manager/settings?success=1");
}

