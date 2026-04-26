import { createHash } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_MAX_AGE_MS } from "@/lib/auth/constants";
import { createSignedRoleCookie } from "@/lib/auth/role-cookie";
import { setAuthCookies } from "@/lib/auth/session";
import { MOBILE_WEB_SESSIONS_COL } from "@/lib/collections";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import type { UserRole } from "@/types";

export const runtime = "nodejs";

interface MobileWebSessionDocument {
  expiresAt?: Timestamp;
  idToken?: string;
  redirectTo?: string;
  role?: UserRole;
  uid?: string;
}

interface ConsumedMobileWebSession {
  redirectTo: string;
  role: UserRole;
  uid: string;
  idToken: string;
}

const validRedirects = new Set(["/dashboard/manager", "/dashboard/supervisor"]);

function hashHandoffToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function loginRedirect(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
}

function isValidSessionDocument(value: MobileWebSessionDocument): value is Required<MobileWebSessionDocument> {
  return (
    typeof value.uid === "string" &&
    (value.role === "manager" || value.role === "supervisor") &&
    typeof value.redirectTo === "string" &&
    validRedirects.has(value.redirectTo) &&
    typeof value.idToken === "string" &&
    value.expiresAt instanceof Timestamp
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return loginRedirect(request);
  }

  try {
    const tokenHash = hashHandoffToken(token);
    const consumedSession = await adminDb().runTransaction(async (tx): Promise<ConsumedMobileWebSession | null> => {
      const ref = adminDb().collection(MOBILE_WEB_SESSIONS_COL).doc(tokenHash);
      const snapshot = await tx.get(ref);

      if (!snapshot.exists) {
        return null;
      }

      const data = snapshot.data() as MobileWebSessionDocument;

      tx.delete(ref);

      if (!isValidSessionDocument(data) || data.expiresAt.toMillis() <= Date.now()) {
        return null;
      }

      return {
        idToken: data.idToken,
        redirectTo: data.redirectTo,
        role: data.role,
        uid: data.uid,
      };
    });

    if (!consumedSession) {
      return loginRedirect(request);
    }

    const response = NextResponse.redirect(new URL(consumedSession.redirectTo, request.nextUrl.origin));
    const [sessionCookie, roleCookie] = await Promise.all([
      adminAuth().createSessionCookie(consumedSession.idToken, { expiresIn: SESSION_MAX_AGE_MS }),
      createSignedRoleCookie({
        uid: consumedSession.uid,
        role: consumedSession.role,
        expiresAt: Date.now() + SESSION_MAX_AGE_MS,
      }),
    ]);

    setAuthCookies(response, sessionCookie, roleCookie);

    return response;
  } catch (_error: unknown) {
    return loginRedirect(request);
  }
}
