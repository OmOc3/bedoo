import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateClientOrderStatusAction } from "@/app/actions/client-orders";
import { ClientProfileForm } from "@/components/client-orders/client-profile-form";
import { ClientStationAccessForm } from "@/components/client-orders/client-station-access-form";
import { OrderStatusTimeline } from "@/components/client-orders/order-status-timeline";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { StatusPills } from "@/components/reports/status-pills";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole } from "@/lib/auth/server-session";
import { getClientAccountDetail, listStations, listAttendanceSessionsForAdmin } from "@/lib/db/repositories";
import type { AppTimestamp, ClientOrderStatus, ClientOrderWithStation } from "@/types";

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
  createdAt?: string | null;
}

// Convert ClientOrderWithStation to serializable format
function toSerializableOrder(order: ClientOrderWithStation): SerializableOrder {
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

interface ClientProfilePageProps {
  params: Promise<{
    clientUid: string;
  }>;
}

export const metadata: Metadata = {
  title: "ملف العميل",
};

const statuses = [
  { value: "pending", label: "جديد" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
] as const satisfies readonly { label: string; value: ClientOrderStatus }[];

function formatTimestamp(timestamp?: AppTimestamp): string {
  if (!timestamp) {
    return "غير متاح";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp.toDate());
}

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("");

  return initials || "ع";
}

// Serializable attendance info
interface AttendanceInfo {
  technicianName: string;
  clockInAt?: string | null;
  clockOutAt?: string | null;
}

// Find attendance session and convert to serializable data
function findAttendanceForOrder(order: ClientOrderWithStation, attendanceLogs: Array<{ technicianName: string; clockInAt?: AppTimestamp | null; clockOutAt?: AppTimestamp | null; clockInLocation?: { stationId: string } | null }>): AttendanceInfo | null {
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

function orderStatusBadge(status: ClientOrderStatus) {
  const label = statuses.find((item) => item.value === status)?.label ?? status;
  const tone =
    status === "pending"
      ? "pending"
      : status === "completed"
        ? "reviewed"
        : status === "cancelled"
          ? "rejected"
          : "active";

  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

function mapsHref(order: ClientOrderWithStation): string | null {
  if (!order.station?.coordinates) {
    return null;
  }

  const { lat, lng } = order.station.coordinates;
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function OrderStatusForm({ order }: { order: ClientOrderWithStation }) {
  return (
    <form
      action={async (formData) => {
        "use server";
        await updateClientOrderStatusAction(formData);
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input name="orderId" type="hidden" value={order.orderId} />
      <select
        aria-label="حالة الطلب"
        className="min-h-11 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-control focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        defaultValue={order.status}
        name="status"
      >
        {statuses.map((status) => (
          <option key={status.value} value={status.value}>
            {status.label}
          </option>
        ))}
      </select>
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        type="submit"
      >
        حفظ الحالة
      </button>
    </form>
  );
}

export default async function ClientProfilePage({ params }: ClientProfilePageProps) {
  const { clientUid } = await params;
  await requireRole(["manager"]);
  const [detail, stations, attendanceLogs] = await Promise.all([
    getClientAccountDetail(clientUid),
    listStations(),
    listAttendanceSessionsForAdmin({}, 100)
  ]);

  if (!detail) {
    notFound();
  }

  const addresses = detail.profile?.addresses ?? [];
  const stationCount = detail.stations.length;
  const activeOrders = detail.orders.filter((order) => order.status === "pending" || order.status === "in_progress").length;
  const latestOrder = detail.orders[0];

  return (
    <DashboardShell role="manager">
        <PageHeader
          backHref="/dashboard/manager/client-orders"
          description="ملف تشغيلي يجمع طلبات العميل وبيانات التواصل ومواقع المحطات التي أضافها."
          title={`ملف ${detail.client.displayName}`}
        />

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[var(--surface-subtle)] text-xl font-extrabold text-[var(--foreground)] ring-1 ring-[var(--border)]">
                {getInitials(detail.client.displayName)}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-extrabold text-[var(--foreground)]">{detail.client.displayName}</h1>
                  <StatusBadge tone={detail.client.isActive ? "active" : "inactive"}>{detail.client.isActive ? "نشط" : "غير نشط"}</StatusBadge>
                </div>
                <p className="mt-1 truncate text-sm text-[var(--muted)]" dir="ltr">
                  {detail.client.email}
                </p>
              </div>
            </div>
            <div className="grid w-full gap-3 sm:w-auto sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">الطلبات</p>
                <p className="mt-1 text-2xl font-extrabold text-[var(--foreground)]">{detail.orders.length}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">مفتوحة</p>
                <p className="mt-1 text-2xl font-extrabold text-[var(--foreground)]">{activeOrders}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">المحطات</p>
                <p className="mt-1 text-2xl font-extrabold text-[var(--foreground)]">{stationCount}</p>
              </div>
            </div>
          </div>

          <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-[var(--border-subtle)] pt-5 md:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold text-[var(--muted)]">رقم الهاتف</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]" dir="ltr">
                {detail.profile?.phone ?? "غير مسجل"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--muted)]">آخر طلب</dt>
              <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">{formatTimestamp(latestOrder?.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-[var(--muted)]">آخر موقع محطة</dt>
              <dd className="mt-1 text-sm leading-6 text-[var(--foreground)]">{latestOrder?.station?.location ?? "غير متاح"}</dd>
            </div>
          </dl>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--foreground)]">طلبات العميل</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">كل طلبات الفحص وحالتها وإدارتها من نفس المكان.</p>
              </div>
              <StatusBadge tone="inactive">إجمالي: {detail.orders.length}</StatusBadge>
            </div>

            {detail.orders.length === 0 ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
                <EmptyState description="لم ينشئ هذا العميل أي طلب فحص حتى الآن." title="لا توجد طلبات" />
              </div>
            ) : (
              <div className="space-y-3">
                {detail.orders.map((order) => {
                  const googleMapsHref = mapsHref(order);

                  return (
                    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card" key={order.orderId}>
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {orderStatusBadge(order.status)}
                            <span className="text-xs font-semibold text-[var(--muted)]" dir="ltr">
                              #{order.stationId}
                            </span>
                          </div>
                          <h3 className="mt-2 text-lg font-bold text-[var(--foreground)]">{order.stationLabel}</h3>
                          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{order.station?.location ?? "موقع المحطة غير متاح"}</p>
                        </div>
                        <OrderStatusTimeline compact order={toSerializableOrder(order)} attendanceSession={findAttendanceForOrder(order, attendanceLogs)} />
                      </div>
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-medium text-[var(--primary)] hover:underline">
                          تتبع الحالة
                        </summary>
                        <div className="mt-3 rounded-lg bg-[var(--surface-subtle)] p-3">
                          <OrderStatusTimeline order={toSerializableOrder(order)} attendanceSession={findAttendanceForOrder(order, attendanceLogs)} />
                        </div>
                      </details>
                      <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
                        <OrderStatusForm order={order} />
                      </div>

                      <dl className="mt-5 grid gap-x-6 gap-y-4 border-t border-[var(--border-subtle)] pt-4 md:grid-cols-3">
                        <div>
                          <dt className="text-xs font-semibold text-[var(--muted)]">تاريخ الطلب</dt>
                          <dd className="mt-1 text-sm text-[var(--foreground)]">{formatTimestamp(order.createdAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold text-[var(--muted)]">آخر زيارة للمحطة</dt>
                          <dd className="mt-1 text-sm text-[var(--foreground)]">{formatTimestamp(order.station?.lastVisitedAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs font-semibold text-[var(--muted)]">تقارير المحطة</dt>
                          <dd className="mt-1 text-sm text-[var(--foreground)]">{order.station?.totalReports ?? 0}</dd>
                        </div>
                        <div className="md:col-span-3">
                          <dt className="text-xs font-semibold text-[var(--muted)]">بيانات المحطة التي أدخلها العميل</dt>
                          <dd className="mt-1 text-sm leading-6 text-[var(--foreground)]">{order.station?.description ?? "لا توجد بيانات إضافية."}</dd>
                        </div>
                        <div className="md:col-span-3">
                          <dt className="text-xs font-semibold text-[var(--muted)]">ملاحظات الطلب</dt>
                          <dd className="mt-1 text-sm leading-6 text-[var(--foreground)]">{order.note ?? "لا توجد ملاحظات."}</dd>
                        </div>
                      </dl>

                      <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-4">
                        <Link
                          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-control transition-colors hover:bg-[var(--surface-subtle)]"
                          href={`/dashboard/manager/stations/${order.stationId}`}
                        >
                          فتح المحطة
                        </Link>
                        {googleMapsHref ? (
                          <a
                            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-control transition-colors hover:bg-[var(--surface-subtle)]"
                            href={googleMapsHref}
                            rel="noreferrer"
                            target="_blank"
                          >
                            فتح الموقع على الخريطة
                          </a>
                        ) : null}
                        {order.photoUrl ? (
                          <a
                            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-control transition-colors hover:bg-[var(--surface-subtle)]"
                            href={order.photoUrl}
                            rel="noreferrer"
                            target="_blank"
                          >
                            صورة العميل
                          </a>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
              <h2 className="text-lg font-bold text-[var(--foreground)]">عناوين العميل</h2>
              {addresses.length === 0 ? (
                <p className="mt-3 text-sm leading-6 text-[var(--muted)]">لم يتم تسجيل عناوين للعميل بعد.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {addresses.map((address) => (
                    <li className="border-b border-[var(--border-subtle)] pb-3 text-sm leading-6 text-[var(--foreground)] last:border-b-0 last:pb-0" key={address}>
                      {address}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <ClientStationAccessForm
              assignedStationIds={detail.access.map((access) => access.stationId)}
              clientUid={detail.client.uid}
              stations={stations.map((station) => ({
                label: station.label,
                location: station.location,
                stationId: station.stationId,
              }))}
            />
            <ClientProfileForm addresses={addresses} clientUid={detail.client.uid} phone={detail.profile?.phone} />
          </aside>
        </div>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[var(--foreground)]">تقارير المحطات المرتبطة</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">آخر تقارير الفنيين على محطات هذا العميل.</p>
            </div>
            <StatusBadge tone="inactive">{detail.reports.length} تقرير</StatusBadge>
          </div>

          {detail.reports.length === 0 ? (
            <div className="mt-4">
              <EmptyState description="لا توجد تقارير فنية على محطات هذا العميل حتى الآن." title="لا توجد تقارير" />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
                  <tr>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">المحطة</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">الفني</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">التاريخ</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">حالة الفحص</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {detail.reports.map((report) => (
                    <tr className="align-top transition-colors hover:bg-[var(--surface-subtle)]" key={report.reportId}>
                      <td className="px-4 py-3 text-sm font-semibold text-[var(--foreground)]">{report.stationLabel}</td>
                      <td className="px-4 py-3 text-sm text-[var(--muted)]">{report.technicianName}</td>
                      <td className="px-4 py-3 text-sm text-[var(--muted)]">{formatTimestamp(report.submittedAt)}</td>
                      <td className="px-4 py-3">
                        <StatusPills status={report.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
    </DashboardShell>
  );
}
