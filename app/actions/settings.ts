"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/server-session";
import { updateAppSettings } from "@/lib/db/repositories";
import { updateAppSettingsSchema } from "@/lib/validation/settings";

function booleanFromFormData(formData: FormData, key: string): boolean {
  const value = formData.get(key);
  return value === "on" || value === "true" || value === "1";
}

function numberFromFormData(formData: FormData, key: string): number {
  const value = formData.get(key);
  return typeof value === "string" && value.trim().length > 0 ? Number(value) : 0;
}

export async function updateAppSettingsAction(formData: FormData): Promise<void> {
  const session = await requireRole(["manager"]);

  const parsed = updateAppSettingsSchema.safeParse({
    maintenanceEnabled: booleanFromFormData(formData, "maintenanceEnabled"),
    clientDailyStationOrderLimit: numberFromFormData(formData, "clientDailyStationOrderLimit"),
  });

  if (!parsed.success) {
    redirect(`/dashboard/manager/settings?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "تحقق من بيانات الإعدادات.")}`);
  }

  try {
    await updateAppSettings({
      actorUid: session.uid,
      actorRole: session.role,
      maintenanceEnabled: parsed.data.maintenanceEnabled,
      clientDailyStationOrderLimit: parsed.data.clientDailyStationOrderLimit,
    });
  } catch (error: unknown) {
    redirect(`/dashboard/manager/settings?error=${encodeURIComponent(error instanceof Error ? error.message : "تعذر حفظ الإعدادات.")}`);
  }

  revalidatePath("/dashboard/manager/settings");
  revalidatePath("/dashboard/manager");
  revalidatePath("/client/portal");
  revalidatePath("/scan");
  redirect("/dashboard/manager/settings?success=1");
}

