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
import type { I18nMessages } from "@/lib/i18n";
import { getIntlLocaleForApp, getRoleLabels } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n";
import { getI18nMessages, getRequestLocale } from "@/lib/i18n/server";
import { listAppUsers } from "@/lib/db/repositories";
import type { AppTimestamp, AppUser, UserRole } from "@/types";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);
  return { title: t.teamPage.metaTitle };
}

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

function buildRoleGroups(t: I18nMessages): RoleGroupConfig[] {
  return [
    {
      description: t.teamPage.roleManagerDesc,
      label: t.teamPage.sectionManagers,
      role: "manager",
    },
    {
      description: t.teamPage.roleSupervisorDesc,
      label: t.teamPage.sectionSupervisors,
      role: "supervisor",
    },
    {
      description: t.teamPage.roleTechnicianDesc,
      label: t.teamPage.sectionTechnicians,
      role: "technician",
    },
  ];
}

function getInitials(name: string, fallback: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("");

  return initials || fallback;
}

function normalizeRoleFilter(value: string | undefined, roleOptions: StaffRole[]): StaffRole | "all" {
  return roleOptions.find((role) => role === value) ?? "all";
}

function normalizeStatusFilter(value: string | undefined): StatusFilter {
  return value === "active" || value === "inactive" ? value : "all";
}

function sortUsersForTeamView(users: AppUser[], locale: Locale): AppUser[] {
  return [...users].sort((first, second) => {
    if (first.isActive !== second.isActive) {
      return first.isActive ? -1 : 1;
    }

    return first.displayName.localeCompare(second.displayName, locale === "en" ? "en" : "ar");
  });
}

function userMatchesSearch(
  user: AppUser,
  query: string,
  roleLabelMap: ReturnType<typeof getRoleLabels>,
): boolean {
  if (!query) {
    return true;
  }

  const normalizedQuery = query.toLowerCase();

  return (
    user.displayName.toLowerCase().includes(normalizedQuery) ||
    user.email.toLowerCase().includes(normalizedQuery) ||
    user.uid.toLowerCase().includes(normalizedQuery) ||
    roleLabelMap[user.role].toLowerCase().includes(normalizedQuery)
  );
}

function UserAvatar({ fallback, user }: { fallback: string; user: AppUser }) {
  return user.image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={user.displayName} className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-[var(--border)]" src={user.image} />
  ) : (
    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--surface-subtle)] text-sm font-bold text-[var(--muted)] ring-1 ring-[var(--border)]">
      {getInitials(user.displayName, fallback)}
    </div>
  );
}

function UserStatus({ isActive, t }: { isActive: boolean; t: I18nMessages }) {
  return (
    <StatusBadge tone={isActive ? "active" : "inactive"}>
      {isActive ? t.teamPage.statusActive : t.teamPage.statusInactive}
    </StatusBadge>
  );
}

function RoleBadge({
  role,
  roleLabelMap,
}: {
  role: UserRole;
  roleLabelMap: ReturnType<typeof getRoleLabels>;
}) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]">
      {roleLabelMap[role]}
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

function UserTools({
  disabled,
  formatTs,
  t,
  user,
}: {
  disabled: boolean;
  formatTs: (timestamp?: AppTimestamp) => string;
  t: I18nMessages;
  user: AppUser;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(260px,1fr)_minmax(220px,0.8fr)_minmax(240px,0.9fr)]">
      <UserProfileForm embedded user={{ uid: user.uid, displayName: user.displayName, image: user.image }} disabled={disabled} />
      <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="text-sm font-bold text-[var(--foreground)]">{t.teamPage.roleAndAccess}</h3>
        <UserRoleForm disabled={disabled} targetUid={user.uid} value={user.role} />
        <UserActivateToggle disabled={disabled} displayName={user.displayName} isActive={user.isActive} targetUid={user.uid} />
        {!user.isActive && user.deactivatedAt ? (
          <p className="text-xs text-[var(--muted)]">
            {t.teamPage.lastDeactivated} {formatTs(user.deactivatedAt)}
            {user.deactivatedBy ? ` · ${t.teamPage.byPrefix} ${user.deactivatedBy}` : null}
          </p>
        ) : null}
        {disabled ? <p className="text-xs leading-5 text-[var(--muted)]">{t.teamPage.cannotSelfDeactivate}</p> : null}
      </div>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="text-sm font-bold text-[var(--foreground)]">{t.teamPage.accessCodeHeading}</h3>
        <UserAccessCodeForm targetUid={user.uid} />
        <p className="mt-3 text-xs text-[var(--muted)]">
          {t.teamPage.lastPasswordChange}{" "}
          {user.passwordChangedAt ? formatTs(user.passwordChangedAt) : t.common.unavailable}
        </p>
      </div>
      {user.role === "technician" ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 lg:col-span-3">
          <h3 className="text-sm font-bold text-[var(--foreground)]">{t.teamPage.workScheduleHeading}</h3>
          <p className="mt-2 text-xs leading-6 text-[var(--muted)]">{t.teamPage.workScheduleBlurb}</p>
          <Link
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface)] disabled:opacity-60"
            href={`/dashboard/manager/team/${user.uid}/schedule`}
          >
            {t.teamPage.manageScheduleLink}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

