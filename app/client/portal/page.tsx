import type { Metadata } from "next";
import { LogoutButton } from "@/components/auth/logout-button";
import { CreateClientOrderForm } from "@/components/client-orders/create-client-order-form";
import { OrderStatusTimeline } from "@/components/client-orders/order-status-timeline";
import { BrandLockup } from "@/components/layout/brand";
import { ThemeIconToggle } from "@/components/theme/theme-icon-toggle";
import { StatusPills } from "@/components/reports/status-pills";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole } from "@/lib/auth/server-session";
import {
  listClientOrdersForClient,
  listOrderedStationsForClient,
  listReportsForClientOrderedStations,
  listAttendanceSessionsForClient,
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

// Serializable attendance info
interface AttendanceInfo {
  technicianName: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
}

// Serializable order for client components
interface SerializableOrder {
  orderId: string;
  clientUid: string;
  stationId: string;
  stationLabel: string;
  clientName: string;
  status: ClientOrderStatus;
  note?: string | null;
  photoUrl?: string | null;
  createdAt?: string | null; // ISO string
}

// Convert ClientOrder to serializable format
function toSerializableOrder(order: ClientOrder): SerializableOrder {
  return {
    orderId: order.orderId,
    clientUid: order.clientUid,
    stationId: order.stationId,
    stationLabel: order.stationLabel,
    clientName: order.clientName,
    status: order.status,
    note: order.note,
    photoUrl: order.photoUrl,
    createdAt: order.createdAt?.toDate().toISOString() ?? null,
  };
}

// Find attendance session and convert to serializable data
function findAttendanceForOrder(order: ClientOrder, attendanceLogs: Array<{ technicianName: string; clockInAt?: AppTimestamp | null; clockOutAt?: AppTimestamp | null; clockInLocation?: { stationId: string } | null }>): AttendanceInfo | null {
  const stationAttendance = attendanceLogs.find(
    (log) => log.clockInLocation?.stationId === order.stationId
  );
  if (!stationAttendance) return null;
  
  return {
    technicianName: stationAttendance.technicianName,
    clockInAt: stationAttendance.clockInAt?.toDate().toISOString() ?? null,
    clockOutAt: stationAttendance.clockOutAt?.toDate().toISOString() ?? null,
  };
}

interface SummaryCardProps {
  label: string;
  value: number;
}

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
      <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-extrabold tracking-tight text-[var(--foreground)]">{value}</p>
    </div>
  );
}

