import { AsyncRouteLoading } from "@/components/i18n/async-route-loading";

export default async function LoadingSupervisorClientProfilePage() {
  return <AsyncRouteLoading messageKey="clientProfile" />;
}
