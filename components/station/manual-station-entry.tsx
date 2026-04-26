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
        <label className="block text-base font-bold text-slate-900" htmlFor="stationId">
          إدخال يدوي
        </label>
        <input
          autoComplete="off"
          className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-base text-slate-900 placeholder-slate-400 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
          id="stationId"
          placeholder="رقم المحطة"
          {...form.register("stationId")}
        />
        {form.formState.errors.stationId?.message ? (
          <p className="text-sm font-medium text-red-600">{form.formState.errors.stationId.message}</p>
        ) : null}
      </div>
      <Button className="w-full py-3 text-base" type="submit">
        انتقل إلى المحطة
      </Button>
    </form>
  );
}
