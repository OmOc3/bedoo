import { NextRequest, NextResponse } from "next/server";
import { ROLE_COOKIE_NAME } from "@/lib/auth/constants";
import { verifySignedRoleCookie } from "@/lib/auth/role-cookie";
import { assertEnv } from "@/lib/env-check";

const alwaysPublicPrefixes = [
  "/login",
  "/unauthorized",
  "/account-disabled",
  "/scan",
  "/client",
  "/api/auth",
  "/api/mobile/web-session/consume",
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

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();

  url.pathname = "/login";

  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  assertEnv();

  try {
    const pathname = request.nextUrl.pathname;

    if (isAlwaysPublic(pathname)) {
      return nextWithNonce(request);
    }

    // For mobile API routes, require at least an Authorization header as a first gate.
    // Full session validation happens inside each route via requireBearerRole.
    if (isMobileApi(pathname)) {
      const hasAuth = request.headers.get("authorization")?.startsWith("Bearer ");
      if (!hasAuth) {
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

    return nextWithNonce(request);
  } catch (_error: unknown) {
    return redirectToLogin(request);
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)"],
};
