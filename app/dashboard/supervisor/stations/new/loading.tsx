import { AsyncRouteLoading } from "@/components/i18n/async-route-loading";

export default async function LoadingSupervisorNewStationPage() {
  return <AsyncRouteLoading messageKey="stationNewForm" />;
}
