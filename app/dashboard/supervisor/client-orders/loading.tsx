import { AsyncRouteLoading } from "@/components/i18n/async-route-loading";

export default async function LoadingSupervisorClientOrdersPage() {
  return <AsyncRouteLoading messageKey="clientOrders" />;
}
