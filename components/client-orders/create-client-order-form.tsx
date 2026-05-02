"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import dynamic from "next/dynamic";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createClientOrderAction } from "@/app/actions/client-orders";
import { Button } from "@/components/ui/button";
import { createClientOrderSchema, type CreateClientOrderValues } from "@/lib/validation/client-orders";
import type { Coordinates } from "@/types";

const StationMap = dynamic(
  () => import("@/components/maps/station-map").then((m) => m.StationMap),
  { ssr: false, loading: () => <div className="h-64 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] animate-pulse" /> },
);

function toFormData(values: CreateClientOrderValues, photoFile: File | null, coordinates: Coordinates | null): FormData {
  const formData = new FormData();
  formData.set("stationLabel", values.stationLabel);
  formData.set("stationLocation", values.stationLocation);
  if (values.stationDescription) {
    formData.set("stationDescription", values.stationDescription);
  }
  if (values.note) {
    formData.set("note", values.note);
  }
  if (photoFile) {
    formData.set("photo", photoFile);
  }
  if (coordinates) {
    formData.set("lat", String(coordinates.lat));
    formData.set("lng", String(coordinates.lng));
  }
  return formData;
}

export function CreateClientOrderForm() {
  const [resultMessage, setResultMessage] = useState<{ text: string; success: boolean } | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [showMap, setShowMap] = useState(false);

  const form = useForm<CreateClientOrderValues>({
    resolver: zodResolver(createClientOrderSchema),
    defaultValues: {
      stationLabel: "",
      stationLocation: "",
      stationDescription: "",
      note: "",
    },
  });

  async function onSubmit(values: CreateClientOrderValues): Promise<void> {
    setResultMessage(null);
    const result = await createClientOrderAction(toFormData(values, photoFile, coordinates));
    setResultMessage({
      text: result.error ?? "تم إرسال طلب الفحص بنجاح. سيقوم الفريق بمراجعة الطلب.",
      success: Boolean(result.success),
    });
    if (result.success) {
      form.reset({ stationLabel: "", stationLocation: "", stationDescription: "", note: "" });
      setPhotoFile(null);
      setCoordinates(null);
      setShowMap(false);
    }
  }

  return (
    <form
      className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card"
      dir="rtl"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div>
        <p className="text-sm font-semibold text-[var(--primary)]">طلب جديد</p>
        <h2 className="mt-1 text-lg font-bold text-[var(--foreground)]">طلب فحص محطة</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          أرسل بيانات المحطة وسيقوم الفريق بمراجعة الطلب وربطه بحسابك.
        </p>
      </div>

      <div className="group space-y-2">
        <label className="block text-sm font-semibold text-[var(--muted)] transition-colors duration-200 group-hover:text-[var(--foreground)]" htmlFor="stationLabel">
          اسم المحطة
        </label>
        <input
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] transition-all duration-200 hover:border-[var(--primary)]/50 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          id="stationLabel"
          placeholder="مثال: محطة مخزن 3"
          {...form.register("stationLabel")}
        />
        {form.formState.errors.stationLabel && (
          <p className="text-xs text-[var(--danger)]">{form.formState.errors.stationLabel.message}</p>
        )}
      </div>

      <div className="group space-y-2">
        <label className="block text-sm font-semibold text-[var(--muted)] transition-colors duration-200 group-hover:text-[var(--foreground)]" htmlFor="stationLocation">
          عنوان المحطة
        </label>
        <input
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] transition-all duration-200 hover:border-[var(--primary)]/50 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          id="stationLocation"
          placeholder="مثال: القاهرة - التجمع - مبنى A"
          {...form.register("stationLocation")}
        />
        {form.formState.errors.stationLocation && (
          <p className="text-xs text-[var(--danger)]">{form.formState.errors.stationLocation.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-[var(--foreground)]">
            تحديد الموقع على الخريطة
            <span className="ms-1.5 text-xs font-normal text-[var(--muted)]">(اختياري)</span>
          </label>
          <button
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            onClick={() => setShowMap((v) => !v)}
            type="button"
          >
            <svg aria-hidden="true" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3z" />
              <path d="M9 3v15" />
              <path d="M15 6v15" />
            </svg>
            {showMap ? "إخفاء الخريطة" : "فتح الخريطة"}
          </button>
        </div>

        {showMap && (
          <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)]">
            <div className="border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5">
              <p className="text-xs text-[var(--muted)]">
                انقر على الخريطة لتحديد موقع المحطة بدقة. هذا يساعد الفريق على الوصول إليها بسهولة.
              </p>
            </div>
            <div className="p-3">
              <StationMap
                onSelect={(coords) => setCoordinates(coords)}
                selected={coordinates ?? undefined}
                zoom={13}
              />
            </div>
            {coordinates ? (
              <div className="flex items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[var(--primary)]" aria-hidden="true" />
                  <p className="text-xs font-semibold text-[var(--foreground)]">
                    تم تحديد الموقع
                    <span className="ms-2 font-normal text-[var(--muted)]" dir="ltr">
                      {coordinates.lat.toFixed(5)}, {coordinates.lng.toFixed(5)}
                    </span>
                  </p>
                </div>
                <button
                  className="text-xs font-semibold text-[var(--danger)] hover:underline focus-visible:outline-none"
                  onClick={() => setCoordinates(null)}
                  type="button"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <div className="border-t border-[var(--border)] px-4 py-2.5">
                <p className="text-xs text-[var(--muted)]">لم يتم تحديد موقع بعد، انقر على الخريطة لتثبيت نقطة.</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="group space-y-2">
        <label className="block text-sm font-semibold text-[var(--muted)] transition-colors duration-200 group-hover:text-[var(--foreground)]" htmlFor="stationDescription">
          بيانات المحطة
        </label>
        <textarea
          className="min-h-24 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] transition-all duration-200 hover:border-[var(--primary)]/50 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          id="stationDescription"
          maxLength={500}
          placeholder="وصف إضافي عن المحطة أو المكان"
          {...form.register("stationDescription")}
        />
      </div>

      <div className="group space-y-2">
        <label className="block text-sm font-semibold text-[var(--muted)] transition-colors duration-200 group-hover:text-[var(--foreground)]" htmlFor="note">
          ملاحظات الطلب
        </label>
        <textarea
          className="min-h-20 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] transition-all duration-200 hover:border-[var(--primary)]/50 focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          id="note"
          maxLength={600}
          placeholder="أي ملاحظات إضافية للفريق"
          {...form.register("note")}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-[var(--foreground)]" htmlFor="photo">
          صورة للمحطة
          <span className="ms-1.5 text-xs font-normal text-[var(--muted)]">(اختياري)</span>
        </label>
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-4 transition-colors hover:border-[var(--primary)]/50">
          <input
            accept="image/*"
            className="block w-full text-sm text-[var(--muted)] file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:font-semibold file:text-teal-700 dark:file:bg-teal-900/30 dark:file:text-teal-300"
            id="photo"
            onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
            type="file"
          />
          {photoFile && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--primary)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--primary)]" aria-hidden="true" />
              {photoFile.name}
            </p>
          )}
        </div>
      </div>

      <Button className="w-full" disabled={form.formState.isSubmitting} isLoading={form.formState.isSubmitting} type="submit">
        إرسال الطلب للفريق
      </Button>

      {resultMessage ? (
        <p
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${
            resultMessage.success
              ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300"
              : "border-[var(--danger-muted)] bg-[var(--danger-soft)] text-[var(--danger)]"
          }`}
        >
          {resultMessage.text}
        </p>
      ) : null}
    </form>
  );
}
