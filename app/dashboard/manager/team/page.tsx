import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { DashboardShell } from "@/components/layout/dashboard-page";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { CreateUserForm } from "@/components/users/create-user-form";
import { UserAccessCodeForm } from "@/components/users/user-access-code-form";
import { UserProfileForm } from "@/components/users/user-profile-form";
import { UserActivateToggle } from "@/components/users/user-activate-toggle";
import { UserRoleForm } from "@/components/users/user-role-form";
import { requireRole } from "@/lib/auth/server-session";
import { formatDateTimeRome } from "@/lib/datetime";
import { roleLabels } from "@/lib/i18n";
import { listAppUsers } from "@/lib/db/repositories";
import type { AppTimestamp, AppUser, UserRole } from "@/types";

export const metadata: Metadata = {
  title: "الفريق",
};

interface ManagerUsersPageProps {
  searchParams: Promise<{
    q?: string;
    role?: string;
    status?: string;
  }>;
}

type StatusFilter = "active" | "all" | "inactive";
type StaffRole = Exclude<UserRole, "client">;

interface RoleGroupConfig {
  description: string;
  label: string;
  role: StaffRole;
}

const roleGroups: RoleGroupConfig[] = [
  {
    description: "صلاحيات كاملة لإدارة النظام والمراجعة والتقارير.",
    label: "المدراء",
    role: "manager",
  },
  {
    description: "متابعة التشغيل اليومي ومراجعة البلاغات والطلبات.",
    label: "المشرفون",
    role: "supervisor",
  },
  {
    description: "فرق الزيارات الميدانية والمسح وتسجيل التقارير.",
    label: "الفنيون",
    role: "technician",
  },
];

const roleOptions = roleGroups.map((group) => group.role);

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("");

  return initials || "م";
}

function formatTimestamp(timestamp?: AppTimestamp): string {
  if (!timestamp) {
    return "غير متاح";
  }

  return formatDateTimeRome(timestamp.toDate(), { locale: "ar-EG" });
}

function normalizeRoleFilter(value: string | undefined): StaffRole | "all" {
  return roleOptions.find((role) => role === value) ?? "all";
}

function normalizeStatusFilter(value: string | undefined): StatusFilter {
  return value === "active" || value === "inactive" ? value : "all";
}

function sortUsersForTeamView(users: AppUser[]): AppUser[] {
  return [...users].sort((first, second) => {
    if (first.isActive !== second.isActive) {
      return first.isActive ? -1 : 1;
    }

    return first.displayName.localeCompare(second.displayName, "ar");
  });
}

function userMatchesSearch(user: AppUser, query: string): boolean {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();

  return (
    user.displayName.toLowerCase().includes(normalizedQuery) ||
    user.email.toLowerCase().includes(normalizedQuery) ||
    user.uid.toLowerCase().includes(normalizedQuery) ||
    roleLabels[user.role].toLowerCase().includes(normalizedQuery)
  );
}

function UserAvatar({ user }: { user: AppUser }) {
  return user.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={user.displayName} className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-[var(--border)]" src={user.image} />
  ) : (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--surface-subtle)] text-sm font-bold text-[var(--muted)] ring-1 ring-[var(--border)]">
      {getInitials(user.displayName)}
    </div>
  );
}

function UserStatus({ isActive }: { isActive: boolean }) {
  return <StatusBadge tone={isActive ? "active" : "inactive"}>{isActive ? "نشط" : "غير نشط"}</StatusBadge>;
}

