import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/server-session";
import { listNearbyStations } from "@/lib/db/repositories";
import { maxLocationAccuracyMeters } from "@/lib/geo";

export const runtime = "nodejs";

interface NearbyStationResponse {
  distanceMeters: number;
  label: string;
  lastVisitedAt?: string;
  lastVisitedBy?: string;
  location: string;
  photoUrl?: string;
  stationId: string;
  zone?: string;
}

function requiredNumber(params: URLSearchParams, key: string): number {
  const value = Number(params.get(key));

  if (!Number.isFinite(value)) {
    throw new Error("بيانات الموقع غير صالحة.");
  }

  return value;
}

function optionalNumber(params: URLSearchParams, key: string): number | undefined {
  const raw = params.get(key);

  if (!raw) {
    return undefined;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

export async function GET(request: NextRequest): Promise<NextResponse<{ error: string } | NearbyStationResponse[]>> {
  try {
    // Nearby list is for staff only; technicians must open stations via QR scan.
    await requireRole(["manager", "supervisor"]);
    const params = request.nextUrl.searchParams;
    const accuracyMeters = optionalNumber(params, "accuracyMeters");

    if (typeof accuracyMeters === "number" && accuracyMeters > maxLocationAccuracyMeters) {
      return NextResponse.json({ error: "دقة الموقع ضعيفة. اقترب من المحطات ثم حاول مرة أخرى." }, { status: 400 });
    }

    const nearbyStations = await listNearbyStations({
      lat: requiredNumber(params, "lat"),
      lng: requiredNumber(params, "lng"),
    });

    return NextResponse.json(
      nearbyStations.map((entry) => ({
        distanceMeters: entry.distanceMeters,
        label: entry.station.label,
        lastVisitedAt: entry.station.lastVisitedAt?.toDate().toISOString(),
        lastVisitedBy: entry.station.lastVisitedBy,
        location: entry.station.location,
        photoUrl: entry.station.photoUrls?.[0],
        stationId: entry.station.stationId,
        zone: entry.station.zone,
      })),
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "تعذر تحميل المحطات القريبة." },
      { status: 400 },
    );
  }
}
