import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { StationAttendancePanel, type SerializedOpenSession } from "@/components/attendance/station-attendance-panel";
import { ReportForm } from "@/components/station/report-form";
import { requireRole } from "@/lib/auth/server-session";
import { getOpenAttendanceSession, getStationById, getOpenShift } from "@/lib/db/repositories";
import { verifyStationQrToken } from "@/lib/qr/station-qr-token";

interface StationReportPageProps {
  params: Promise<{
    stationId: string;
  }>;
  searchParams: Promise<{
    qr?: string;
  }>;
}

export const metadata: Metadata = {
  title: "تقرير فحص محطة",
};

function ErrorMessage({ message }: { message: string }) {
  return (
    <main className="flex min-h-dvh items-center bg-[var(--surface-subtle)] px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center sm:p-6">
        <h1 className="text-xl font-bold text-[var(--foreground)]">{message}</h1>
        <Link
          className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-3 text-base font-medium text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
          href="/scan"
        >
          العودة للمسح
        </Link>
      </section>
    </main>
  );
}

function ShiftBlockedScreen() {
  const links = [
    { href: "/scan", label: "بدء الشيفت" },
    { href: "/scan#shift-history", label: "سجل الشيفتات" },
    { href: "/scan#salary-records", label: "سجل الرواتب" },
    { href: "/scan#notifications", label: "الإشعارات" },
  ];

  return (
    <main className="flex min-h-dvh items-center bg-[var(--surface-subtle)] px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
        <p className="text-sm font-semibold text-amber-700">الوصول مقيد</p>
        <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)]">ابدأ شيفت نشط قبل فحص المحطات</h1>
        <p className="mt-3 text-base leading-7 text-[var(--muted)]">
          لا يمكن تسجيل حضور محطة أو حفظ تقرير فحص خارج شيفت نشط. يمكنك متابعة سجلاتك وإشعاراتك من صفحة الفني.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {links.map((link) => (
            <Link
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

export default async function StationReportPage({ params, searchParams }: StationReportPageProps) {
  const { stationId } = await params;
  const { qr } = await searchParams;
  const session = await requireRole(["technician", "manager"]);
  const openShift = session.role === "technician" ? await getOpenShift(session.uid) : null;

  if (session.role === "technician" && !openShift) {
    return <ShiftBlockedScreen />;
  }

  if (!verifyStationQrToken(stationId, qr)) {
    return <ErrorMessage message="رابط QR غير صالح. امسح رمز المحطة من لوحة المدير مرة أخرى." />;
  }

  const [station, openAttendanceSession] = await Promise.all([
    getStationById(stationId),
    session.role === "technician" ? getOpenAttendanceSession(session.uid) : Promise.resolve(null),
  ]);
  const canTechnicianSubmit =
    session.role !== "technician" ||
    (openAttendanceSession?.clockInLocation?.stationId === stationId && openAttendanceSession.shiftId === openShift?.shiftId);

  const serializedOpenSession: SerializedOpenSession | null =
    openAttendanceSession
      ? {
          attendanceId: openAttendanceSession.attendanceId,
          technicianName: openAttendanceSession.technicianName,
          clockInAtMs: openAttendanceSession.clockInAt.toDate().getTime(),
          clockInLocation: openAttendanceSession.clockInLocation,
        }
      : null;

  if (!station) {
    return <ErrorMessage message="المحطة غير موجودة" />;
  }

  if (!station.isActive) {
    return <ErrorMessage message="هذه المحطة غير نشطة" />;
  }

  return (
    <main className="min-h-dvh bg-[var(--surface-subtle)] px-4 py-6 text-right" dir="rtl">
      <section className="mx-auto w-full max-w-lg space-y-4">
        <div>
          <Link className="text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]" href="/scan">
            العودة للمسح
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)]">تقرير فحص محطة</h1>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <div className="rounded-xl bg-[var(--surface-subtle)] p-4">
            {station.photoUrls?.[0] ? (
              <Image
                alt={`صورة المحطة ${station.label}`}
                className="mb-4 h-40 w-full rounded-xl border border-[var(--border)] object-cover"
                height={160}
                src={station.photoUrls[0]}
                unoptimized
                width={480}
              />
            ) : null}
            <p className="text-sm font-medium text-[var(--muted)]">المحطة</p>
            <p className="mt-1 text-sm font-semibold text-teal-700" dir="ltr">
              #{station.stationId}
            </p>
            <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">{station.label ?? "محطة بدون اسم"}</p>
            <p className="mt-1 text-base leading-7 text-[var(--muted)]">{station.location ?? "غير محدد"}</p>
            {station.description ? <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{station.description}</p> : null}
          </div>
          <div className="mt-5">
            {session.role === "technician" ? (
              <div className="mb-5">
                <StationAttendancePanel
                  openSession={serializedOpenSession}
                  stationId={stationId}
                  stationLabel={station.label ?? "محطة بدون اسم"}
                />
              </div>
            ) : null}
            <ReportForm
              blockedReason={session.role === "technician" ? "سجل الحضور في هذه المحطة أولا حتى تتمكن من حفظ التقرير." : undefined}
              canSubmit={canTechnicianSubmit}
              stationId={stationId}
              stationLabel={station.label ?? "محطة بدون اسم"}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
