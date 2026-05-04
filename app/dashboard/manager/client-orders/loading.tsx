import { AsyncRouteLoading } from "@/components/i18n/async-route-loading";

export default async function LoadingManagerClientOrdersPage() {
  return <AsyncRouteLoading messageKey="clientOrders" />;
}
