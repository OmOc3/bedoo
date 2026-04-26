import type { NextResponse } from "next/server";
import { ROLE_COOKIE_NAME } from "@/lib/auth/constants";
import { getSessionMaxAgeSeconds } from "@/lib/auth/session-config";

const isProduction = process.env.NODE_ENV === "production";

export function setRoleCookie(response: NextResponse, roleCookie: string): void {
  response.cookies.set(ROLE_COOKIE_NAME, roleCookie, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: getSessionMaxAgeSeconds(),
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(ROLE_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
