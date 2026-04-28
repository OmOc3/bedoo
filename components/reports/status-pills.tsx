import { statusOptionLabels } from "@/lib/i18n";
import type { StatusOption } from "@/types";

interface StatusPillsProps {
  status: StatusOption[];
}

export function StatusPills({ status }: StatusPillsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {status.map((item) => (
        <span
          className="inline-flex items-center rounded-full bg-[var(--primary-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--primary)]"
          key={item}
        >
          {statusOptionLabels[item]}
        </span>
      ))}
    </div>
  );
}
