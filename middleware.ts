import { NextRequest, NextResponse } from "next/server";
import { ROLE_COOKIE_NAME } from "@/lib/auth/constants";
import { getRoleRedirect } from "@/lib/auth/redirects";
import { verifySignedRoleCookie } from "@/lib/auth/role-cookie";
import type { UserRole } from "@/types";

const publicPrefixes = ["/login", "/unauthorized", "/scan", "/api/auth", "/api/mobile"];

function isPublicPath(pathname: string): boolean {
  return pathname === "/" || publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();

  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);

  return NextResponse.redirect(url);
}

function redirectToUnauthorized(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();

  url.pathname = "/unauthorized";
  url.search = "";

  return NextResponse.redirect(url);
}

function roleCanAccess(pathname: string, role: UserRole): boolean {
  if (pathname.startsWith("/station")) {
    return role === "technician" || role === "manager";
  }

  if (pathname.startsWith("/dashboard/manager")) {
    return role === "manager";
  }

  if (pathname.startsWith("/dashboard/supervisor")) {
    return role === "supervisor" || role === "manager";
  }

  if (pathname.startsWith("/dashboard")) {
    return role === "supervisor" || role === "manager";
  }

  return true;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  try {
    const pathname = request.nextUrl.pathname;
    const roleCookie = request.cookies.get(ROLE_COOKIE_NAME)?.value;
    const payload = await verifySignedRoleCookie(roleCookie);

    if (pathname === "/login" && payload) {
      return NextResponse.redirect(new URL(getRoleRedirect(payload.role), request.url));
    }

    if (pathname === "/" && payload) {
      return NextResponse.redirect(new URL(getRoleRedirect(payload.role), request.url));
    }

    if (isPublicPath(pathname)) {
      return NextResponse.next();
    }

    if (!payload) {
      return redirectToLogin(request);
    }

    if (pathname === "/dashboard") {
      return NextResponse.redirect(new URL(getRoleRedirect(payload.role), request.url));
    }

    if (!roleCanAccess(pathname, payload.role)) {
      return redirectToUnauthorized(request);
    }

    return NextResponse.next();
  } catch (_error: unknown) {
    return redirectToLogin(request);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
