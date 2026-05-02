"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server-session";
import {
  startShift,
  endShift,
  updateShiftSalaryStatus,
} from "@/lib/db/repositories";
import type { ShiftSalaryStatus } from "@/types";

export interface ShiftActionResult {
  error?: string;
  success?: boolean;
  earlyExit?: boolean;
  minutesWorked?: number;
  earlyExitMinutes?: number;
}

function requiredNumber(formData: FormData, key: string): number {
  const value = Number(formData.get(key));
  if (!Number.isFinite(value)) throw new Error("بيانات الموقع غير صالحة.");
  return value;
}

function optionalNumber(formData: FormData, key: string): number | undefined {
  const raw = formData.get(key);
  if (!raw || typeof raw !== "string") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function optionalString(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export async function startShiftAction(formData: FormData): Promise<ShiftActionResult> {
  const session = await requireRole(["technician", "manager"]);

  try {
    await startShift({
      actorRole: session.role,
      location: {
        lat: requiredNumber(formData, "lat"),
        lng: requiredNumber(formData, "lng"),
        accuracyMeters: optionalNumber(formData, "accuracyMeters"),
      },
      stationId: "", // Not used directly – geo match finds the nearest
      technicianUid: session.uid,
      technicianName: session.user.displayName,
    });
    revalidatePath("/scan");
    return { success: true, earlyExit: false, minutesWorked: 0, earlyExitMinutes: 0 };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر بدء الشيفت." };
  }
}

export async function endShiftAction(formData: FormData): Promise<ShiftActionResult> {
  const session = await requireRole(["technician", "manager"]);

  try {
    const result = await endShift({
      actorRole: session.role,
      location: {
        lat: requiredNumber(formData, "lat"),
        lng: requiredNumber(formData, "lng"),
        accuracyMeters: optionalNumber(formData, "accuracyMeters"),
      },
      stationId: "",
      technicianUid: session.uid,
      notes: optionalString(formData, "notes"),
    });
    revalidatePath("/scan");
    return {
      success: true,
      earlyExit: result.earlyExit,
      minutesWorked: result.minutesWorked,
      earlyExitMinutes: result.earlyExitMinutes,
    };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر تسجيل الانصراف." };
  }
}

export async function updateSalaryStatusAction(
  shiftId: string,
  salaryStatus: ShiftSalaryStatus,
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireRole(["manager", "supervisor"]);

  try {
    await updateShiftSalaryStatus(shiftId, salaryStatus, session.uid, session.role);
    revalidatePath("/dashboard/manager/shifts");
    revalidatePath("/dashboard/supervisor/shifts");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر تحديث حالة الراتب." };
  }
}
