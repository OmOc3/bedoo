import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import {
  mobileAttendanceSessionResponse,
  mobileClientOrderResponse,
  mobileReportResponse,
  mobileStationResponse,
  type MobileClientOrderResponse,
  type MobileReportResponse,
  type MobileStationResponse,
} from "@/lib/api/mobile-serializers";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { createClientOrderSchema } from "@/lib/validation/client-orders";
import {
  createClientOrder,
  getStationLocations,
  listAttendanceSessionsForClient,
  listClientOrders,
  listClientOrdersForClient,
  listOrderedStationsForClient,
  listReportsForClientOrderedStations,
} from "@/lib/db/repositories";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

interface MobileClientOrdersResponse {
  orders: MobileClientOrderResponse[];
  attendanceSessions?: ReturnType<typeof mobileAttendanceSessionResponse>[];
  reports?: MobileReportResponse[];
  stations?: MobileStationResponse[];
}

async function orderResponses(orders: Awaited<ReturnType<typeof listClientOrders>>): Promise<MobileClientOrderResponse[]> {
  const ids = orders.map((order) => order.stationId).filter((id): id is string => id != null && id.length > 0);
  const stationLocations = await getStationLocations(ids);

  return orders.map((order) =>
    mobileClientOrderResponse(
      order,
      typeof order.stationId === "string" && order.stationId.length > 0 ? stationLocations.get(order.stationId) : undefined,
    ),
  );
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<MobileClientOrdersResponse | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["client", "manager", "supervisor"]);

    if (session.role === "client") {
      const [orders, stations, reports, attendanceSessions] = await Promise.all([
        listClientOrdersForClient(session.uid),
        listOrderedStationsForClient(session.uid),
        listReportsForClientOrderedStations(session.uid),
        listAttendanceSessionsForClient(session.uid),
      ]);

      return NextResponse.json({
        attendanceSessions: attendanceSessions.map(mobileAttendanceSessionResponse),
        orders: await orderResponses(orders),
        stations: stations.map((station) => mobileStationResponse(station.stationId, station)),
        reports: reports.map(mobileReportResponse),
      });
    }

    const orders = await listClientOrders();

    return NextResponse.json({
      orders: await orderResponses(orders),
    });
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<MobileClientOrderResponse | ApiErrorResponse>> {
  try {
    const session = await requireBearerRole(request, ["client"]);
    const body = (await request.json()) as unknown;
    const bodyObj = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const latRaw = bodyObj.lat;
    const lngRaw = bodyObj.lng;
    const lat = typeof latRaw === "number" ? latRaw : latRaw !== undefined ? Number(latRaw) : undefined;
    const lng = typeof lngRaw === "number" ? lngRaw : lngRaw !== undefined ? Number(lngRaw) : undefined;

    const parsed = createClientOrderSchema.safeParse({
      lat: lat !== undefined && !Number.isNaN(lat) ? lat : undefined,
      lng: lng !== undefined && !Number.isNaN(lng) ? lng : undefined,
      note:
        typeof bodyObj.note === "string" ? bodyObj.note : bodyObj.note === null || bodyObj.note === undefined ? undefined : "",
      stationDescription:
        typeof bodyObj.stationDescription === "string"
          ? bodyObj.stationDescription
          : bodyObj.stationDescription === null || bodyObj.stationDescription === undefined
            ? undefined
            : "",
      stationLabel:
        typeof bodyObj.stationLabel === "string" ? bodyObj.stationLabel : bodyObj.stationLabel === undefined ? "" : "",
      stationLocation:
        typeof bodyObj.stationLocation === "string"
          ? bodyObj.stationLocation
          : bodyObj.stationLocation === undefined
            ? ""
            : "",
    });

    if (!parsed.success) {
      return NextResponse.json(
        { code: "MOBILE_CLIENT_ORDER_INVALID", message: "تحقق من اسم المحطة والموقع." },
        { status: 400 },
      );
    }

    const coordinates =
      typeof parsed.data.lat === "number" && typeof parsed.data.lng === "number"
        ? { lat: parsed.data.lat, lng: parsed.data.lng }
        : undefined;

    const order = await createClientOrder({
      actorRole: session.role,
      clientName: session.user.displayName,
      clientUid: session.uid,
      coordinates,
      note: parsed.data.note,
      stationDescription: parsed.data.stationDescription,
      stationLabel: parsed.data.stationLabel,
      stationLocation: parsed.data.stationLocation,
    });

    return NextResponse.json(mobileClientOrderResponse(order));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