function RoleGroupSummary({
  activeCount,
  t,
  totalCount,
}: {
  activeCount: number;
  t: I18nMessages;
  totalCount: number;
}) {
  const inactiveCount = totalCount - activeCount;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span className="rounded-full bg-[var(--surface-subtle)] px-2.5 py-1 text-[var(--foreground)] ring-1 ring-[var(--border)]">
        {totalCount} {t.teamPage.accountWord}
      </span>
      <span className="rounded-full bg-green-100 px-2.5 py-1 text-green-800">
        {activeCount} {t.teamPage.statusActive}
      </span>
      {inactiveCount > 0 ? (
        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-600">
          {inactiveCount} {t.teamPage.statusInactive}
        </span>
      ) : null}
    </div>
  );
}

function UserManagementDetails({
  currentUid,
  formatTs,
  t,
  user,
}: {
  currentUid: string;
  formatTs: (timestamp?: AppTimestamp) => string;
  t: I18nMessages;
  user: AppUser;
}) {
  const isCurrentUser = user.uid === currentUid;

  return (
    <details className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition-colors">
      <summary className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-5 py-3 text-sm font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)] [&[open]]:rounded-b-none">
        {t.teamPage.manageUser} {user.displayName}
        <span className="text-[var(--muted)] transition-transform duration-150 group-open:-rotate-180">
          <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-[var(--border-subtle)] p-5">
        <UserTools disabled={isCurrentUser} formatTs={formatTs} t={t} user={user} />
      </div>
    </details>
  );
}

function UsersTable({
  currentUid,
  formatTs,
  initialsFallback,
  t,
  users,
}: {
  currentUid: string;
  formatTs: (timestamp?: AppTimestamp) => string;
  initialsFallback: string;
  t: I18nMessages;
  users: AppUser[];
}) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] lg:block">
      <table className="w-full min-w-[920px]">
        <thead className="border-b border-[var(--border-subtle)] bg-[var(--surface-subtle)]">
          <tr>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">{t.teamPage.colUser}</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">{t.teamPage.colStatus}</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">{t.teamPage.colCreated}</th>
            <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted)]">UID</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--border-subtle)]">
          {users.map((user) => (
            <Fragment key={user.uid}>
              <tr className="align-top transition-colors hover:bg-[var(--surface-subtle)]">
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <UserAvatar fallback={initialsFallback} user={user} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-[var(--foreground)]">{user.displayName}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <UserStatus isActive={user.isActive} t={t} />
                </td>
                <td className="px-4 py-3 text-sm text-[var(--muted)]">{formatTs(user.createdAt)}</td>
                <td className="px-4 py-3 text-xs text-[var(--muted)]" dir="ltr">
                  {user.uid}
                </td>
              </tr>
              <tr className="bg-[var(--surface-subtle)]/50">
                <td className="px-5 py-3" colSpan={4}>
                  <UserManagementDetails currentUid={currentUid} formatTs={formatTs} t={t} user={user} />
                </td>
              </tr>
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileUserCard({
  currentUid,
  formatTs,
  initialsFallback,
  roleLabelMap,
  t,
  user,
}: {
  currentUid: string;
  formatTs: (timestamp?: AppTimestamp) => string;
  initialsFallback: string;
  roleLabelMap: ReturnType<typeof getRoleLabels>;
  t: I18nMessages;
  user: AppUser;
}) {
  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm" key={user.uid}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar fallback={initialsFallback} user={user} />
          <div className="min-w-0">
            <h3 className="truncate text-base font-bold text-[var(--foreground)]">{user.displayName}</h3>
            <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
          </div>
        </div>
        <UserStatus isActive={user.isActive} t={t} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--muted)]">
        <RoleBadge role={user.role} roleLabelMap={roleLabelMap} />
        <span>
          {t.teamPage.createdPrefix} {formatTs(user.createdAt)}
        </span>
      </div>
      <div className="mt-5">
        <UserManagementDetails currentUid={currentUid} formatTs={formatTs} t={t} user={user} />
      </div>
    </article>
  );
}

