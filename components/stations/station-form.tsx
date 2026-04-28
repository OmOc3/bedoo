"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createStationAction, deleteStationImageAction, updateStationAction, type DeleteStationImageResult, type StationActionResult } from "@/app/actions/stations";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { stationFormSchema, type StationFormValues } from "@/lib/validation/stations";
import type { Coordinates } from "@/types";

interface StationFormProps {
  mode: "create" | "edit";
  station?: {
    description?: string;
    photoUrls?: string[];
    stationId: string;
    label: string;
    location: string;
    requiresImmediateSupervision: boolean;
    zone?: string;
    coordinates?: Coordinates;
  };
}

function toFormData(values: StationFormValues): FormData {
  const formData = new FormData();

  formData.set("label", values.label);
  formData.set("location", values.location);

  if (values.description) {
    formData.set("description", values.description);
  }

  if (values.zone) {
    formData.set("zone", values.zone);
  }

  formData.set("requiresImmediateSupervision", values.requiresImmediateSupervision ? "true" : "false");

  if (values.lat) {
    formData.set("lat", values.lat);
  }

  if (values.lng) {
    formData.set("lng", values.lng);
  }

  return formData;
}

function getFieldError(
  actionResult: StationActionResult | null,
  fieldName: keyof StationFormValues | "coordinates",
): string | undefined {
  return actionResult?.fieldErrors?.[fieldName]?.[0];
}

