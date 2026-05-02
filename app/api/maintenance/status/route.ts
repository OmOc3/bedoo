import "server-only";

import { NextResponse } from "next/server";
import { getAppSettings } from "@/lib/db/repositories";

export async function GET(): Promise<NextResponse> {
  const settings = await getAppSettings();

  return NextResponse.json(
    {
      enabled: settings.maintenanceEnabled,
      message: settings.maintenanceMessage ?? null,
      updatedAt: settings.updatedAt ? settings.updatedAt.toDate().getTime() : null,
    },
    {
      status: 200,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

