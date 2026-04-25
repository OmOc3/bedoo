import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
import { i18n } from "@/lib/i18n";

export const metadata: Metadata = {
  title: i18n.auth.loginTitle,
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center px-4 py-6 sm:px-6">
      <section className="mx-auto w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--primary)] text-lg font-extrabold text-white shadow-control">
            {i18n.appName.slice(0, 1)}
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--primary-strong)]">{i18n.appName}</p>
            <h1 className="text-2xl font-extrabold text-[var(--foreground)]">{i18n.auth.loginTitle}</h1>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-control sm:p-6">
          <p className="mb-5 text-base leading-7 text-[var(--muted)]">{i18n.auth.loginSubtitle}</p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
