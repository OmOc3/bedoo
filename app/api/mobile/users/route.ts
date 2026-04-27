import { NextRequest, NextResponse } from "next/server";
import { mobileApiErrorResponse } from "@/lib/api/mobile";
import { requireBearerRole } from "@/lib/auth/bearer-session";
import { listAppUsers } from "@/lib/db/repositories";
import type { ApiErrorResponse, UserRole } from "@/types";

export const runtime = "nodejs";

interface MobileUserResponse {
  createdAt?: string;
  displayName: string;
  email: string;
  isActive: boolean;
  role: UserRole;
  uid: string;
}

function toMobileUserResponse(input: Awaited<ReturnType<typeof listAppUsers>>[number]): MobileUserResponse {
  const createdAt = input.createdAt?.toDate?.();

  return {
    uid: input.uid,
    email: input.email,
    displayName: input.displayName,
    role: input.role,
    isActive: input.isActive,
    ...(createdAt ? { createdAt: createdAt.toISOString() } : {}),
  };
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<MobileUserResponse[] | ApiErrorResponse>> {
  try {
    await requireBearerRole(request, ["technician", "supervisor", "manager"]);
    const users = await listAppUsers();

    return NextResponse.json(users.map(toMobileUserResponse));
  } catch (error: unknown) {
    return mobileApiErrorResponse(error);
  }
}
