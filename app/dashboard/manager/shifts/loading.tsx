import { DashboardShell } from "@/components/layout/dashboard-page";

export default function Loading() {
  return (
    <DashboardShell role="manager">
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-64 rounded-2xl bg-[var(--surface-subtle)]" />
        <div className="grid grid-cols-4 gap-4">
          {[0,1,2,3].map((i) => <div key={i} className="h-20 rounded-2xl bg-[var(--surface-subtle)]" />)}
        </div>
        <div className="h-96 rounded-2xl bg-[var(--surface-subtle)]" />
      </div>
    </DashboardShell>
  );
}
