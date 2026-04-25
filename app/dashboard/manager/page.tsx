import type { Metadata } from "next";
import { DashboardPlaceholder } from "@/components/layout/dashboard-placeholder";
import { i18n } from "@/lib/i18n";

export const metadata: Metadata = {
  title: i18n.dashboard.managerTitle,
};

export default function ManagerDashboardPage() {
  return <DashboardPlaceholder title={i18n.dashboard.managerTitle} />;
}
