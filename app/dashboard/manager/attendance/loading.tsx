import { AsyncRouteLoading } from "@/components/i18n/async-route-loading";

export default async function LoadingManagerAttendancePage() {
  return <AsyncRouteLoading messageKey="attendanceRecords" />;
}
