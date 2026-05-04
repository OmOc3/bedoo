"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/server-session";
import { startShift, endShift, updateShiftPayroll, updateShiftSalaryStatus } from "@/lib/db/repositories";
import { getActionMessages } from "@/lib/i18n/action-locale";
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

function parseLatLng(
  formData: FormData,
  invalidMessage: string,
): { error: string } | { accuracyMeters?: number; lat: number; lng: number } {
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { error: invalidMessage };
  }
  return {
    lat,
    lng,
    accuracyMeters: optionalNumber(formData, "accuracyMeters"),
  };
}

export async function startShiftAction(formData: FormData): Promise<ShiftActionResult> {
  const session = await requireRole(["technician", "manager"]);
  const t = await getActionMessages();
  const coords = parseLatLng(formData, t.actionErrors.shifts_invalidLocationData);
  if ("error" in coords) {
    return { error: coords.error };
  }

  try {
    await startShift({
      actorRole: session.role,
      location: coords,
      stationId: "",
      technicianUid: session.uid,
      technicianName: session.user.displayName,
    });
    revalidatePath("/scan");
    return { success: true, earlyExit: false, minutesWorked: 0, earlyExitMinutes: 0 };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : t.actionErrors.shifts_startFailed };
  }
}

export async function endShiftAction(formData: FormData): Promise<ShiftActionResult> {
  const session = await requireRole(["technician", "manager"]);
  const t = await getActionMessages();
  const coords = parseLatLng(formData, t.actionErrors.shifts_invalidLocationData);
  if ("error" in coords) {
    return { error: coords.error };
  }

  try {
    const result = await endShift({
      actorRole: session.role,
      location: coords,
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
    return { error: error instanceof Error ? error.message : t.actionErrors.shifts_checkoutFailed };
  }
}

export async function updateSalaryStatusAction(
  shiftId: string,
  salaryStatus: ShiftSalaryStatus,
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireRole(["manager"]);
  const t = await getActionMessages();

  try {
    await updateShiftSalaryStatus(shiftId, salaryStatus, session.uid, session.role);
    revalidatePath("/dashboard/manager/shifts");
    revalidatePath("/dashboard/manager/payroll");
    revalidatePath("/dashboard/supervisor/shifts");
    return { success: true };
  } catch (error: unknown) {
    return { error: error instanceof Error ? error.message : t.actionErrors.shifts_salaryStatusFailed };
  }
}

export async function updateShiftPayrollAction(input: unknown): Promise<PayrollActionResult> {
  const session = await requireRole(["manager"]);
  const t = await getActionMessages();
  const parsed = updateShiftPayrollSchema.safeParse(input);

  if (!parsed.success) {
    return {
      error: t.actionErrors.shifts_salaryValidationFailed,
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
    return { error: error instanceof Error ? error.message : t.actionErrors.shifts_salaryUpdateFailed };
  }
}
