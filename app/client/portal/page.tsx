import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { ClientAccountSettingsForm } from "@/components/client-orders/client-account-settings-form";
import { CreateClientOrderForm } from "@/components/client-orders/create-client-order-form";
import { OrderStatusTimeline } from "@/components/client-orders/order-status-timeline";
import { BrandLockup } from "@/components/layout/brand";
import { StatusPills } from "@/components/reports/status-pills";
import { ThemeIconToggle } from "@/components/theme/theme-icon-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole } from "@/lib/auth/server-session";
import {
  getClientProfile,
  listAttendanceSessionsForClient,
  listClientOrdersForClient,
  listOrderedStationsForClient,
  listReportsForClientOrderedStations,
} from "@/lib/db/repositories";
import type { AppTimestamp, ClientOrder, ClientOrderStatus } from "@/types";

export const metadata: Metadata = {
  title: "بوابة العميل",
};

function formatTimestamp(timestamp?: AppTimestamp): string {
  if (!timestamp) {
    return "غير متاح";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp.toDate());
}

function orderStatusLabel(status: ClientOrderStatus): string {
  return (
    {
      pending: "جديد",
      in_progress: "قيد التنفيذ",
      completed: "مكتمل",
      cancelled: "ملغي",
    } satisfies Record<ClientOrderStatus, string>
  )[status];
}

function orderStatusTone(status: ClientOrderStatus): "active" | "inactive" | "pending" | "rejected" | "reviewed" {
  if (status === "pending") {
    return "pending";
  }

  if (status === "completed") {
    return "reviewed";
  }

  if (status === "cancelled") {
    return "rejected";
  }

  return "active";
}

interface AttendanceInfo {
  clockInAt?: string | null;
  clockOutAt?: string | null;
  technicianName: string;
}

interface SerializableOrder {
  clientName: string;
  clientUid: string;
  createdAt?: string | null;
  note?: string | null;
  orderId: string;
  photoUrl?: string | null;
  stationId: string;
  stationLabel: string;
  status: ClientOrderStatus;
}

function toSerializableOrder(order: ClientOrder): SerializableOrder {
  return {
    clientName: order.clientName,
    clientUid: order.clientUid,
    createdAt: order.createdAt?.toDate().toISOString() ?? null,
    note: order.note,
    orderId: order.orderId,
    photoUrl: order.photoUrl,
    stationId: order.stationId,
    stationLabel: order.stationLabel,
    status: order.status,
  };
}

function findAttendanceForOrder(
  order: ClientOrder,
  attendanceLogs: Array<{
    clockInAt?: AppTimestamp | null;
    clockInLocation?: { stationId: string } | null;
    clockOutAt?: AppTimestamp | null;
    technicianName: string;
  }>,
): AttendanceInfo | null {
  const stationAttendance = attendanceLogs.find((log) => log.clockInLocation?.stationId === order.stationId);

  if (!stationAttendance) {
    return null;
  }

  return {
    clockInAt: stationAttendance.clockInAt?.toDate().toISOString() ?? null,
    clockOutAt: stationAttendance.clockOutAt?.toDate().toISOString() ?? null,
    technicianName: stationAttendance.technicianName,
  };
}

function SummaryCard({ helper, label, value }: { helper: string; label: string; value: number }) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-subtle)] p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-md">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <p className="relative text-sm font-medium text-[var(--muted)]">{label}</p>
      <p className="relative mt-2 text-3xl font-extrabold tracking-tight text-[var(--foreground)]">{value}</p>
      <p className="relative mt-1 text-xs leading-5 text-[var(--muted)]">{helper}</p>
    </div>
  );
}

function SectionHeader({
  badge,
  description,
  title,
}: {
  badge?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
      {badge}
    </div>
  );
}

