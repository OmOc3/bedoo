import type { Metadata } from "next";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth/server-session";
import { getAppSettings } from "@/lib/db/repositories";
import { updateAppSettingsAction } from "@/app/actions/settings";

export const metadata: Metadata = {
  title: "إعدادات النظام",
};

interface ManagerSettingsPageProps {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
}

export default async function ManagerSettingsPage({ searchParams }: ManagerSettingsPageProps) {
  await requireRole(["manager"]);
  const params = await searchParams;
  const settings = await getAppSettings();
  const error = typeof params.error === "string" ? params.error : "";
  const success = params.success === "1";

  return (
    <DashboardShell role="manager">
      <PageHeader
        action={
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface-subtle)]"
            href="/dashboard/manager"
          >
            لوحة المدير
          </Link>
        }
        backHref="/dashboard/manager"
        description="تحكم سريع في وضع الصيانة وحدود طلبات العملاء اليومية."
        title="إعدادات النظام"
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800">
          تم حفظ الإعدادات بنجاح.
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
          <h2 className="text-base font-bold text-[var(--foreground)]">وضع الصيانة</h2>
          <p className="mt-1 text-sm leading-7 text-[var(--muted)]">
            عند التفعيل: سيتم منع العميل والفني من دخول النظام، وسيظهر لهم تنبيه الصيانة حتى يتم الإلغاء.
          </p>

          <form
            action={async (formData) => {
              "use server";
              await updateAppSettingsAction(formData);
            }}
            className="mt-5 space-y-4"
          >
            <label className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
              <input
                className="mt-1 h-5 w-5 accent-[var(--primary)]"
                defaultChecked={settings.maintenanceEnabled}
                name="maintenanceEnabled"
                type="checkbox"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--foreground)]">تفعيل وضع الصيانة</span>
                <span className="mt-1 block text-xs leading-6 text-[var(--muted)]">
                  المدير والمشرف سيظلان قادرين على الوصول للوحة التحكم.
                </span>
              </span>
            </label>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
              <label className="block text-sm font-semibold text-[var(--foreground)]" htmlFor="clientDailyStationOrderLimit">
                الحد اليومي لطلبات المحطات لكل عميل
              </label>
              <p className="mt-1 text-xs leading-6 text-[var(--muted)]">
                ضع <span className="font-semibold">0</span> لعدم تحديد حد.
              </p>
              <input
                className="mt-3 min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-control focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                defaultValue={settings.clientDailyStationOrderLimit}
                id="clientDailyStationOrderLimit"
                inputMode="numeric"
                min={0}
                name="clientDailyStationOrderLimit"
                step={1}
                type="number"
              />
            </div>

            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-colors hover:bg-[var(--primary-hover)]"
              type="submit"
            >
              حفظ الإعدادات
            </button>
          </form>
        </article>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
          <h2 className="text-base font-bold text-[var(--foreground)]">ملاحظات تشغيلية</h2>
          <ul className="mt-3 list-disc space-y-2 ps-5 text-sm leading-7 text-[var(--muted)]">
            <li>وضع الصيانة يطبق على صفحات العميل والفني، وكذلك على API للموبايل.</li>
            <li>الحد اليومي يمنع العميل من إنشاء طلب جديد عند تجاوز العدد في نفس اليوم.</li>
            <li>الحذف النهائي للعميل/المحطة متاح من صفحات الإدارة وبشروط حماية لمنع فقد بيانات مرتبطة.</li>
          </ul>
        </article>
      </section>
    </DashboardShell>
  );
}

