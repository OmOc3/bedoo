"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";

const reportsFilterSchema = z.object({
  stationId: z.string().trim().optional(),
  technicianUid: z.string().trim().optional(),
  dateFrom: z.string().trim().optional(),
  dateTo: z.string().trim().optional(),
  reviewStatus: z.enum(["", "pending", "reviewed", "rejected"]).optional(),
});

export type ReportsFilterValues = z.infer<typeof reportsFilterSchema>;

interface ReportsFilterFormProps {
  basePath?: string;
  defaultValues: ReportsFilterValues;
}

export function ReportsFilterForm({ basePath = "/dashboard/supervisor/reports", defaultValues }: ReportsFilterFormProps) {
  const router = useRouter();
  const form = useForm<ReportsFilterValues>({
    resolver: zodResolver(reportsFilterSchema),
    defaultValues,
  });

  function onSubmit(values: ReportsFilterValues): void {
    const params = new URLSearchParams();

    Object.entries(values).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    router.push(`${basePath}${params.size > 0 ? `?${params.toString()}` : ""}`);
  }

  return (
    <form
      className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-control md:grid-cols-5"
      dir="rtl"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700" htmlFor="stationId">
          رقم المحطة
        </label>
        <input
          className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          id="stationId"
          {...form.register("stationId")}
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700" htmlFor="technicianUid">
          رقم الفني
        </label>
        <input
          className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          id="technicianUid"
          {...form.register("technicianUid")}
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700" htmlFor="dateFrom">
          من تاريخ
        </label>
        <input
          className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          id="dateFrom"
          type="date"
          {...form.register("dateFrom")}
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700" htmlFor="dateTo">
          إلى تاريخ
        </label>
        <input
          className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          id="dateTo"
          type="date"
          {...form.register("dateTo")}
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-700" htmlFor="reviewStatus">
          المراجعة
        </label>
        <select
          className="min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 transition focus:border-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          id="reviewStatus"
          {...form.register("reviewStatus")}
        >
          <option value="">الكل</option>
          <option value="pending">بانتظار المراجعة</option>
          <option value="reviewed">تمت المراجعة</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>
      <div className="flex gap-2 md:col-span-5">
        <Button className="sm:w-auto" type="submit">
          تطبيق الفلاتر
        </Button>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          href={basePath}
        >
          مسح
        </Link>
      </div>
    </form>
  );
}
