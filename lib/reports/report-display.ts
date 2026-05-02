import { pestTypeLabels } from "@/lib/i18n";
import type { Report } from "@/types";

export function formatPestTypesLine(report: Report): string {
  if (!report.pestTypes?.length) {
    return "—";
  }

  return report.pestTypes.map((p) => pestTypeLabels[p]).join("، ");
}