function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]">
      {roleLabels[role]}
    </span>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 shadow-sm">
      <p className="text-sm font-medium text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function UserTools({ disabled, user }: { disabled: boolean; user: AppUser }) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(220px,0.8fr)_minmax(240px,0.9fr)]">
      <UserProfileForm embedded user={{ uid: user.uid, displayName: user.displayName, image: user.image }} disabled={disabled} />
      <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="text-sm font-bold text-[var(--foreground)]">الدور والحالة</h3>
        <UserRoleForm disabled={disabled} targetUid={user.uid} value={user.role} />
        <UserActivateToggle disabled={disabled} displayName={user.displayName} isActive={user.isActive} targetUid={user.uid} />
        {!user.isActive && user.deactivatedAt ? (
          <p className="text-xs text-[var(--muted)]">
            آخر تعطيل: {formatTimestamp(user.deactivatedAt)}
            {user.deactivatedBy ? ` · بواسطة: ${user.deactivatedBy}` : null}
          </p>
        ) : null}
        {disabled ? <p className="text-xs leading-5 text-[var(--muted)]">لا يمكنك تعطيل حسابك أو تغيير دورك الحالي.</p> : null}
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="text-sm font-bold text-[var(--foreground)]">كود الدخول</h3>
        <UserAccessCodeForm targetUid={user.uid} />
        <p className="mt-3 text-xs text-[var(--muted)]">
          آخر تغيير: {user.passwordChangedAt ? formatTimestamp(user.passwordChangedAt) : "غير متاح"}
        </p>
      </div>
      {user.role === "technician" ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 lg:col-span-3">
          <h3 className="text-sm font-bold text-[var(--foreground)]">جدول العمل</h3>
          <p className="mt-2 text-xs leading-6 text-[var(--muted)]">
            تحديد أوقات عمل الفني والساعات المسموح له بتسجيل حضوره فيها.
          </p>
          <Link
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface)] disabled:opacity-60"
            href={`/dashboard/manager/team/${user.uid}/schedule`}
          >
            إدارة جدول العمل
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function RoleGroupSummary({ activeCount, totalCount }: { activeCount: number; totalCount: number }) {
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-[var(--foreground)] ring-1 ring-[var(--border)]">
        {totalCount} حساب
      </span>
      <span className="rounded-full bg-green-100 px-2.5 py-1 text-green-800">
        {activeCount} نشط
      </span>
      {inactiveCount > 0 ? (
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
          {inactiveCount} غير نشط
        </span>
      ) : null}
    </div>
  );
}

function UserManagementDetails({ currentUid, user }: { currentUid: string; user: AppUser }) {
  const isCurrentUser = user.uid === currentUid;

  return (
    <details className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition-colors">
      <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-5 py-3 text-sm font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)] [&[open]]:rounded-b-none">
        إدارة حساب {user.displayName}
        <span className="text-[var(--muted)] transition-transform duration-150 group-open:-rotate-180">
          <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-[var(--border-subtle)] p-5">
        <UserTools disabled={isCurrentUser} user={user} />
      </div>
    </details>
  );
}

function UsersTable({ currentUid, users }: { currentUid: string; users: AppUser[] }) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] lg:block">
      <table className="w-full min-w-[920px]">
        <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
          <tr>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">المستخدم</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">الحالة</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">تاريخ الإنشاء</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">UID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {users.map((user) => (
            <Fragment key={user.uid}>
              <tr className="align-top transition-colors hover:bg-[var(--surface-subtle)]">
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--foreground)]">{user.displayName}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3"><UserStatus isActive={user.isActive} /></td>
                <td className="px-4 py-3 text-sm text-[var(--muted)]">{formatTimestamp(user.createdAt)}</td>
                <td className="px-4 py-3 text-xs text-[var(--muted)]" dir="ltr">{user.uid}</td>
              </tr>
              <tr className="bg-[var(--surface-subtle)]/50">
                <td className="px-5 py-3" colSpan={4}>
                  <UserManagementDetails currentUid={currentUid} user={user} />
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileUserCard({ currentUid, user }: { currentUid: string; user: AppUser }) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm" key={user.uid}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar user={user} />
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-[var(--foreground)]">{user.displayName}</h3>
            <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
          </div>
        </div>
        <UserStatus isActive={user.isActive} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <RoleBadge role={user.role} />
        <span>إنشاء: {formatTimestamp(user.createdAt)}</span>
      </div>
      <div className="mt-5">
        <UserManagementDetails currentUid={currentUid} user={user} />
      </div>
    </article>
  );
}

function RoleSection({ currentUid, group, users }: { currentUid: string; group: RoleGroupConfig; users: AppUser[] }) {
  const activeCount = users.filter((user) => user.isActive).length;

  return (
    <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">{group.label}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{group.description}</p>
        </div>
        <RoleGroupSummary activeCount={activeCount} totalCount={users.length} />
      </div>
      <UsersTable currentUid={currentUid} users={users} />
      <div className="grid gap-3 lg:hidden">
        {users.map((user) => (
          <MobileUserCard currentUid={currentUid} key={user.uid} user={user} />
        ))}
      </div>
    </section>
  );
}

