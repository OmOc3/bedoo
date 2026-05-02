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
          className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300"
          key={item}
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-teal-400" />
          {statusOptionLabels[item]}
        </span>
      ))}
    </div>
  );
}
