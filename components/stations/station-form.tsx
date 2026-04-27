"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createStationAction, updateStationAction, type StationActionResult } from "@/app/actions/stations";
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
  const form = useForm<StationFormValues>({
    resolver: zodResolver(stationFormSchema),
    defaultValues: {
      label: station?.label ?? "",
      location: station?.location ?? "",
      description: station?.description ?? "",
      zone: station?.zone ?? "",
      lat: station?.coordinates ? String(station.coordinates.lat) : "",
      lng: station?.coordinates ? String(station.coordinates.lng) : "",
    },
  });

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

  return (
    <form className="space-y-4" dir="rtl" onSubmit={form.handleSubmit(onSubmit)}>
      {actionResult?.error ? (
        <p className="rounded-lg bg-red-100 px-4 py-3 text-sm font-medium text-red-700">{actionResult.error}</p>
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
          className="min-h-28 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm text-[var(--foreground)] shadow-control transition placeholder:text-slate-400 focus:border-[var(--focus)]"
          id="description"
          placeholder="مثال: بجوار مدخل المخزن، تحتاج متابعة أسبوعية."
          {...form.register("description")}
        />
        {form.formState.errors.description?.message ?? getFieldError(actionResult, "description") ? (
          <p className="text-sm font-medium text-[var(--danger)]" role="alert">
            {form.formState.errors.description?.message ?? getFieldError(actionResult, "description")}
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

      {station?.photoUrls?.length ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-[var(--foreground)]">صور المحطة الحالية</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {station.photoUrls.map((photoUrl) => (
              <Image
                alt={`صورة المحطة ${station.label}`}
                className="h-28 w-full rounded-lg border border-slate-200 object-cover"
                height={112}
                key={photoUrl}
                src={photoUrl}
                unoptimized
                width={220}
              />
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
