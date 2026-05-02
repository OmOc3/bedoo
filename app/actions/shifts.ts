"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server-session";
import {
  startShift,
  endShift,
  updateShiftPayroll,
  updateShiftSalaryStatus,
} from "@/lib/db/repositories";
import { updateShiftPayrollSchema, type UpdateShiftPayrollValues } from "@/lib/validation/shifts";
import type { ShiftSalaryStatus } from "@/types";

export interface ShiftActionResult {
  error?: string;
  success?: boolean;
  shiftId?: string;
  earlyExit?: boolean;
  minutesWorked?: number;
  earlyExitMinutes?: number;
}

export interface PayrollActionResult {
  error?: string;
  fieldErrors?: Partial<Record<keyof UpdateShiftPayrollValues, string[] | undefined>>;
  success?: boolean;
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
      shiftId: result.shift.shiftId,
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
  const session = await requireRole(["manager"]);

  try {
    await updateShiftSalaryStatus(shiftId, salaryStatus, session.uid, session.role);
    revalidatePath("/dashboard/manager/shifts");
    revalidatePath("/dashboard/manager/payroll");
    revalidatePath("/dashboard/supervisor/shifts");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر تحديث حالة الراتب." };
  }
}

export async function updateShiftPayrollAction(input: unknown): Promise<PayrollActionResult> {
  const session = await requireRole(["manager"]);
  const parsed = updateShiftPayrollSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: "تحقق من بيانات الراتب وحاول مرة أخرى.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    await updateShiftPayroll({
      actorRole: session.role,
      actorUid: session.uid,
      notes: parsed.data.notes,
      salaryAmount: parsed.data.salaryAmount,
      salaryStatus: parsed.data.salaryStatus,
      shiftId: parsed.data.shiftId,
    });
    revalidatePath("/dashboard/manager/payroll");
    revalidatePath("/dashboard/manager/shifts");
    revalidatePath("/dashboard/supervisor/shifts");
    revalidatePath("/scan");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : "تعذر تحديث الراتب." };
  }
}
