import { NextRequest, NextResponse } from "next/server";
import { ROLE_COOKIE_NAME } from "@/lib/auth/constants";
import { getRoleRedirect } from "@/lib/auth/redirects";
import { verifySignedRoleCookie } from "@/lib/auth/role-cookie";
import { assertEnv } from "@/lib/env-check";

function isMaintenanceEnabled(): boolean {
  const raw = process.env.MAINTENANCE_MODE;
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

interface MaintenanceStatusCache {
  enabled: boolean;
  expiresAt: number;
  origin: string;
}

interface PendingMaintenanceStatusRequest {
  origin: string;
  promise: Promise<boolean>;
}

let maintenanceStatusCache: MaintenanceStatusCache | null = null;
let pendingMaintenanceStatusRequest: PendingMaintenanceStatusRequest | null = null;

function getMaintenanceStatusCacheTtlMs(): number {
  const raw = process.env.MAINTENANCE_STATUS_CACHE_SECONDS;

  if (raw) {
    const seconds = Number(raw);

    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.trunc(seconds * 1000);
    }
  }

  return process.env.NODE_ENV === "development" ? 60_000 : 0;
}

async function fetchMaintenanceEnabledFromSettingsApi(origin: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${origin}/api/maintenance/status`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return false;
    }

    const data: unknown = await response.json();
    if (!data || typeof data !== "object") return false;
    const enabled = (data as { enabled?: unknown }).enabled;
    return enabled === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function getMaintenanceEnabledFromSettingsApi(origin: string): Promise<boolean> {
  const cacheTtlMs = getMaintenanceStatusCacheTtlMs();
  const now = Date.now();

  if (
    cacheTtlMs > 0 &&
    maintenanceStatusCache &&
    maintenanceStatusCache.origin === origin &&
    maintenanceStatusCache.expiresAt > now
  ) {
    return maintenanceStatusCache.enabled;
  }

  if (pendingMaintenanceStatusRequest?.origin === origin) {
    return pendingMaintenanceStatusRequest.promise;
  }

  const promise = fetchMaintenanceEnabledFromSettingsApi(origin);
  pendingMaintenanceStatusRequest = { origin, promise };

  try {
    const enabled = await promise;

    if (cacheTtlMs > 0) {
      maintenanceStatusCache = {
        enabled,
        expiresAt: Date.now() + cacheTtlMs,
        origin,
      };
    }

    return enabled;
  } finally {
    if (pendingMaintenanceStatusRequest?.promise === promise) {
      pendingMaintenanceStatusRequest = null;
    }
  }
}

async function isMaintenanceActive(request: NextRequest): Promise<boolean> {
  if (isMaintenanceEnabled()) {
    return true;
  }
  return getMaintenanceEnabledFromSettingsApi(request.nextUrl.origin);
}

const alwaysPublicPrefixes = [
  "/login",
  "/client/login",
  "/client/signup",
  "/maintenance",
  "/unauthorized",
  "/account-disabled",
  "/scan",
  "/client/view",
  "/api/auth",
  "/api/mobile/web-session/consume",
  "/api/maintenance/status",
];

const mobileApiPrefix = "/api/mobile";

function createContentSecurityPolicy(nonce: string): string {
  const isProduction = process.env.NODE_ENV === "production";
  const scriptSrc = isProduction
    ? `script-src 'self' 'nonce-${nonce}'`
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://tile.openstreetmap.org",
    "font-src 'self' data: https://fonts.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    scriptSrc,
    "connect-src 'self'",
    isProduction ? "upgrade-insecure-requests" : "",
  ]
    .filter(Boolean)
    .join("; ");

  return csp;
}

function nextWithNonce(request: NextRequest): NextResponse {
  const nonce = crypto.randomUUID();
  const csp = createContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set("x-nonce", nonce);
  response.headers.set("Content-Security-Policy", csp);

  return response;
}

function isAlwaysPublic(pathname: string): boolean {
  return pathname === "/" || alwaysPublicPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isMobileApi(pathname: string): boolean {
  return pathname === mobileApiPrefix || pathname.startsWith(`${mobileApiPrefix}/`);
}

function isBetterAuthCookieName(name: string): boolean {
  const unprefixed = name.startsWith("__Secure-")
    ? name.slice("__Secure-".length)
    : name.startsWith("__Host-")
      ? name.slice("__Host-".length)
      : name;

  return unprefixed.startsWith("better-auth.");
}

function hasBetterAuthCookie(request: NextRequest): boolean {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return false;
  }

  return cookieHeader
    .split(";")
    .some((cookie) => {
      const name = cookie.trim().split("=", 1)[0];

      return isBetterAuthCookieName(name);
    });
}

function hasMobileApiSessionCredential(request: NextRequest): boolean {
  return request.headers.get("authorization")?.startsWith("Bearer ") === true || hasBetterAuthCookie(request);
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();

  url.pathname = request.nextUrl.pathname.startsWith("/client") ? "/client/login" : "/login";

  return NextResponse.redirect(url);
}

function maintenanceResponseForApi(): NextResponse {
  return NextResponse.json(
    { code: "MAINTENANCE", message: "الصيانة جارية الآن. حاول مرة أخرى لاحقًا." },
    { status: 503 },
  );
}

function isMaintenanceBypassPath(pathname: string): boolean {
  return (
    pathname === "/maintenance" ||
    pathname === "/api/maintenance/status" ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/mobile/web-session/consume" ||
    pathname.startsWith("/api/mobile/web-session/consume/")
  );
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  assertEnv();

  try {
    const pathname = request.nextUrl.pathname;
    const shouldCheckMaintenance = !isMaintenanceBypassPath(pathname);

    if (shouldCheckMaintenance && (await isMaintenanceActive(request))) {
      const roleCookie = request.cookies.get(ROLE_COOKIE_NAME)?.value;
      const payload = await verifySignedRoleCookie(roleCookie);

      if (payload && (payload.role === "client" || payload.role === "technician")) {
        if (pathname.startsWith("/api")) {
          return maintenanceResponseForApi();
        }

        const url = request.nextUrl.clone();
        url.pathname = "/maintenance";
        url.searchParams.set("from", pathname);
        return NextResponse.redirect(url);
      }
    }

    if (isAlwaysPublic(pathname)) {
      return nextWithNonce(request);
    }

    // For mobile API routes, require at least a mobile-supported auth credential as a first gate.
    // Full session validation happens inside each route via requireBearerRole.
    if (isMobileApi(pathname)) {
      if (!hasMobileApiSessionCredential(request)) {
        return NextResponse.json(
          { code: "AUTH_REQUIRED", message: "يلزم تسجيل الدخول." },
          { status: 401 },
        );
      }
      return nextWithNonce(request);
    }

    const roleCookie = request.cookies.get(ROLE_COOKIE_NAME)?.value;
    const payload = await verifySignedRoleCookie(roleCookie);

    if (!payload) {
      return redirectToLogin(request);
    }

    if (pathname.startsWith("/client") && payload.role !== "client" && !pathname.startsWith("/client/view")) {
      const url = request.nextUrl.clone();
      url.pathname = getRoleRedirect(payload.role);
      return NextResponse.redirect(url);
    }

    if (
      payload.role === "client" &&
      (pathname.startsWith("/dashboard") || pathname.startsWith("/scan") || pathname.startsWith("/station"))
    ) {
      const url = request.nextUrl.clone();
      url.pathname = getRoleRedirect(payload.role);
      return NextResponse.redirect(url);
    }

    return nextWithNonce(request);
  } catch (_error: unknown) {
    return redirectToLogin(request);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
