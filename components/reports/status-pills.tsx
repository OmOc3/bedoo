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
          className="inline-flex items-center rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-medium text-teal-700"
          key={item}
        >
          {statusOptionLabels[item]}
        </span>
      ))}
    </div>
  );
}
