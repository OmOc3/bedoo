import { DashboardShell } from "@/components/layout/dashboard-page";

export default function ManagerPayrollLoading() {
  return (
    <DashboardShell role="manager">
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-40 rounded bg-[var(--border)]" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div className="h-24 rounded-xl bg-[var(--surface)]" key={index} />
          ))}
        </div>
        <div className="h-36 rounded-xl bg-[var(--surface)]" />
        <div className="h-60 rounded-xl bg-[var(--surface)]" />
      </div>
    </DashboardShell>
  );
}
