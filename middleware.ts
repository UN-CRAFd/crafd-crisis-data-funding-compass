import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Security headers to add to all responses
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow these paths without auth:
  const publicPaths = [
    "/login",
    "/auth", // our Route Handler
    "/logout",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
  ];
  const isPublic = publicPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );

  // Ignore Next.js internals & static assets (but NOT /api or /data without auth):
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/logos") ||
    pathname.startsWith("/fonts");

  if (isStaticAsset) {
    const response = NextResponse.next();
    // Add security headers even to static assets
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  // Validate auth cookie - check for expected format
  const authCookie = req.cookies.get("site_auth")?.value;
  const authorized = authCookie === "1";

  if (!authorized && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // Only allow internal redirects - validate pathname is relative
    const safeRedirect = pathname.startsWith("/") ? pathname : "/";
    url.searchParams.set("redirect", safeRedirect);
    
    const response = NextResponse.redirect(url);
    // Add security headers to redirects
    Object.entries(securityHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  const response = NextResponse.next();
  // Add security headers to all responses
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// Match all routes except Next.js internals
export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
