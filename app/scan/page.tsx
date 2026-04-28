import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { RoleRedirectWatcher } from "@/components/auth/role-redirect-watcher";
import { CopyrightFooter } from "@/components/legal/copyright-footer";
import { BrandLockup } from "@/components/layout/brand";
import { ManualStationEntry } from "@/components/station/manual-station-entry";
import { WebQrScanner } from "@/components/station/web-qr-scanner";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getCurrentSession } from "@/lib/auth/server-session";
import { listReportsForTechnician, listStations } from "@/lib/db/repositories";
import { i18n } from "@/lib/i18n";
import { statusOptionLabels } from "@/lib/shared/constants";
import type { AppTimestamp, Report, Station } from "@/types";

export const metadata: Metadata = {
  title: i18n.scan.title,
};

function formatTimestamp(timestamp?: AppTimestamp): string {
  if (!timestamp) {
    return "لم تتم الزيارة";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp.toDate());
}

function supportHref(type: "email" | "phone", value: string): string {
  return type === "email" ? `mailto:${value}` : `tel:${value}`;
}

function SupportCard() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@example.com";
  const supportPhone = process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim();

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-control">
      <h2 className="text-lg font-bold text-slate-900">دعم الشركة</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        استخدم بيانات الدعم عند وجود مشكلة في QR أو تعذر تسجيل فحص ميداني.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <a
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
          href={supportHref("email", supportEmail)}
        >
          مراسلة الدعم
        </a>
        {supportPhone ? (
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            href={supportHref("phone", supportPhone)}
            dir="ltr"
          >
            {supportPhone}
          </a>
        ) : null}
      </div>
    </section>
  );
}

function StationCard({ station }: { station: Station }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-control">
      {station.photoUrls?.[0] ? (
        <Image
          alt={`صورة المحطة ${station.label}`}
          className="mb-4 h-36 w-full rounded-xl border border-slate-200 object-cover"
          height={144}
          src={station.photoUrls[0]}
          unoptimized
          width={320}
        />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-teal-700" dir="ltr">
            #{station.stationId}
          </p>
          <h3 className="truncate text-base font-bold text-slate-950">{station.label}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">{station.location}</p>
        </div>
        <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
          نشطة
        </span>
      </div>
      {station.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{station.description}</p> : null}
      <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <span>آخر زيارة</span>
        <span className="font-semibold">{formatTimestamp(station.lastVisitedAt)}</span>
      </div>
      {station.lastVisitedBy ? (
        <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <span>تمت الزيارة بواسطة</span>
          <span className="font-semibold text-teal-700">{station.lastVisitedBy}</span>
        </div>
      ) : null}
      <Link
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-teal-600"
        href={`/station/${station.stationId}/report`}
      >
        فتح نموذج الفحص
      </Link>
    </article>
  );
}

function RecentReport({ report }: { report: Report }) {
  return (
    <li className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-control">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{report.stationLabel}</p>
          <p className="mt-1 text-xs text-slate-500">{formatTimestamp(report.submittedAt)}</p>
        </div>
        <span className="rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-semibold text-yellow-800">
          {report.reviewStatus === "pending" ? "بانتظار المراجعة" : report.reviewStatus}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {report.status.map((status) => statusOptionLabels[status]).join("، ")}
      </p>
    </li>
  );
}

export default async function ScanInstructionsPage() {
  const session = await getCurrentSession();
  const [stations, recentReports] = await Promise.all([
    session ? listStations() : Promise.resolve([]),
    session?.role === "technician" ? listReportsForTechnician(session.uid, 6) : Promise.resolve([]),
  ]);
  const activeStations = stations.filter((station) => station.isActive).slice(0, 6);

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right sm:px-6" dir="rtl">
      {session ? <RoleRedirectWatcher currentRole={session.role} /> : null}
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-control sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <BrandLockup />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {session ? <LogoutButton buttonClassName="min-h-10 px-3 py-2 text-sm" /> : null}
            </div>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="text-sm font-semibold text-teal-700">لوحة الفني</p>
              <h1 className="mt-2 text-3xl font-extrabold text-slate-950">{i18n.scan.title}</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                وجّه كاميرا الهاتف إلى رمز QR المثبت على محطة الطعوم، أو افتح محطة من القائمة لتسجيل الفحص بسرعة.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <WebQrScanner />
              <div className="my-4 h-px w-full bg-slate-200" />
              <p className="text-sm font-semibold text-slate-800">إدخال يدوي</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">استخدمه إذا لم يعمل المسح أو كانت الكاميرا غير متاحة.</p>
              <div className="mt-3">
                <ManualStationEntry />
              </div>
              {!session ? (
                <Link
                  className="mt-4 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  href="/login"
                >
                  {i18n.scan.loginCta}
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <SupportCard />

        {session ? (
          <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">المحطات النشطة</h2>
                  <p className="mt-1 text-sm text-slate-500">افتح محطة وسجل فحصها مباشرة.</p>
                </div>
              </div>
              {activeStations.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {activeStations.map((station) => (
                    <StationCard key={station.stationId} station={station} />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-control">
                  لا توجد محطات نشطة حتى الآن.
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xl font-bold text-slate-950">سجل فحوصاتي</h2>
              <p className="mt-1 text-sm text-slate-500">آخر التقارير التي أرسلتها من حسابك.</p>
              {recentReports.length > 0 ? (
                <ul className="mt-4 space-y-3">
                  {recentReports.map((report) => (
                    <RecentReport key={report.reportId} report={report} />
                  ))}
                </ul>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-control">
                  لم تسجل أي فحوصات بعد.
                </div>
              )}
            </section>
          </div>
        ) : null}
      </section>
      <CopyrightFooter className="mx-auto mt-8 max-w-7xl px-0" />
    </main>
  );
}
