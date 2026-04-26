import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { CopyrightFooter } from "@/components/legal/copyright-footer";
import { BrandLockup } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { i18n } from "@/lib/i18n";

export const metadata: Metadata = {
  title: i18n.auth.loginTitle,
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center px-4 py-6 sm:px-6">
      <section className="mx-auto w-full max-w-md">
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-control sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <BrandLockup />
            <ThemeToggle />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-[var(--foreground)]">{i18n.auth.loginTitle}</h1>
          <p className="mt-2 text-base leading-7 text-[var(--muted)]">{i18n.auth.loginSubtitle}</p>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-control sm:p-6">
          <LoginForm />
        </div>
        <CopyrightFooter className="px-0" />
      </section>
    </main>
  );
}
