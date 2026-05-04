import { AsyncRouteLoading } from "@/components/i18n/async-route-loading";

export default async function LoadingSupervisorAttendancePage() {
  return <AsyncRouteLoading messageKey="attendanceRecords" />;
}
