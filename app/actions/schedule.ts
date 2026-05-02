"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server-session";
import { upsertWorkSchedule } from "@/lib/db/repositories";

export interface ScheduleActionResult {
  error?: string;
  success?: boolean;
}

export async function upsertWorkScheduleAction(formData: FormData): Promise<ScheduleActionResult> {
  const session = await requireRole(["manager"]);

  try {
    const technicianUid = String(formData.get("technicianUid") ?? "").trim();
    if (!technicianUid) throw new Error("معرف الفني مطلوب.");

    const workDaysRaw = formData.getAll("workDays").map(Number).filter((d) => d >= 0 && d <= 6);
    if (workDaysRaw.length === 0) throw new Error("يجب تحديد يوم عمل واحد على الأقل.");

    const shiftStartTime = String(formData.get("shiftStartTime") ?? "").trim();
    const shiftEndTime = String(formData.get("shiftEndTime") ?? "").trim();
    const expectedDurationMinutes = Number(formData.get("expectedDurationMinutes"));
    const hourlyRateRaw = formData.get("hourlyRate");
    const hourlyRate = hourlyRateRaw && String(hourlyRateRaw).trim() ? Number(hourlyRateRaw) : undefined;
    const notes = String(formData.get("notes") ?? "").trim() || undefined;

    if (!Number.isFinite(expectedDurationMinutes)) throw new Error("مدة الشيفت غير صالحة.");
    if (hourlyRate !== undefined && !Number.isFinite(hourlyRate)) throw new Error("سعر الساعة غير صالح.");

    await upsertWorkSchedule({
      actorRole: session.role,
      actorUid: session.uid,
      expectedDurationMinutes,
      hourlyRate,
      notes,
      shiftEndTime,
      shiftStartTime,
      technicianUid,
      workDays: workDaysRaw,
    });

    revalidatePath(`/dashboard/manager/team/${technicianUid}/schedule`);
    revalidatePath("/dashboard/manager/shifts");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر حفظ جدول العمل." };
  }
}
