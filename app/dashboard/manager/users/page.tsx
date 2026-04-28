import type { Metadata } from "next";
import Link from "next/link";
import { toggleUserActiveAction } from "@/app/actions/users";
import { DashboardNav } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { CreateUserForm } from "@/components/users/create-user-form";
import { UserAccessCodeForm } from "@/components/users/user-access-code-form";
import { UserRoleForm } from "@/components/users/user-role-form";
import { UserProfileForm } from "@/components/users/user-profile-form";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/server-session";
import { listAppUsers } from "@/lib/db/repositories";
import { roleLabels } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "إدارة المستخدمين",
};

function getInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0] ?? "")
    .join("");

  return initials || "م";
}

export default async function ManagerUsersPage() {
  const session = await requireRole(["manager"]);
  const users = await listAppUsers();

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          action={
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-5 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--surface-subtle)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
              href="/dashboard/manager"
            >
              لوحة المدير
            </Link>
          }
          backHref="/dashboard/manager"
          description="إنشاء المستخدمين، تفعيلهم، وتعديل أدوارهم من خلال الباك اند."
          title="إدارة المستخدمين"
        />
        <DashboardNav role="manager" />

        <CreateUserForm />

        {users.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-card">
            <EmptyState description="ابدأ بإنشاء أول مستخدم من النموذج أعلاه." title="لا يوجد مستخدمون" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {users.map((user) => {
              const isCurrentUser = user.uid === session.uid;

              async function toggleActive(): Promise<void> {
                "use server";
                await toggleUserActiveAction(user.uid);
              }

              return (
                <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card" key={user.uid}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={user.displayName} className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-[var(--border)]" src={user.image} />
                      ) : (
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--surface-subtle)] text-lg font-bold text-[var(--muted)] ring-1 ring-[var(--border)]">
                          {getInitials(user.displayName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-[var(--foreground)]">{user.displayName}</h2>
                        <p className="truncate text-sm text-[var(--muted)]">{user.email}</p>
                      </div>
                    </div>
                    <span
                      className={
                        user.isActive
                          ? "inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
                            : "inline-flex items-center rounded-full bg-[var(--surface-subtle)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)] dark:bg-[var(--surface-elevated)]"
                      }
                    >
                      {user.isActive ? "نشط" : "غير نشط"}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-subtle)] px-4 py-3">
                    <span className="text-sm text-[var(--muted)]">الدور</span>
                    <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                      {roleLabels[user.role]}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <UserProfileForm user={{ uid: user.uid, displayName: user.displayName, image: user.image }} disabled={isCurrentUser} />
                    <UserRoleForm disabled={isCurrentUser} targetUid={user.uid} value={user.role} />
                    <form action={toggleActive}>
                      <button
                        className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--surface-subtle)] active:scale-[0.98] disabled:cursor-not-allowed disabled:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                        disabled={isCurrentUser}
                        type="submit"
                      >
                        {user.isActive ? "تعطيل المستخدم" : "تفعيل المستخدم"}
                      </button>
                    </form>
                    <UserAccessCodeForm targetUid={user.uid} />
                    {isCurrentUser ? (
                      <p className="text-xs leading-5 text-[var(--muted)]">لا يمكنك تعطيل حسابك أو تغيير دورك الحالي.</p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
