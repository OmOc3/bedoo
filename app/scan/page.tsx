import type { Metadata } from "next";
import Link from "next/link";
import { i18n } from "@/lib/i18n";

export const metadata: Metadata = {
  title: i18n.scan.title,
};

export default function ScanInstructionsPage() {
  return (
    <main className="flex min-h-dvh items-center px-4 py-6 sm:px-6">
      <section className="mx-auto w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-control sm:p-6">
        <div className="mb-5 grid h-14 w-14 grid-cols-2 gap-1 rounded-xl bg-[var(--primary-soft)] p-3">
          <span className="rounded-sm bg-[var(--primary-strong)]" />
          <span className="rounded-sm bg-[var(--primary-strong)] opacity-65" />
          <span className="rounded-sm bg-[var(--primary-strong)] opacity-65" />
          <span className="rounded-sm border-2 border-[var(--primary-strong)]" />
        </div>
        <h1 className="text-2xl font-extrabold text-[var(--foreground)]">{i18n.scan.title}</h1>
        <p className="mt-3 text-base leading-7 text-[var(--muted)]">{i18n.scan.subtitle}</p>
        <p className="mt-3 rounded-lg bg-[var(--surface-subtle)] px-4 py-3 text-sm font-bold text-[var(--foreground)]">
          {i18n.scan.phaseNotice}
        </p>
        <div className="mt-6">
          <Link
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-3 text-base font-bold text-white shadow-control transition hover:bg-[var(--primary-strong)]"
            href="/login"
          >
            {i18n.scan.loginCta}
          </Link>
        </div>
      </section>
    </main>
  );
}
