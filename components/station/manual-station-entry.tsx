"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const manualStationSchema = z.object({
  stationId: z.string().trim().min(1, "أدخل رقم المحطة."),
});

type ManualStationValues = z.infer<typeof manualStationSchema>;

export function ManualStationEntry() {
  const router = useRouter();
  const form = useForm<ManualStationValues>({
    resolver: zodResolver(manualStationSchema),
    defaultValues: {
      stationId: "",
    },
  });

  function onSubmit(values: ManualStationValues): void {
    router.push(`/station/${encodeURIComponent(values.stationId.trim())}/report`);
  }

  return (
    <form className="space-y-3" dir="rtl" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-2">
        <label className="block text-base font-bold text-[var(--foreground)]" htmlFor="stationId">
          إدخال يدوي
        </label>
        <input
          autoComplete="off"
          className="min-h-[44px] w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted)] transition-colors hover:border-[color-mix(in_srgb,var(--border)_50%,var(--foreground)_50%)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          id="stationId"
          placeholder="رقم المحطة"
          {...form.register("stationId")}
        />
        {form.formState.errors.stationId?.message ? (
          <p className="text-sm font-medium text-[var(--danger)]">{form.formState.errors.stationId.message}</p>
        ) : null}
      </div>
      <Button className="w-full py-3 text-base" type="submit">
        انتقل إلى المحطة
      </Button>
    </form>
  );
}