export function StationForm({ mode, station }: StationFormProps) {
  const [actionResult, setActionResult] = useState<StationActionResult | null>(null);
  const [existingPhotoUrls, setExistingPhotoUrls] = useState<string[]>(station?.photoUrls ?? []);
  const [deletingPhotoUrl, setDeletingPhotoUrl] = useState<string | null>(null);
  const form = useForm<StationFormValues>({
    resolver: zodResolver(stationFormSchema),
    defaultValues: {
      label: station?.label ?? "",
      location: station?.location ?? "",
      description: station?.description ?? "",
      zone: station?.zone ?? "",
      requiresImmediateSupervision: station?.requiresImmediateSupervision ?? false,
      lat: station?.coordinates ? String(station.coordinates.lat) : "",
      lng: station?.coordinates ? String(station.coordinates.lng) : "",
    },
  });

  async function handleDeletePhoto(photoUrl: string): Promise<void> {
    if (!station?.stationId) return;

    setDeletingPhotoUrl(photoUrl);
    const result: DeleteStationImageResult = await deleteStationImageAction(station.stationId, photoUrl);

    if (result.success) {
      setExistingPhotoUrls((prev) => prev.filter((url) => url !== photoUrl));
    } else {
      setActionResult({ error: result.error ?? "تعذر حذف الصورة." });
    }

    setDeletingPhotoUrl(null);
  }

  async function onSubmit(values: StationFormValues): Promise<void> {
    setActionResult(null);
    const formData = toFormData(values);
    const photoInput = document.getElementById("photos");

    if (photoInput instanceof HTMLInputElement && photoInput.files) {
      Array.from(photoInput.files).forEach((file) => formData.append("photos", file));
    }

    const result =
      mode === "create"
        ? await createStationAction(formData)
        : await updateStationAction(station?.stationId ?? "", formData);

    setActionResult(result);
  }

  const descriptionError = form.formState.errors.description?.message ?? getFieldError(actionResult, "description");

  return (
    <form className="space-y-4" dir="rtl" onSubmit={form.handleSubmit(onSubmit)}>
      {actionResult?.error ? (
        <p className="rounded-lg bg-red-100 px-4 py-3 text-sm font-medium text-red-700" role="alert">
          {actionResult.error}
        </p>
      ) : null}

      {mode === "create" ? (
        <p className="rounded-lg bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          سيتم توليد رقم المحطة تلقائيا بعد الحفظ، وسيظهر في QR ولوحة الفني.
        </p>
      ) : null}

      <TextField
        autoComplete="off"
        error={form.formState.errors.label?.message ?? getFieldError(actionResult, "label")}
        id="label"
        label="اسم المحطة"
        placeholder="مثال: المنطقة أ - محطة 3"
        {...form.register("label")}
      />

      <TextField
        autoComplete="off"
        error={form.formState.errors.location?.message ?? getFieldError(actionResult, "location")}
        id="location"
        label="الموقع"
        placeholder="مثال: المخزن الرئيسي"
        {...form.register("location")}
      />

      <TextField
        autoComplete="off"
        error={form.formState.errors.zone?.message ?? getFieldError(actionResult, "zone")}
        id="zone"
        label="المنطقة"
        placeholder="اختياري"
        {...form.register("zone")}
      />

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-[var(--foreground)]" htmlFor="description">
          وصف المحطة
        </label>
        <textarea
          aria-describedby={descriptionError ? "description-error" : undefined}
          aria-invalid={Boolean(descriptionError)}
          className="min-h-28 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] shadow-control transition placeholder:text-slate-400 focus:border-[var(--focus)]"
          id="description"
          placeholder="مثال: بجوار مدخل المخزن، تحتاج متابعة أسبوعية."
          {...form.register("description")}
        />
        {descriptionError ? (
          <p className="text-sm font-medium text-[var(--danger)]" id="description-error" role="alert">
            {descriptionError}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          error={form.formState.errors.lat?.message ?? getFieldError(actionResult, "coordinates")}
          id="lat"
          inputMode="decimal"
          label="خط العرض"
          placeholder="اختياري"
          step="any"
          type="number"
          {...form.register("lat")}
        />
        <TextField
          error={form.formState.errors.lng?.message}
          id="lng"
          inputMode="decimal"
          label="خط الطول"
          placeholder="اختياري"
          step="any"
          type="number"
          {...form.register("lng")}
        />
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <input
          className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-500"
          type="checkbox"
          {...form.register("requiresImmediateSupervision")}
        />
        <span className="text-sm leading-6 text-slate-800">
          <span className="block font-semibold">إشراف فوري مطلوب</span>
          <span className="text-slate-600">عند التفعيل، تُصنف المحطة بأنها تحتاج إشرافًا فوريًا من الفريق.</span>
        </span>
      </label>

      {existingPhotoUrls.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--foreground)]">صور المحطة الحالية</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {existingPhotoUrls.map((photoUrl) => (
              <div className="group relative" key={photoUrl}>
                <Image
                  alt={`صورة المحطة ${station?.label ?? ""}`}
                  className="h-28 w-full rounded-lg border border-slate-200 object-cover"
                  height={112}
                  src={photoUrl}
                  unoptimized
                  width={220}
                />
                <button
                  aria-label="حذف صورة المحطة"
                  className="absolute start-2 top-2 rounded-full bg-red-600 p-1.5 text-white opacity-0 shadow-sm transition-opacity hover:bg-red-700 focus:opacity-100 group-hover:opacity-100 disabled:opacity-50"
                  disabled={deletingPhotoUrl === photoUrl}
                  onClick={() => handleDeletePhoto(photoUrl)}
                  type="button"
                >
                  {deletingPhotoUrl === photoUrl ? (
                    <span aria-hidden="true" className="block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-[var(--foreground)]" htmlFor="photos">
          صور المحطة
        </label>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] shadow-control file:me-4 file:rounded-lg file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-teal-700"
          id="photos"
          multiple
          name="photos"
          type="file"
        />
        <p className="text-xs leading-5 text-slate-500">يمكن رفع صور JPG أو PNG أو WebP.</p>
      </div>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row">
        <Button className="sm:w-auto" disabled={form.formState.isSubmitting} isLoading={form.formState.isSubmitting} type="submit">
          {mode === "create" ? "إضافة المحطة" : "حفظ التعديلات"}
        </Button>
      </div>
    </form>
  );
}
