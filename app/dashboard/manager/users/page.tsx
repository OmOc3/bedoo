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
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          action={
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-control transition-colors hover:bg-slate-50"
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
          <div className="rounded-2xl border border-slate-200 bg-white shadow-control">
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
                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-control" key={user.uid}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img alt={user.displayName} className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-slate-200" src={user.image} />
                      ) : (
                        <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-slate-100 text-lg font-bold text-slate-500 ring-1 ring-slate-200">
                          {getInitials(user.displayName)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold text-slate-950">{user.displayName}</h2>
                        <p className="truncate text-sm text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <span
                      className={
                        user.isActive
                          ? "inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700"
                          : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600"
                      }
                    >
                      {user.isActive ? "نشط" : "غير نشط"}
                    </span>
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <span className="text-sm text-slate-500">الدور</span>
                    <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">
                      {roleLabels[user.role]}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    <UserProfileForm user={{ uid: user.uid, displayName: user.displayName, image: user.image }} disabled={isCurrentUser} />
                    <UserRoleForm disabled={isCurrentUser} targetUid={user.uid} value={user.role} />
                    <form action={toggleActive}>
                      <button
                        className="inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                        disabled={isCurrentUser}
                        type="submit"
                      >
                        {user.isActive ? "تعطيل المستخدم" : "تفعيل المستخدم"}
                      </button>
                    </form>
                    <UserAccessCodeForm targetUid={user.uid} />
                    {isCurrentUser ? (
                      <p className="text-xs leading-5 text-slate-500">لا يمكنك تعطيل حسابك أو تغيير دورك الحالي.</p>
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
