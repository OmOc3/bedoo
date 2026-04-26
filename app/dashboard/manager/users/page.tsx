import type { Metadata } from "next";
import Link from "next/link";
import { toggleUserActiveAction } from "@/app/actions/users";
import { DashboardNav } from "@/components/layout/nav";
import { PageHeader } from "@/components/layout/page-header";
import { CreateUserForm } from "@/components/users/create-user-form";
import { UserRoleForm } from "@/components/users/user-role-form";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/lib/auth/server-session";
import { USERS_COL } from "@/lib/collections";
import { adminDb } from "@/lib/firebase-admin";
import { roleLabels } from "@/lib/i18n";
import type { AppUser, FirestoreTimestamp } from "@/types";

export const metadata: Metadata = {
  title: "إدارة المستخدمين",
};

function userFromData(uid: string, data: Partial<AppUser>): AppUser {
  return {
    uid: data.uid ?? uid,
    email: data.email ?? "",
    displayName: data.displayName ?? "مستخدم بدون اسم",
    role: data.role ?? "technician",
    createdAt: data.createdAt as FirestoreTimestamp,
    isActive: data.isActive ?? false,
  };
}

export default async function ManagerUsersPage() {
  const session = await requireRole(["manager"]);
  const snapshot = await adminDb().collection(USERS_COL).orderBy("displayName", "asc").get();
  const users = snapshot.docs.map((doc) => userFromData(doc.id, doc.data() as Partial<AppUser>));

  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-6 text-right sm:px-6 lg:px-8" dir="rtl">
      <section className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          action={
            <Link
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
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
          <div className="rounded-xl border border-slate-200 bg-white">
            <EmptyState description="ابدأ بإنشاء أول مستخدم من النموذج أعلاه." title="لا يوجد مستخدمون" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[920px]">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    الاسم
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    البريد
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    الدور
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-500">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => {
                  const isCurrentUser = user.uid === session.uid;

                  async function toggleActive(): Promise<void> {
                    "use server";
                    await toggleUserActiveAction(user.uid);
                  }

                  return (
                    <tr className="align-top transition-colors hover:bg-slate-50" key={user.uid}>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900">{user.displayName}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{user.email}</td>
                      <td className="px-4 py-3">
                        <div className="mb-2">
                          <span className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700">
                            {roleLabels[user.role]}
                          </span>
                        </div>
                        <UserRoleForm disabled={isCurrentUser} targetUid={user.uid} value={user.role} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            user.isActive
                              ? "inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700"
                              : "inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
                          }
                        >
                          {user.isActive ? "نشط" : "غير نشط"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <form action={toggleActive}>
                          <button
                            className="text-sm font-medium text-slate-500 transition-colors hover:text-slate-900 hover:underline disabled:cursor-not-allowed disabled:text-slate-300 disabled:no-underline"
                            disabled={isCurrentUser}
                            type="submit"
                          >
                            {user.isActive ? "تعطيل" : "تفعيل"}
                          </button>
                        </form>
                        {isCurrentUser ? <p className="mt-2 text-xs text-slate-500">لا يمكنك تعديل حسابك الحالي.</p> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
