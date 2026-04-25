import type { Metadata } from "next";
import { DashboardPlaceholder } from "@/components/layout/dashboard-placeholder";
import { i18n } from "@/lib/i18n";

export const metadata: Metadata = {
  title: i18n.dashboard.supervisorTitle,
};

export default function SupervisorDashboardPage() {
  return <DashboardPlaceholder title={i18n.dashboard.supervisorTitle} />;
}
