import { AsyncRouteLoading } from "@/components/i18n/async-route-loading";

export default async function LoadingAreaScanPage() {
  return <AsyncRouteLoading messageKey="areaScanTask" />;
}
