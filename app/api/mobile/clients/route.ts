import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import {
  mobileClientDirectoryEntryResponse,
  type MobileClientDirectoryEntryResponse,
} from "@/lib/api/mobile-serializers";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { listClientDirectory } from "@/lib/db/repositories";
import type { ApiErrorResponse } from "@/types";

export const runtime = "nodejs";

export async function GET(request: NextRequest): Promise<NextResponse<MobileClientDirectoryEntryResponse[] | ApiErrorResponse>> {
  try {
    await requireBearerRole(request, ["manager"]);
    const clients = await listClientDirectory();

    return NextResponse.json(clients.map(mobileClientDirectoryEntryResponse));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
