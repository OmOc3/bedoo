import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { LogoutButton } from "@/components/auth/logout-button";
import { CopyrightFooter } from "@/components/legal/copyright-footer";
import { BrandLockup } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getCurrentSession } from "@/lib/auth/server-session";

export const metadata: Metadata = {
  title: "دخول العملاء",
};

export default async function ClientLoginPage() {
  const session = await getCurrentSession();
  if (session?.role === "client") {
    redirect("/client/portal");
  }

  return (
    <main className="grid min-h-dvh bg-[var(--background)] lg:grid-cols-[40%_60%]">
      <section className="brand-grid relative hidden min-h-dvh overflow-hidden bg-[var(--sidebar)] text-[var(--sidebar-text)] lg:flex lg:items-center lg:justify-center">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgb(20_184_166_/_0.22),transparent_34%),linear-gradient(180deg,rgb(255_255_255_/_0.05),transparent_48%)]" />
        <div className="relative z-10 mx-auto max-w-sm px-10 text-center">
          <BrandLockup className="mx-auto inline-flex justify-center" inverse />
          <div className="mt-8 space-y-3">
            <p className="text-sm font-semibold text-teal-300">بوابة العملاء</p>
            <h1 className="text-3xl font-bold tracking-tight text-[var(--sidebar-text)]">دخول العميل</h1>
            <p className="text-sm leading-7 text-[var(--sidebar-muted)]">ادخل بحساب العميل فقط لمتابعة طلباتك وتقارير محطاتك.</p>
          </div>
        </div>
      </section>

      <section className="flex min-h-dvh items-center px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 flex items-start justify-between gap-3 lg:hidden">
            <BrandLockup compact />
            <ThemeToggle />
          </div>
          <div className="hidden justify-end lg:mb-6 lg:flex">
            <ThemeToggle />
          </div>
          <div className="overflow-hidden rounded-2xl bg-[var(--surface)] shadow-card-lg">
            <div className="h-1 w-full bg-[var(--primary)]" />
            <div className="space-y-6 p-5 sm:p-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">تسجيل دخول العميل</h1>
                <p className="mt-2 text-sm leading-7 text-[var(--muted)]">هذه الصفحة مخصصة للعملاء فقط.</p>
              </div>
              {session ? (
                <div className="rounded-xl border border-[var(--danger-muted)] bg-[var(--danger-soft)] p-4">
                  <h2 className="text-base font-bold text-[var(--danger)]">هذا الحساب ليس حساب عميل</h2>
                  <p className="mt-2 text-sm leading-6 text-[var(--danger)]">
                    أنت مسجل دخول بحساب {session.user.displayName}. سجل الخروج ثم ادخل بحساب عميل حتى لا يتم توجيهك إلى صفحة الفريق.
                  </p>
                  <LogoutButton
                    buttonClassName="mt-4 !w-full"
                    className="w-full"
                    redirectTo="/client/login"
                  />
                </div>
              ) : (
                <LoginForm expectedRole="client" />
              )}
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 text-sm text-[var(--muted)]">
                لو حسابك إدارة أو فريق، استخدم{" "}
                <Link className="font-semibold text-teal-700 hover:underline" href="/login">
                  صفحة دخول الإدارة
                </Link>
                . أو{" "}
                <Link className="font-semibold text-teal-700 hover:underline" href="/client/signup">
                  أنشئ حساب عميل جديد
                </Link>
                .
              </div>
            </div>
          </div>
          <CopyrightFooter className="px-0" />
        </div>
      </section>
    </main>
  );
}
