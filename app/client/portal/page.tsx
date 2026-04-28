import type { Metadata } from "next";
import { CreateClientOrderForm } from "@/components/client-orders/create-client-order-form";
import { StatusPills } from "@/components/reports/status-pills";
import { requireRole } from "@/lib/auth/server-session";
import { listClientOrdersForClient, listReportsForClientOrderedStations, listStations } from "@/lib/db/repositories";
import type { AppTimestamp, ClientOrderStatus } from "@/types";

export const metadata: Metadata = {
  title: "بوابة العميل",
};

function formatTimestamp(timestamp?: AppTimestamp): string {
  if (!timestamp) {
    return "غير متاح";
  }
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(timestamp.toDate());
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

export default async function ClientPortalPage() {
  const session = await requireRole(["client"]);
  const [stations, orders, reports] = await Promise.all([
    listStations(),
    listClientOrdersForClient(session.uid),
    listReportsForClientOrderedStations(session.uid),
  ]);

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
          <h1 className="text-2xl font-extrabold text-[var(--foreground)]">بوابة العميل</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">إنشاء طلب فحص محطة ومتابعة نتائج المحطات التي طلبتها فقط.</p>
        </div>

        <CreateClientOrderForm stations={stations.map((station) => ({ stationId: station.stationId, label: station.label }))} />

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
          <h2 className="text-lg font-bold text-[var(--foreground)]">طلبات الفحص الخاصة بك</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-[var(--surface-subtle)]">
                <tr>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">المحطة</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">الحالة</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">التاريخ</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">الصورة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {orders.map((order) => (
                  <tr key={order.orderId}>
                    <td className="px-3 py-2 text-sm text-[var(--foreground)]">{order.stationLabel}</td>
                    <td className="px-3 py-2 text-sm text-[var(--foreground)]">{orderStatusLabel(order.status)}</td>
                    <td className="px-3 py-2 text-sm text-[var(--muted)]">{formatTimestamp(order.createdAt)}</td>
                    <td className="px-3 py-2 text-sm text-[var(--muted)]">
                      {order.photoUrl ? (
                        <a className="text-teal-700 hover:underline" href={order.photoUrl} rel="noreferrer" target="_blank">
                          فتح الصورة
                        </a>
                      ) : (
                        "لا يوجد"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
          <h2 className="text-lg font-bold text-[var(--foreground)]">تقارير المحطات المطلوبة</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead className="bg-[var(--surface-subtle)]">
                <tr>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">المحطة</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">الفني</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">التاريخ</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">حالة الفحص</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {reports.map((report) => (
                  <tr key={report.reportId}>
                    <td className="px-3 py-2 text-sm text-[var(--foreground)]">{report.stationLabel}</td>
                    <td className="px-3 py-2 text-sm text-[var(--foreground)]">{report.technicianName}</td>
                    <td className="px-3 py-2 text-sm text-[var(--muted)]">{formatTimestamp(report.submittedAt)}</td>
                    <td className="px-3 py-2 text-sm text-[var(--foreground)]">
                      <StatusPills status={report.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
