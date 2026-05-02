import type { Metadata } from "next";
import Link from "next/link";
import { CopyrightFooter } from "@/components/legal/copyright-footer";
import { BrandLockup } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { i18n } from "@/lib/i18n";

export const metadata: Metadata = {
  title: i18n.errors.accountDisabledTitle,
};

export default function AccountDisabledPage() {
  return (
    <main className="flex min-h-dvh items-center bg-[var(--background)] px-4 py-6 sm:px-6">
      <section className="mx-auto w-full max-w-md">
        <div className="mb-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <BrandLockup />
            <ThemeToggle />
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center shadow-card sm:p-6">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-xl bg-[var(--danger-soft)] text-2xl font-extrabold text-[var(--danger)]">
            🚫
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)]">{i18n.errors.accountDisabledTitle}</h1>
          <p className="mt-3 text-base leading-7 text-[var(--muted)]">{i18n.errors.accountDisabled}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">{i18n.errors.accountDisabledContact}</p>
          <Link
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-base font-bold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--surface-subtle)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
            href="/login"
          >
            {i18n.actions.backToLogin}
          </Link>
        </div>
        <CopyrightFooter className="px-0" />
      </section>
    </main>
  );
}
