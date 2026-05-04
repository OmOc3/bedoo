import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyrightFooter } from "@/components/legal/copyright-footer";
import { BrandLockup } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getRoleRedirect } from "@/lib/auth/redirects";
import { getCurrentSession } from "@/lib/auth/server-session";
import { getLocaleDirection } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

export default async function HomePage() {
  const session = await getCurrentSession();

  if (session) {
    redirect(getRoleRedirect(session.role));
  }

  const locale = await getRequestLocale();
  const direction = getLocaleDirection(locale);
  const copy =
    locale === "en"
      ? {
          adminLogin: "Admin and team sign in",
          clientLogin: "Client sign in",
          subtitle: "The client portal is separate from administration. Choose the right path for your account type.",
          title: "Choose sign-in type",
        }
      : {
          adminLogin: "دخول الإدارة والفريق",
          clientLogin: "دخول العملاء",
          subtitle: "تم فصل بوابة العملاء عن الإدارة. اختر المسار المناسب حسب نوع حسابك.",
          title: "اختر نوع الدخول",
        };

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-8 text-start sm:px-6 lg:px-8" dir={direction}>
      <section className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-3">
          <BrandLockup />
          <ThemeToggle />
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-card">
          <h1 className="text-2xl font-extrabold text-[var(--foreground)]">{copy.title}</h1>
          <p className="mt-2 text-sm leading-7 text-[var(--muted)]">{copy.subtitle}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
              href="/login"
            >
              {copy.adminLogin}
            </Link>
            <Link
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)]"
              href="/client/login"
            >
              {copy.clientLogin}
            </Link>
          </div>
        </div>
        <CopyrightFooter className="px-0" />
      </section>
    </main>
  );
}