export default async function ClientPortalPage() {
  const session = await requireRole(["client"]);
  const [orderedStations, orders, reports, attendanceLogs] = await Promise.all([
    listOrderedStationsForClient(session.uid),
    listClientOrdersForClient(session.uid),
    listReportsForClientOrderedStations(session.uid),
    listAttendanceSessionsForClient(session.uid, 30),
  ]);
  const openOrders = orders.filter((order) => order.status === "pending" || order.status === "in_progress").length;
  const completedOrders = orders.filter((order) => order.status === "completed").length;

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <BrandLockup compact />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--primary)]">بوابة العميل</p>
                <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight text-[var(--foreground)]">
                  أهلاً، {session.user.displayName}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--muted)]">
                  تابع طلبات الفحص والمحطات المرتبطة بحسابك من مكان واحد.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeIconToggle />
              <LogoutButton
                buttonClassName="!w-full sm:!w-auto"
                className="w-full sm:w-auto"
                redirectTo="/client/login"
              />
            </div>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="المحطات المرتبطة" value={orderedStations.length} />
          <SummaryCard label="طلبات مفتوحة" value={openOrders} />
          <SummaryCard label="طلبات مكتملة" value={completedOrders} />
          <SummaryCard label="تقارير مستلمة" value={reports.length} />
          <SummaryCard label="سجلات حضور الفنيين" value={attendanceLogs.length} />
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)] xl:items-start">
          <div className="xl:sticky xl:top-8">
            <CreateClientOrderForm />
          </div>

          <div className="flex flex-col gap-8">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-[var(--foreground)]">طلبات الفحص الخاصة بك</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">آخر الطلبات وحالة تنفيذ كل محطة.</p>
                </div>
                <StatusBadge tone={openOrders > 0 ? "pending" : "reviewed"}>{openOrders} مفتوح</StatusBadge>
              </div>

              {orders.length === 0 ? (
                <EmptyState description="ابدأ بإرسال طلب فحص جديد من النموذج الجانبي." title="لا توجد طلبات حتى الآن" />
              ) : (
                <>
                  <div className="mt-5 grid gap-4 lg:hidden">
                    {orders.map((order) => {
                      const attendance = findAttendanceForOrder(order, attendanceLogs);
                      const serializableOrder = toSerializableOrder(order);
                      return (
                        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card" key={order.orderId}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h3 className="truncate text-base font-bold text-[var(--foreground)]">{order.stationLabel}</h3>
                              <p className="mt-1 text-xs text-[var(--muted)]">{formatTimestamp(order.createdAt)}</p>
                            </div>
                            <OrderStatusTimeline compact order={serializableOrder} attendanceSession={attendance} />
                          </div>
                          <details className="mt-4">
                            <summary className="cursor-pointer text-sm font-medium text-[var(--primary)] hover:underline">
                              تفاصيل الحالة
                            </summary>
                            <div className="mt-3 rounded-lg bg-[var(--surface-subtle)] p-3">
                              <OrderStatusTimeline order={serializableOrder} attendanceSession={attendance} />
                            </div>
                          </details>
                          {order.photoUrl ? (
                            <a className="mt-3 inline-flex text-sm font-semibold text-[var(--primary)] hover:underline" href={order.photoUrl} rel="noreferrer" target="_blank">
                              فتح الصورة المرفقة
                            </a>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>

                  <div className="hidden space-y-4 lg:block">
                    {orders.map((order) => {
                      const attendance = findAttendanceForOrder(order, attendanceLogs);
                      const serializableOrder = toSerializableOrder(order);
                      return (
                        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card" key={order.orderId}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-[var(--foreground)]">{order.stationLabel}</h3>
                                <StatusBadge tone={orderStatusTone(order.status)}>{orderStatusLabel(order.status)}</StatusBadge>
                              </div>
                              <p className="mt-1 text-sm text-[var(--muted)]">تاريخ الطلب: {formatTimestamp(order.createdAt)}</p>
                            </div>
                            <OrderStatusTimeline compact order={serializableOrder} attendanceSession={attendance} />
                          </div>
                          <div className="mt-4 grid gap-4 border-t border-[var(--border-subtle)] pt-4 lg:grid-cols-[1fr_auto]">
                            <OrderStatusTimeline className="max-w-md" order={serializableOrder} attendanceSession={attendance} />
                            <div className="flex items-start gap-4">
                              {order.photoUrl ? (
                                <a className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline" href={order.photoUrl} rel="noreferrer" target="_blank">
                                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" y1="15" x2="12" y2="3" />
                                  </svg>
                                  تحميل الصورة
                                </a>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">محطاتي</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">المحطات التي تم ربطها بحساب العميل.</p>
              </div>

              {orderedStations.length === 0 ? (
                <EmptyState description="ستظهر هنا المحطات بعد اعتماد أول طلب فحص." title="لا توجد محطات مرتبطة" />
              ) : (
                <>
                  <div className="mt-5 grid gap-3 lg:hidden">
                    {orderedStations.map((station) => (
                      <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4" key={station.stationId}>
                        <h3 className="text-sm font-bold text-[var(--foreground)]">{station.label}</h3>
                        <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{station.location}</p>
                        <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{station.description ?? "لا توجد بيانات إضافية"}</p>
                        {station.photoUrls?.[0] ? (
                          <a className="mt-3 inline-flex text-sm font-semibold text-[var(--primary)] hover:underline" href={station.photoUrls[0]} rel="noreferrer" target="_blank">
                            عرض الصورة
                          </a>
                        ) : null}
                      </article>
                    ))}
                  </div>

                  <div className="soft-scrollbar mt-5 hidden overflow-x-auto rounded-xl border border-[var(--border)] lg:block">
                    <table className="w-full min-w-[640px]">
                      <thead className="bg-[var(--surface-subtle)]">
                        <tr>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">اسم المحطة</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">الموقع</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">الصورة</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">البيانات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {orderedStations.map((station) => (
                          <tr className="transition-colors hover:bg-[var(--surface-subtle)]" key={station.stationId}>
                            <td className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">{station.label}</td>
                            <td className="px-4 py-3 text-sm text-[var(--muted)]">{station.location}</td>
                            <td className="px-4 py-3 text-sm text-[var(--muted)]">
                              {station.photoUrls?.[0] ? (
                                <a className="font-semibold text-[var(--primary)] hover:underline" href={station.photoUrls[0]} rel="noreferrer" target="_blank">
                                  عرض الصورة
                                </a>
                              ) : (
                                "لا يوجد"
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-[var(--muted)]">{station.description ?? "لا يوجد"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">سجل حضور الفنيين</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">زيارات الفريق الميداني لمحطاتك المسجلة بالنظام.</p>
              </div>

              {attendanceLogs.length === 0 ? (
                <EmptyState description="ستظهر هنا سجلات حضور الفنيين عند زيارتهم لمحطاتك." title="لا توجد سجلات حضور بعد" />
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="mt-5 grid gap-3 lg:hidden">
                    {attendanceLogs.map((log) => (
                      <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4" key={log.attendanceId}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-[var(--foreground)]">{log.technicianName}</h3>
                            <p className="mt-1 text-xs text-[var(--muted)]">{log.clockInLocation?.stationLabel ?? "غير محدد"}</p>
                          </div>
                          <StatusBadge tone={log.clockOutAt ? "reviewed" : "pending"}>
                            {log.clockOutAt ? "مكتمل" : "قيد العمل"}
                          </StatusBadge>
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
                          <span>حضور: {formatTimestamp(log.clockInAt)}</span>
                          <span>انصراف: {log.clockOutAt ? formatTimestamp(log.clockOutAt) : "قيد العمل"}</span>
                        </div>
                        {log.clockInLocation && (
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            المسافة: {Math.round(log.clockInLocation.distanceMeters)} م
                          </p>
                        )}
                      </article>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="soft-scrollbar mt-5 hidden overflow-x-auto rounded-xl border border-[var(--border)] lg:block">
                    <table className="w-full min-w-[700px]">
                      <thead className="bg-[var(--surface-subtle)]">
                        <tr>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">الفني</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">المحطة</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">وقت الحضور</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">وقت الانصراف</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">الحالة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {attendanceLogs.map((log) => (
                          <tr className="transition-colors hover:bg-[var(--surface-subtle)]" key={log.attendanceId}>
                            <td className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">{log.technicianName}</td>
                            <td className="px-4 py-3 text-sm text-[var(--muted)]">{log.clockInLocation?.stationLabel ?? "غير محدد"}</td>
                            <td className="px-4 py-3 text-sm text-[var(--muted)]">{formatTimestamp(log.clockInAt)}</td>
                            <td className="px-4 py-3 text-sm text-[var(--muted)]">{log.clockOutAt ? formatTimestamp(log.clockOutAt) : "قيد العمل"}</td>
                            <td className="px-4 py-3">
                              <StatusBadge tone={log.clockOutAt ? "reviewed" : "pending"}>
                                {log.clockOutAt ? "مكتمل" : "قيد العمل"}
                              </StatusBadge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card sm:p-6">
              <div>
                <h2 className="text-lg font-bold text-[var(--foreground)]">تقارير المحطات</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">نتائج الفحص التي رفعها فريق التشغيل.</p>
              </div>

              {reports.length === 0 ? (
                <EmptyState description="ستظهر تقارير الفحص هنا بعد زيارة الفريق للمحطات." title="لا توجد تقارير بعد" />
              ) : (
                <>
                  <div className="mt-5 grid gap-3 lg:hidden">
                    {reports.map((report) => (
                      <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4" key={report.reportId}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="truncate text-sm font-bold text-[var(--foreground)]">{report.stationLabel}</h3>
                            <p className="mt-1 text-xs text-[var(--muted)]">
                              {report.technicianName} · {formatTimestamp(report.submittedAt)}
                            </p>
                          </div>
                          <StatusPills status={report.status} />
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="soft-scrollbar mt-5 hidden overflow-x-auto rounded-xl border border-[var(--border)] lg:block">
                    <table className="w-full min-w-[640px]">
                      <thead className="bg-[var(--surface-subtle)]">
                        <tr>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">المحطة</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">الفني</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">التاريخ</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">حالة الفحص</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {reports.map((report) => (
                          <tr className="transition-colors hover:bg-[var(--surface-subtle)]" key={report.reportId}>
                            <td className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">{report.stationLabel}</td>
                            <td className="px-4 py-3 text-sm text-[var(--foreground)]">{report.technicianName}</td>
                            <td className="px-4 py-3 text-sm text-[var(--muted)]">{formatTimestamp(report.submittedAt)}</td>
                            <td className="px-4 py-3 text-sm text-[var(--foreground)]">
                              <StatusPills status={report.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
