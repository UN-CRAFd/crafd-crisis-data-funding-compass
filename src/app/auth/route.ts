import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Constant-time string comparison to prevent timing attacks
 */
function safeEqual(a: string, b: string): boolean {
  // Compare constant-time to reduce timing attacks for short secrets
  const ah = Buffer.from(createHash("sha256").update(a).digest("hex"));
  const bh = Buffer.from(createHash("sha256").update(b).digest("hex"));
  return ah.length === bh.length && timingSafeEqual(ah, bh);
}

/**
 * Validate and sanitize redirect path to prevent open redirect attacks
 * Only allows relative paths starting with /
 */
function sanitizeRedirectPath(redirect: string): string {
  // Default to home
  if (!redirect) return "/";

  // Remove any leading/trailing whitespace
  const trimmed = redirect.trim();

  // Must start with a single forward slash (not //)
  // This prevents protocol-relative URLs like //evil.com
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return "/";
  }

  // Block any URLs with protocol schemes
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
    return "/";
  }

  // Parse and validate the path
  try {
    // Only use the pathname, strip any query strings that might contain URLs
    const url = new URL(trimmed, "http://localhost");
    const safePath = url.pathname;

    // Ensure it's still a valid internal path
    if (!safePath.startsWith("/")) {
      return "/";
    }

    return safePath;
  } catch {
    return "/";
  }
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const password = String(form.get("password") ?? "");
    const redirectRaw = String(form.get("redirect") ?? "/");

    // Validate and sanitize redirect path
    const redirect = sanitizeRedirectPath(redirectRaw);

    const expected = process.env.SITE_PASSWORD ?? "";

    if (!expected) {
      // Log without exposing details in production
      if (process.env.NODE_ENV === "development") {
        console.error("SITE_PASSWORD environment variable not configured");
      }
      return NextResponse.redirect(new URL("/login?error=config", req.url), {
        status: 303,
      });
    }

    if (safeEqual(password, expected)) {
      // Mark the user as authenticated
      const cookieStore = await cookies();
      const isProduction = process.env.NODE_ENV === "production";

      cookieStore.set("site_auth", "1", {
        httpOnly: true,
        secure: isProduction,
        sameSite: "strict", // Stricter than "lax" for better CSRF protection
        path: "/",
        maxAge: 60 * 60 * 8, // 8 hours session timeout
      });

      // Redirect to the sanitized destination
      const origin = new URL(req.url).origin;
      const redirectUrl = new URL(redirect, origin);
      return NextResponse.redirect(redirectUrl, { status: 303 });
    }

    // On failure, send back to login
    // Don't reveal whether the password was wrong vs other errors
    return NextResponse.redirect(new URL("/login?error=1", req.url), {
      status: 303,
    });
  } catch {
    // Don't log sensitive error details in production
    if (process.env.NODE_ENV === "development") {
      console.error("Auth error occurred");
    }
    return NextResponse.redirect(new URL("/login?error=1", req.url), {
      status: 303,
    });
  }
}
