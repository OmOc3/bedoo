import type { Metadata } from "next";
import Link from "next/link";
import { CreateClientAccountForm } from "@/components/client-orders/create-client-account-form";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireRole } from "@/lib/auth/server-session";
import { listAppUsers, listClientDirectory } from "@/lib/db/repositories";
import type { AppTimestamp, AppUser } from "@/types";

export const metadata: Metadata = {
  title: "العملاء والطلبات",
};

interface ManagerClientOrdersPageProps {
  searchParams: Promise<{
    q?: string;
    tab?: string;
  }>;
}

function formatTimestamp(timestamp?: AppTimestamp): string {
  if (!timestamp) {
    return "لا توجد طلبات";
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

function userMatchesQuery(user: AppUser, phone: string | undefined, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    user.displayName.toLowerCase().includes(q) ||
    user.email.toLowerCase().includes(q) ||
    (phone ?? "").includes(q)
  );
}

export default async function ManagerClientOrdersPage({ searchParams }: ManagerClientOrdersPageProps) {
  await requireRole(["manager"]);
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const activeTab = params.tab === "orders" ? "orders" : "clients";

  const [allUsers, clients] = await Promise.all([
    listAppUsers(),
    listClientDirectory(),
  ]);

  // All users with role === client from Better Auth user table
  const allClientUsers = allUsers.filter((u) => u.role === "client");

  // Build phone map from client directory profiles
  const phoneMap = new Map<string, string | undefined>();
  for (const entry of clients) {
    phoneMap.set(entry.client.uid, entry.profile?.phone);
  }

  // Filter clients by search query
  const filteredClientUsers = allClientUsers.filter((u) =>
    userMatchesQuery(u, phoneMap.get(u.uid), query),
  );

  // Stats
  const totalOrders = clients.reduce((sum, client) => sum + client.totalOrders, 0);
  const openOrders = clients.reduce((sum, client) => sum + client.pendingOrders + client.inProgressOrders, 0);
  const completedOrders = clients.reduce((sum, client) => sum + client.completedOrders, 0);
  const missingContactCount = clients.filter(
    (client) => !client.profile?.phone && (client.profile?.addresses.length ?? 0) === 0,
  ).length;

  // For the orders tab, filter directory entries to those matching the search
  const filteredDirectory = query
    ? clients.filter((entry) =>
        userMatchesQuery(entry.client, entry.profile?.phone, query),
      )
    : clients;

  return (
    <DashboardShell role="manager">
      <PageHeader
        action={
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]"
            href="/dashboard/manager"
          >
            لوحة المدير
          </Link>
        }
        backHref="/dashboard/manager"
        description="كل عملاء الموقع وطلباتهم في مكان واحد — ابحث بالاسم أو الهاتف أو البريد الإلكتروني."
        title="العملاء والطلبات"
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-subtle)] p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-md">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <p className="relative text-sm font-medium text-[var(--muted)]">إجمالي العملاء</p>
          <p className="relative mt-2 text-3xl font-extrabold text-[var(--foreground)]">{allClientUsers.length}</p>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-subtle)] p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-md">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <p className="relative text-sm font-medium text-[var(--muted)]">طلبات مفتوحة</p>
          <p className="relative mt-2 text-3xl font-extrabold text-[var(--foreground)]">{openOrders}</p>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-subtle)] p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-md">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <p className="relative text-sm font-medium text-[var(--muted)]">طلبات مكتملة</p>
          <p className="relative mt-2 text-3xl font-extrabold text-[var(--foreground)]">{completedOrders}</p>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-subtle)] p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-card-md">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <p className="relative text-sm font-medium text-[var(--muted)]">بيانات ناقصة</p>
          <p className="relative mt-2 text-3xl font-extrabold text-[var(--foreground)]">{missingContactCount}</p>
        </div>
      </div>

      {/* Create client form */}
      <CreateClientAccountForm />

      {/* Search bar */}
      <form
        action="/dashboard/manager/client-orders"
        className="flex flex-wrap items-end gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card"
      >
        <input type="hidden" name="tab" value={activeTab} />
        <div className="flex-1 min-w-[220px]">
          <label className="mb-1.5 block text-xs font-semibold text-[var(--muted)]" htmlFor="client-search">
            البحث عن عميل
          </label>
          <div className="relative">
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 end-3 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              autoComplete="off"
              className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pe-3 ps-10 py-2 text-sm text-[var(--foreground)] shadow-control focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              defaultValue={query}
              id="client-search"
              name="q"
              placeholder="الاسم، البريد الإلكتروني، أو رقم الهاتف"
            />
          </div>
        </div>
        <div className="flex items-end gap-2">
          <button
            className="min-h-11 rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            type="submit"
          >
            بحث
          </button>
          {query ? (
            <Link
              className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--surface-subtle)]"
              href={`/dashboard/manager/client-orders?tab=${activeTab}`}
            >
              مسح
            </Link>
          ) : null}
        </div>
      </form>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-1 w-fit shadow-control">
        <Link
          className={`inline-flex min-h-9 items-center justify-center rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
            activeTab === "clients"
              ? "bg-[var(--surface)] text-[var(--foreground)] shadow-control"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
          href={`/dashboard/manager/client-orders?${query ? `q=${encodeURIComponent(query)}&` : ""}tab=clients`}
        >
          <svg
            aria-hidden="true"
            className="me-1.5 h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M16 19a4 4 0 0 0-8 0" />
            <circle cx="12" cy="8" r="3" />
            <path d="M21 19a3.5 3.5 0 0 0-4-3.45" />
            <path d="M3 19a3.5 3.5 0 0 1 4-3.45" />
          </svg>
          كل العملاء
          <span className="ms-2 inline-flex h-5 items-center rounded-full bg-[var(--surface-subtle)] px-2 text-xs font-bold text-[var(--muted)] ring-1 ring-[var(--border)]">
            {filteredClientUsers.length}
          </span>
        </Link>
        <Link
          className={`inline-flex min-h-9 items-center justify-center rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
            activeTab === "orders"
              ? "bg-[var(--surface)] text-[var(--foreground)] shadow-control"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
          href={`/dashboard/manager/client-orders?${query ? `q=${encodeURIComponent(query)}&` : ""}tab=orders`}
        >
          <svg
            aria-hidden="true"
            className="me-1.5 h-4 w-4 shrink-0"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="M6 3h9l3 3v15H6z" />
            <path d="M14 3v4h4" />
            <path d="M9 12h6" />
            <path d="M9 16h4" />
          </svg>
          إدارة الطلبات
          <span className="ms-2 inline-flex h-5 items-center rounded-full bg-[var(--surface-subtle)] px-2 text-xs font-bold text-[var(--muted)] ring-1 ring-[var(--border)]">
            {totalOrders}
          </span>
        </Link>
      </div>

      {/* Tab: All Clients */}
      {activeTab === "clients" ? (
        filteredClientUsers.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
            <EmptyState
              description={
                query
                  ? "لم يُعثر على عميل مطابق. جرّب كلمة بحث مختلفة."
                  : "لا يوجد عملاء مسجلون بعد. أنشئ حساب عميل من النموذج أعلاه."
              }
              title={query ? "لا توجد نتائج" : "لا يوجد عملاء بعد"}
            />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card lg:block">
              <table className="w-full min-w-[760px]">
                <thead className="bg-[var(--surface-subtle)]">
                  <tr>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">العميل</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">البريد الإلكتروني</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">رقم الهاتف</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">الحالة</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">الطلبات</th>
                    <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">آخر طلب</th>
                    <th className="px-5 py-3.5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {filteredClientUsers.map((clientUser) => {
                    const dirEntry = clients.find((e) => e.client.uid === clientUser.uid);
                    const phone = phoneMap.get(clientUser.uid);

                    return (
                      <tr className="align-middle transition-colors hover:bg-[var(--surface-subtle)]" key={clientUser.uid}>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--surface-subtle)] text-sm font-bold text-[var(--foreground)] ring-1 ring-[var(--border)]">
                              {getInitials(clientUser.displayName)}
                            </div>
                            <p className="text-sm font-bold text-[var(--foreground)]">{clientUser.displayName}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-sm text-[var(--muted)]" dir="ltr">
                          {clientUser.email}
                        </td>
                        <td className="px-5 py-3 text-sm text-[var(--muted)]" dir="ltr">
                          {phone ?? <span className="text-[var(--muted)] opacity-50">—</span>}
                        </td>
                        <td className="px-5 py-3">
                          <StatusBadge tone={clientUser.isActive ? "active" : "inactive"}>
                            {clientUser.isActive ? "نشط" : "غير نشط"}
                          </StatusBadge>
                        </td>
                        <td className="px-5 py-3">
                          {dirEntry ? (
                            <div className="flex flex-wrap gap-1">
                              {dirEntry.pendingOrders > 0 ? (
                                <StatusBadge tone="pending">جديد: {dirEntry.pendingOrders}</StatusBadge>
                              ) : null}
                              {dirEntry.inProgressOrders > 0 ? (
                                <StatusBadge tone="active">جارٍ: {dirEntry.inProgressOrders}</StatusBadge>
                              ) : null}
                              {dirEntry.completedOrders > 0 ? (
                                <StatusBadge tone="reviewed">مكتمل: {dirEntry.completedOrders}</StatusBadge>
                              ) : null}
                              {dirEntry.totalOrders === 0 ? (
                                <span className="text-xs text-[var(--muted)]">لا طلبات</span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-[var(--muted)]">لا طلبات</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-sm text-[var(--muted)]">
                          {dirEntry?.latestOrderAt ? formatTimestamp(dirEntry.latestOrderAt) : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <Link
                            className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-1.5 text-xs font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                            href={`/dashboard/manager/client-orders/${clientUser.uid}`}
                          >
                            فتح الملف
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="grid gap-3 lg:hidden">
              {filteredClientUsers.map((clientUser) => {
                const dirEntry = clients.find((e) => e.client.uid === clientUser.uid);
                const phone = phoneMap.get(clientUser.uid);

                return (
                  <article
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card transition-all duration-300 hover:shadow-card-md hover:-translate-y-1"
                    key={clientUser.uid}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--surface-subtle)] text-base font-bold text-[var(--foreground)] ring-1 ring-[var(--border)]">
                          {getInitials(clientUser.displayName)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[var(--foreground)]">{clientUser.displayName}</p>
                          <p className="truncate text-xs text-[var(--muted)]" dir="ltr">{clientUser.email}</p>
                          {phone ? <p className="text-xs text-[var(--muted)]" dir="ltr">{phone}</p> : null}
                        </div>
                      </div>
                      <StatusBadge tone={clientUser.isActive ? "active" : "inactive"}>
                        {clientUser.isActive ? "نشط" : "غير نشط"}
                      </StatusBadge>
                    </div>

                    {dirEntry && dirEntry.totalOrders > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {dirEntry.pendingOrders > 0 ? (
                          <StatusBadge tone="pending">جديد: {dirEntry.pendingOrders}</StatusBadge>
                        ) : null}
                        {dirEntry.inProgressOrders > 0 ? (
                          <StatusBadge tone="active">جارٍ: {dirEntry.inProgressOrders}</StatusBadge>
                        ) : null}
                        {dirEntry.completedOrders > 0 ? (
                          <StatusBadge tone="reviewed">مكتمل: {dirEntry.completedOrders}</StatusBadge>
                        ) : null}
                        {dirEntry.cancelledOrders > 0 ? (
                          <StatusBadge tone="rejected">ملغي: {dirEntry.cancelledOrders}</StatusBadge>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
                      <p className="text-xs text-[var(--muted)]">
                        {dirEntry?.latestOrderAt ? `آخر طلب: ${formatTimestamp(dirEntry.latestOrderAt)}` : "لا طلبات بعد"}
                      </p>
                      <Link
                        className="inline-flex min-h-9 items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-1.5 text-xs font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98]"
                        href={`/dashboard/manager/client-orders/${clientUser.uid}`}
                      >
                        فتح الملف
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )
      ) : null}

      {/* Tab: Orders Management */}
      {activeTab === "orders" ? (
        filteredDirectory.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
            <EmptyState
              description={
                query
                  ? "لم يُعثر على عملاء مطابقين. جرّب كلمة بحث مختلفة."
                  : "أنشئ حساب عميل من النموذج أعلاه، ثم ستظهر ملفاته هنا."
              }
              title={query ? "لا توجد نتائج" : "لا يوجد عملاء بعد"}
            />
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredDirectory.map((client) => {
              const primaryAddress = client.profile?.addresses[0];
              const extraAddressCount = Math.max((client.profile?.addresses.length ?? 0) - 1, 0);

              return (
                <article
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card transition-all duration-300 hover:shadow-card-md hover:-translate-y-1"
                  key={client.client.uid}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--surface-subtle)] text-lg font-bold text-[var(--foreground)] ring-1 ring-[var(--border)]">
                        {getInitials(client.client.displayName)}
                      </div>
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-[var(--foreground)]">
                          {client.client.displayName}
                        </h2>
                        <p className="truncate text-sm text-[var(--muted)]" dir="ltr">
                          {client.client.email}
                        </p>
                      </div>
                    </div>
                    <StatusBadge tone={client.client.isActive ? "active" : "inactive"}>
                      {client.client.isActive ? "نشط" : "غير نشط"}
                    </StatusBadge>
                  </div>

                  <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                    <div className="border-b border-[var(--border-subtle)] pb-3">
                      <dt className="text-xs font-semibold text-[var(--muted)]">رقم الهاتف</dt>
                      <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]" dir="ltr">
                        {client.profile?.phone ?? "غير مسجل"}
                      </dd>
                    </div>
                    <div className="border-b border-[var(--border-subtle)] pb-3">
                      <dt className="text-xs font-semibold text-[var(--muted)]">آخر طلب</dt>
                      <dd className="mt-1 text-sm font-semibold text-[var(--foreground)]">
                        {formatTimestamp(client.latestOrderAt)}
                      </dd>
                    </div>
                    <div className="border-b border-[var(--border-subtle)] pb-3 sm:col-span-2">
                      <dt className="text-xs font-semibold text-[var(--muted)]">العنوان الأساسي</dt>
                      <dd className="mt-1 text-sm leading-6 text-[var(--foreground)]">
                        {primaryAddress ?? "لم يتم تسجيل عنوان للعميل"}
                        {extraAddressCount > 0 ? (
                          <span className="ms-2 text-xs text-[var(--muted)]">+{extraAddressCount} عناوين أخرى</span>
                        ) : null}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-xs font-semibold text-[var(--muted)]">آخر موقع محطة أضافه العميل</dt>
                      <dd className="mt-1 text-sm leading-6 text-[var(--foreground)]">
                        {client.latestStationLocation ?? "لا توجد محطة مرتبطة بعد"}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <StatusBadge tone="pending">جديد: {client.pendingOrders}</StatusBadge>
                    <StatusBadge tone="active">قيد التنفيذ: {client.inProgressOrders}</StatusBadge>
                    <StatusBadge tone="reviewed">مكتمل: {client.completedOrders}</StatusBadge>
                    <StatusBadge tone="rejected">ملغي: {client.cancelledOrders}</StatusBadge>
                    <StatusBadge tone="inactive">محطات: {client.stationCount}</StatusBadge>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-4">
                    <p className="text-sm text-[var(--muted)]">إجمالي الطلبات: {client.totalOrders}</p>
                    <Link
                      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                      href={`/dashboard/manager/client-orders/${client.client.uid}`}
                    >
                      فتح ملف العميل
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : null}

      {activeTab === "orders" && totalOrders === 0 && clients.length > 0 ? (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-sm text-[var(--muted)] shadow-card">
          يوجد عملاء مسجلون، لكن لم يتم إنشاء طلبات فحص من بوابة العميل حتى الآن.
        </p>
      ) : null}
    </DashboardShell>
  );
}