export default async function ClientPortalPage() {
  const session = await requireRole(["client"]);
  const [orderedStations, orders, reports, attendanceLogs, clientProfile] = await Promise.all([
    listOrderedStationsForClient(session.uid),
    listClientOrdersForClient(session.uid),
    listReportsForClientOrderedStations(session.uid),
    listAttendanceSessionsForClient(session.uid, 30),
    getClientProfile(session.uid),
  ]);

  const pendingOrders = orders.filter((order) => order.status === "pending").length;
  const inProgressOrders = orders.filter((order) => order.status === "in_progress").length;
  const openOrders = pendingOrders + inProgressOrders;
  const completedOrders = orders.filter((order) => order.status === "completed").length;
  const latestOrder = orders[0];

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-5 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card lg:flex-row lg:items-center lg:justify-between transition-all duration-300 hover:shadow-card-md">
          <div className="flex min-w-0 items-center gap-4">
            <BrandLockup compact />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--primary)]">بوابة العميل</p>
              <h1 className="mt-1 truncate text-2xl font-bold text-[var(--foreground)]">
                أهلًا، {session.user.displayName}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                اطلب فحص محطة، تابع حالة التنفيذ، وراجع سجل الزيارات من مكان واحد.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeIconToggle />
            <LogoutButton buttonClassName="!w-full sm:!w-auto" className="w-full sm:w-auto" redirectTo="/client/login" />
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard helper={`${pendingOrders} جديد، ${inProgressOrders} قيد التنفيذ`} label="طلبات مفتوحة" value={openOrders} />
          <SummaryCard helper="كل طلبات الفحص التي أرسلتها" label="إجمالي الطلبات" value={orders.length} />
          <SummaryCard helper="محطات مرتبطة بحسابك" label="محطاتي" value={orderedStations.length} />
          <SummaryCard helper={`${completedOrders} طلب مكتمل`} label="تقارير مستلمة" value={reports.length} />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.35fr)] xl:items-start">
          <aside className="flex flex-col gap-6 xl:sticky xl:top-6">
            <CreateClientOrderForm />
            <ClientAccountSettingsForm
              phone={clientProfile?.phone}
              user={{
                displayName: session.user.displayName,
                email: session.user.email,
                image: session.user.image,
                passwordChangedAt: session.user.passwordChangedAt?.toDate().toISOString() ?? null,
                uid: session.uid,
              }}
            />
          </aside>

          <div className="flex flex-col gap-6">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
              <SectionHeader
                badge={<StatusBadge tone={openOrders > 0 ? "pending" : "reviewed"}>{openOrders} مفتوح</StatusBadge>}
                description={
                  latestOrder
                    ? `آخر طلب: ${latestOrder.stationLabel} في ${formatTimestamp(latestOrder.createdAt)}`
                    : "ابدأ بأول طلب فحص وسيظهر هنا خط التنفيذ."
                }
                title="طلباتي"
              />

              {orders.length === 0 ? (
                <div className="mt-5">
                  <EmptyState description="استخدم نموذج الطلب لإرسال بيانات المحطة. سنعرض هنا حالة كل طلب خطوة بخطوة." title="لا توجد طلبات بعد" />
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {orders.map((order) => {
                    const attendance = findAttendanceForOrder(order, attendanceLogs);
                    const serializableOrder = toSerializableOrder(order);

                    return (
                      <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-all duration-300 hover:shadow-card-md hover:-translate-y-1" key={order.orderId}>
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate text-base font-bold text-[var(--foreground)]">{order.stationLabel}</h3>
                              <StatusBadge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status)}</StatusBadge>
                            </div>
                            <p className="mt-1 text-sm text-[var(--muted)]">تاريخ الطلب: {formatTimestamp(order.createdAt)}</p>
                            {order.note ? <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{order.note}</p> : null}
                          </div>
                          <OrderStatusTimeline compact order={serializableOrder} attendanceSession={attendance} />
                        </div>

                        <details className="group mt-4 border-t border-[var(--border-subtle)] pt-4">
                          <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[var(--primary)]">
                            تفاصيل التنفيذ
                            <span className="transition-transform duration-300 group-open:-rotate-180">
                              <svg aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                                <path d="m6 9 6 6 6-6" />
                              </svg>
                            </span>
                          </summary>
                          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,26rem)_1fr]">
                            <OrderStatusTimeline order={serializableOrder} attendanceSession={attendance} />
                            <div className="rounded-lg bg-[var(--surface-subtle)] p-3 text-sm leading-6 text-[var(--muted)]">
                              <p>المحطة: {order.stationLabel}</p>
                              <p>الحالة: {orderStatusLabel(order.status)}</p>
                              {order.photoUrl ? (
                                <a className="mt-2 inline-flex font-semibold text-[var(--primary)] hover:underline" href={order.photoUrl} rel="noreferrer" target="_blank">
                                  فتح الصورة المرفقة
                                </a>
                              ) : (
                                <p className="mt-2">لا توجد صورة مرفقة.</p>
                              )}
                            </div>
                          </div>
                        </details>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
              <SectionHeader description="المحطات التي تم ربطها بحسابك بعد اعتماد الطلبات أو من الإدارة." title="محطاتي" />

              {orderedStations.length === 0 ? (
                <div className="mt-5">
                  <EmptyState description="بعد اعتماد أول طلب فحص ستظهر المحطة هنا لتتمكن من متابعة زياراتها وتقاريرها." title="لا توجد محطات مرتبطة" />
                </div>
              ) : (
                <div className="mt-5 divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border)]">
                  {orderedStations.map((station) => (
                    <article className="grid gap-3 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center transition-colors hover:bg-[var(--surface-subtle)] first:rounded-t-2xl last:rounded-b-2xl" key={station.stationId}>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-[var(--foreground)]">{station.label}</h3>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{station.location}</p>
                        {station.description ? <p className="mt-1 text-sm leading-6 text-[var(--foreground)]">{station.description}</p> : null}
                      </div>
                      {station.photoUrls?.[0] ? (
                        <a className="inline-flex text-sm font-semibold text-[var(--primary)] hover:underline" href={station.photoUrls[0]} rel="noreferrer" target="_blank">
                          عرض الصورة
                        </a>
                      ) : (
                        <span className="text-sm text-[var(--muted)]">بدون صورة</span>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
                <SectionHeader description="نتائج الفحص التي رفعها فريق التشغيل للمحطات المرتبطة بك." title="تقارير المحطات" />

                {reports.length === 0 ? (
                  <div className="mt-5">
                    <EmptyState description="ستظهر نتائج الفحص هنا بعد زيارة الفريق للمحطات." title="لا توجد تقارير بعد" />
                  </div>
                ) : (
                  <div className="mt-5 divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border)]">
                    {reports.map((report) => (
                      <article className="p-5 transition-colors hover:bg-[var(--surface-subtle)] first:rounded-t-2xl last:rounded-b-2xl" key={report.reportId}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-[var(--foreground)]">{report.stationLabel}</h3>
                            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                              {report.technicianName}، {formatTimestamp(report.submittedAt)}
                            </p>
                          </div>
                          <StatusPills status={report.status} />
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
                <SectionHeader description="آخر زيارات الفنيين للمحطات التي تخص حسابك." title="حضور الفنيين" />

                {attendanceLogs.length === 0 ? (
                  <div className="mt-5">
                    <EmptyState description="عند تسجيل حضور فني في إحدى محطاتك سيظهر السجل هنا." title="لا توجد زيارات مسجلة" />
                  </div>
                ) : (
                  <div className="mt-5 divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border)]">
                    {attendanceLogs.map((log) => (
                      <article className="p-5 transition-colors hover:bg-[var(--surface-subtle)] first:rounded-t-2xl last:rounded-b-2xl" key={log.attendanceId}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-sm font-bold text-[var(--foreground)]">{log.technicianName}</h3>
                            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                              {log.clockInLocation?.stationLabel ?? "محطة غير محددة"}
                            </p>
                          </div>
                          <StatusBadge tone={log.clockOutAt ? "reviewed" : "pending"}>{log.clockOutAt ? "مكتمل" : "قيد العمل"}</StatusBadge>
                        </div>
                        <div className="mt-3 grid gap-1 text-xs leading-5 text-[var(--muted)]">
                          <p>حضور: {formatTimestamp(log.clockInAt)}</p>
                          <p>انصراف: {log.clockOutAt ? formatTimestamp(log.clockOutAt) : "قيد العمل"}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