function RoleSection({
  currentUid,
  formatTs,
  group,
  initialsFallback,
  roleLabelMap,
  t,
  users,
}: {
  currentUid: string;
  formatTs: (timestamp?: AppTimestamp) => string;
  group: RoleGroupConfig;
  initialsFallback: string;
  roleLabelMap: ReturnType<typeof getRoleLabels>;
  t: I18nMessages;
  users: AppUser[];
}) {
  const activeCount = users.filter((user) => user.isActive).length;

  return (
    <section className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">{group.label}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{group.description}</p>
        </div>
        <RoleGroupSummary activeCount={activeCount} t={t} totalCount={users.length} />
      </div>
      <UsersTable currentUid={currentUid} formatTs={formatTs} initialsFallback={initialsFallback} t={t} users={users} />
      <div className="grid gap-3 lg:hidden">
        {users.map((user) => (
          <MobileUserCard
            currentUid={currentUid}
            formatTs={formatTs}
            initialsFallback={initialsFallback}
            key={user.uid}
            roleLabelMap={roleLabelMap}
            t={t}
            user={user}
          />
        ))}
      </div>
    </section>
  );
}

export default async function ManagerUsersPage({ searchParams }: ManagerUsersPageProps) {
  const locale = await getRequestLocale();
  const t = getI18nMessages(locale);
  const intlLocale = getIntlLocaleForApp(locale);
  const roleLabelMap = getRoleLabels(locale);
  const roleGroups = buildRoleGroups(t);
  const roleOptions = roleGroups.map((group) => group.role);

  function formatTs(timestamp?: AppTimestamp): string {
    if (!timestamp) {
      return t.common.unavailable;
    }

    return formatDateTimeRome(timestamp.toDate(), {
      locale: intlLocale,
      unavailableLabel: t.common.unavailable,
    });
  }

  const session = await requireRole(["manager"]);
  const params = await searchParams;
  const allUsers = await listAppUsers();
  const users = allUsers.filter((user) => user.role !== "client");
  const query = (params.q ?? "").trim();
  const roleFilter = normalizeRoleFilter(params.role, roleOptions);
  const statusFilter = normalizeStatusFilter(params.status);
  const filteredUsers = sortUsersForTeamView(users, locale).filter((user) => {
    const roleMatches = roleFilter === "all" || user.role === roleFilter;
    const statusMatches =
      statusFilter === "all" || (statusFilter === "active" ? user.isActive : !user.isActive);

    return roleMatches && statusMatches && userMatchesSearch(user, query, roleLabelMap);
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

  const initialsFallback = t.teamPage.initialsFallback;

  return (
    <DashboardShell role="manager">
      <PageHeader
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              href="/dashboard/manager"
            >
              {t.teamPage.managerBoardLink}
            </Link>
          </div>
        }
        backHref="/dashboard/manager"
        description={t.teamPage.managerDescription}
        title={t.teamPage.pageTitle}
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <StatTile label={t.teamPage.statTotalUsers} value={users.length} />
        <StatTile label={t.teamPage.statActiveAccounts} value={activeUsers} />
        <StatTile label={t.teamPage.statInactiveAccounts} value={inactiveUsers} />
        <StatTile label={t.teamPage.statManagers} value={managerUsers} />
        <StatTile label={t.teamPage.statSupervisors} value={supervisorUsers} />
        <StatTile label={t.teamPage.statTechnicians} value={technicianUsers} />
      </section>

      <details className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm transition-colors">
        <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl px-5 py-3 text-sm font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)] [&[open]]:rounded-b-none">
          {t.teamPage.createUserToggle}
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
            {t.teamPage.searchLabel}
          </label>
          <input
            className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-control focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            defaultValue={query}
            id="users-search"
            name="q"
            placeholder={t.teamPage.searchPlaceholder}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[var(--muted)]" htmlFor="users-role">
            {t.teamPage.roleFilter}
          </label>
          <select
            className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-control focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            defaultValue={roleFilter}
            id="users-role"
            name="role"
          >
            <option value="all">{t.teamPage.allRoles}</option>
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {roleLabelMap[role]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[var(--muted)]" htmlFor="users-status">
            {t.teamPage.statusFilter}
          </label>
          <select
            className="min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] shadow-control focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            defaultValue={statusFilter}
            id="users-status"
            name="status"
          >
            <option value="all">{t.teamPage.allStatuses}</option>
            <option value="active">{t.teamPage.statusActive}</option>
            <option value="inactive">{t.teamPage.statusInactive}</option>
          </select>
        </div>
        <div className="flex items-end gap-3">
          <button
            className="min-h-11 rounded-lg bg-[var(--primary)] px-6 py-2 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-colors hover:bg-[var(--primary-hover)]"
            type="submit"
          >
            {t.teamPage.applyFilters}
          </button>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg border border-[var(--border)] px-5 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]"
            href="/dashboard/manager/team"
          >
            {t.teamPage.clearFilters}
          </Link>
        </div>
      </form>

      {visibleGroups.length === 0 ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-control">
          <EmptyState description={t.teamPage.emptyResultsDescription} title={t.teamPage.emptyResultsTitle} />
        </div>
      ) : (
        <div className="space-y-5">
          {visibleGroups.map((group) => (
            <RoleSection
              currentUid={session.uid}
              formatTs={formatTs}
              group={group}
              initialsFallback={initialsFallback}
              key={group.role}
              roleLabelMap={roleLabelMap}
              t={t}
              users={group.users}
            />
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
