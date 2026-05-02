import { LogoutButton } from "@/components/auth/logout-button";
import { i18n } from "@/lib/i18n";

interface DashboardPlaceholderProps {
  title: string;
}

export function DashboardPlaceholder({ title }: DashboardPlaceholderProps) {
  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-6 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100dvh-2.5rem)] w-full max-w-4xl flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex w-fit rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
              {i18n.dashboard.phaseBadge}
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--foreground)]">{title}</h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--muted)]">{i18n.dashboard.placeholderBody}</p>
          </div>
          <div className="w-full sm:w-44">
            <LogoutButton />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
            <p className="text-sm font-bold text-[var(--muted)]">{i18n.dashboard.protectedRoute}</p>
            <p className="mt-2 text-lg font-extrabold text-[var(--foreground)]">{i18n.dashboard.securityReady}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card">
            <p className="text-sm font-bold text-[var(--muted)]">{i18n.dashboard.phaseBadge}</p>
            <p className="mt-2 text-lg font-extrabold text-[var(--foreground)]">{i18n.dashboard.authReady}</p>
          </div>
        </div>
      </section>
    </main>
  );
}
