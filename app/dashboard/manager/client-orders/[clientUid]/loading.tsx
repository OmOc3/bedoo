import { AsyncRouteLoading } from "@/components/i18n/async-route-loading";

export default async function LoadingManagerClientProfilePage() {
  return <AsyncRouteLoading messageKey="clientProfile" />;
}
