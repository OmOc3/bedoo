import type { NextResponse } from "next/server";
import { ROLE_COOKIE_NAME, SESSION_COOKIE_NAME } from "@/lib/auth/constants";
import { getSessionMaxAgeSeconds } from "@/lib/auth/session-config";

const isProduction = process.env.NODE_ENV === "production";

export function setAuthCookies(response: NextResponse, sessionCookie: string, roleCookie: string): void {
  const maxAge = getSessionMaxAgeSeconds();

  response.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge,
  });

  response.cookies.set(ROLE_COOKIE_NAME, roleCookie, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(ROLE_COOKIE_NAME, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
