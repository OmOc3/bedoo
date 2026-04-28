import type { Metadata } from "next";
import { updateClientOrderStatusAction } from "@/app/actions/client-orders";
import { DashboardNav } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { requireRole } from "@/lib/auth/server-session";
import { listAppUsers, listClientOrders } from "@/lib/db/repositories";

export const metadata: Metadata = {
  title: "طلبات العملاء",
};

const statuses = [
  { value: "pending", label: "جديد" },
  { value: "in_progress", label: "قيد التنفيذ" },
  { value: "completed", label: "مكتمل" },
  { value: "cancelled", label: "ملغي" },
] as const;

export default async function ManagerClientOrdersPage() {
  await requireRole(["manager"]);
  const [orders, users] = await Promise.all([listClientOrders(), listAppUsers()]);
  const clients = users.filter((user) => user.role === "client");

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl space-y-6">
        <PageHeader description="إدارة العملاء ومراجعة طلبات فحص المحطات." title="طلبات العملاء" />
        <DashboardNav role="manager" />

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
          <h2 className="text-lg font-bold text-[var(--foreground)]">العملاء</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">إجمالي العملاء المسجلين: {clients.length}</p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
          <table className="w-full min-w-[900px]">
            <thead className="bg-[var(--surface-subtle)]">
              <tr>
                <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">العميل</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">المحطة</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">ملاحظة</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">الصورة</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">الحالة</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--muted)]">تحديث</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {orders.map((order) => (
                <tr key={order.orderId}>
                  <td className="px-3 py-2 text-sm text-[var(--foreground)]">{order.clientName}</td>
                  <td className="px-3 py-2 text-sm text-[var(--foreground)]">{order.stationLabel}</td>
                  <td className="px-3 py-2 text-sm text-[var(--muted)]">{order.note ?? "لا يوجد"}</td>
                  <td className="px-3 py-2 text-sm text-[var(--muted)]">
                    {order.photoUrl ? (
                      <a className="text-teal-700 hover:underline" href={order.photoUrl} rel="noreferrer" target="_blank">
                        عرض
                      </a>
                    ) : (
                      "لا يوجد"
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm text-[var(--foreground)]">{statuses.find((status) => status.value === order.status)?.label ?? order.status}</td>
                  <td className="px-3 py-2 text-sm">
                    <form
                      action={async (formData) => {
                        "use server";
                        await updateClientOrderStatusAction(formData);
                      }}
                      className="flex gap-2"
                    >
                      <input name="orderId" type="hidden" value={order.orderId} />
                      <select className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm" defaultValue={order.status} name="status">
                        {statuses.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                      <button className="rounded-md bg-[var(--primary)] px-3 py-1 text-xs font-semibold text-white hover:bg-[var(--primary-hover)]" type="submit">
                        حفظ
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
