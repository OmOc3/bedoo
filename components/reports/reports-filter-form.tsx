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
      className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card sm:grid-cols-2 sm:p-6 xl:grid-cols-5"
      dir="rtl"
      onSubmit={form.handleSubmit(onSubmit)}
    >
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor="stationId">
          رقم المحطة
        </label>
        <input
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] transition-colors placeholder:text-[var(--muted)] hover:border-[color-mix(in_srgb,var(--border)_50%,var(--foreground)_50%)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          id="stationId"
          {...form.register("stationId")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor="technicianUid">
          رقم الفني
        </label>
        <input
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] transition-colors placeholder:text-[var(--muted)] hover:border-[color-mix(in_srgb,var(--border)_50%,var(--foreground)_50%)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          id="technicianUid"
          {...form.register("technicianUid")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor="dateFrom">
          من تاريخ
        </label>
        <input
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] transition-colors hover:border-[color-mix(in_srgb,var(--border)_50%,var(--foreground)_50%)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          id="dateFrom"
          type="date"
          {...form.register("dateFrom")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor="dateTo">
          إلى تاريخ
        </label>
        <input
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] transition-colors hover:border-[color-mix(in_srgb,var(--border)_50%,var(--foreground)_50%)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          id="dateTo"
          type="date"
          {...form.register("dateTo")}
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-[var(--foreground)]" htmlFor="reviewStatus">
          المراجعة
        </label>
        <select
          className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--foreground)] transition-colors hover:border-[color-mix(in_srgb,var(--border)_50%,var(--foreground)_50%)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          id="reviewStatus"
          {...form.register("reviewStatus")}
        >
          <option value="">الكل</option>
          <option value="pending">بانتظار المراجعة</option>
          <option value="reviewed">تمت المراجعة</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>
      <div className="flex flex-col gap-3 pt-1 sm:col-span-2 sm:flex-row xl:col-span-5">
        <Button className="sm:w-auto" type="submit">
          تطبيق الفلاتر
        </Button>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--surface-subtle)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          href={basePath}
        >
          مسح الفلاتر
        </Link>
      </div>
    </form>
  );
}