export default async function ManagerUsersPage({ searchParams }: ManagerUsersPageProps) {
  const session = await requireRole(["manager"]);
  const params = await searchParams;
  const allUsers = await listAppUsers();
  const users = allUsers.filter((user) => user.role !== "client");
  const query = (params.q ?? "").trim();
  const roleFilter = normalizeRoleFilter(params.role);
  const statusFilter = normalizeStatusFilter(params.status);
  const filteredUsers = sortUsersForTeamView(users).filter((user) => {
    const roleMatches = roleFilter === "all" || user.role === roleFilter;
    const statusMatches =
      statusFilter === "all" || (statusFilter === "active" ? user.isActive : !user.isActive);

    return roleMatches && statusMatches && userMatchesSearch(user, query);
  });
  const activeUsers = users.filter((user) => user.isActive).length;
  const inactiveUsers = users.length - activeUsers;
  const technicianUsers = users.filter((user) => user.role === "technician").length;
  const supervisorUsers = users.filter((user) => user.role === "supervisor").length;
  const managerUsers = users.filter((user) => user.role === "manager").length;
  const visibleGroups = roleGroups
    .map((group) => ({
      ...group,
      users: filteredUsers.filter((user) => user.role === group.role),
    }))
    .filter((group) => group.users.length > 0);

  return (
    <DashboardShell role="manager">
      <PageHeader
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--primary)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-colors hover:bg-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              href="/client/signup"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg aria-hidden="true" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              إنشاء حساب عميل
            </Link>
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              href="/dashboard/manager"
            >
              لوحة المدير
            </Link>
          </div>
        }
        backHref="/dashboard/manager"
        description="إدارة الفريق مقسمة حسب الدور مع البحث والتصفية وتحديث الحسابات من نفس المكان."
        title="الفريق"
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatTile label="إجمالي المستخدمين" value={users.length} />
        <StatTile label="حسابات نشطة" value={activeUsers} />
        <StatTile label="حسابات غير نشطة" value={inactiveUsers} />
        <StatTile label="مدراء" value={managerUsers} />
        <StatTile label="مشرفون" value={supervisorUsers} />
        <StatTile label="فنيون" value={technicianUsers} />
      </section>

      <details className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition-colors">
        <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl px-5 py-3 text-sm font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)] [&[open]]:rounded-b-none">
          إنشاء مستخدم جديد
          <span className="text-xs font-semibold text-[var(--muted)] transition-transform duration-150 group-open:-rotate-180">
            <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </summary>
        <div className="border-t border-[var(--border-subtle)] p-5">
          <CreateUserForm embedded />
        </div>
      </details>

      <form action="/dashboard/manager/team" className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm lg:grid-cols-[minmax(260px,1fr)_180px_180px_auto]">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[var(--muted)]" htmlFor="users-search">
            البحث
          </label>
          <input
            className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-control focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            defaultValue={query}
            id="users-search"
            name="q"
            placeholder="الاسم، البريد، الدور، أو UID"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[var(--muted)]" htmlFor="users-role">
            الدور
          </label>
          <select
            className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-control focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            defaultValue={roleFilter}
            id="users-role"
            name="role"
          >
            <option value="all">كل الأدوار</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {roleLabels[role]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[var(--muted)]" htmlFor="users-status">
            الحالة
          </label>
          <select
            className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-control focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            defaultValue={statusFilter}
            id="users-status"
            name="status"
          >
            <option value="all">كل الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
          </select>
        </div>
        <div className="flex items-end gap-3">
          <button className="min-h-11 rounded-lg bg-[var(--primary)] px-6 py-2 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-colors hover:bg-[var(--primary-hover)]" type="submit">
            تطبيق
          </button>
          <Link className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] px-5 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]" href="/dashboard/manager/team">
            مسح
          </Link>
        </div>
      </form>

      {visibleGroups.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-control">
          <EmptyState description="غيّر البحث أو أضف مستخدمًا جديدًا من أعلى الصفحة." title="لا توجد نتائج مطابقة" />
        </div>
      ) : (
        <div className="space-y-5">
          {visibleGroups.map((group) => (
            <RoleSection currentUid={session.uid} group={group} key={group.role} users={group.users} />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
