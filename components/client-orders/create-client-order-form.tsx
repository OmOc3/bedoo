"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { createClientOrderAction } from "@/app/actions/client-orders";
import { Button } from "@/components/ui/button";
import { createClientOrderSchema, type CreateClientOrderValues } from "@/lib/validation/client-orders";

interface StationOption {
  stationId: string;
  label: string;
}

interface CreateClientOrderFormProps {
  stations: StationOption[];
}

function toFormData(values: CreateClientOrderValues, photoFile: File | null): FormData {
  const formData = new FormData();
  formData.set("stationId", values.stationId);
  if (values.note) {
    formData.set("note", values.note);
  }
  if (photoFile) {
    formData.set("photo", photoFile);
  }
  return formData;
}

export function CreateClientOrderForm({ stations }: CreateClientOrderFormProps) {
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const form = useForm<CreateClientOrderValues>({
    resolver: zodResolver(createClientOrderSchema),
    defaultValues: {
      stationId: stations[0]?.stationId ?? "",
      note: "",
    },
  });

  async function onSubmit(values: CreateClientOrderValues): Promise<void> {
    setResultMessage(null);
    const result = await createClientOrderAction(toFormData(values, photoFile));
    setResultMessage(result.error ?? "تم إرسال طلب الفحص بنجاح.");
    if (result.success) {
      form.reset({ stationId: stations[0]?.stationId ?? "", note: "" });
      setPhotoFile(null);
    }
  }

  return (
    <form className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card" dir="rtl" onSubmit={form.handleSubmit(onSubmit)}>
      <h2 className="text-lg font-bold text-[var(--foreground)]">طلب فحص محطة</h2>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="stationId">
          اختر المحطة
        </label>
        <select
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
          id="stationId"
          {...form.register("stationId")}
        >
          {stations.map((station) => (
            <option key={station.stationId} value={station.stationId}>
              #{station.stationId} - {station.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="note">
          ملاحظات الطلب
        </label>
        <textarea
          className="min-h-24 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
          id="note"
          maxLength={600}
          {...form.register("note")}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="photo">
          صورة للمحطة (اختياري)
        </label>
        <input
          accept="image/*"
          className="block w-full text-sm text-[var(--muted)] file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:font-semibold file:text-teal-700"
          id="photo"
          onChange={(event) => setPhotoFile(event.target.files?.[0] ?? null)}
          type="file"
        />
      </div>
      <Button className="w-full" disabled={form.formState.isSubmitting} isLoading={form.formState.isSubmitting} type="submit">
        إرسال الطلب
      </Button>
      {resultMessage ? <p className="text-sm font-medium text-[var(--muted)]">{resultMessage}</p> : null}
    </form>
  );
}
