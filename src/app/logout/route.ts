import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Get the origin from the request to avoid hardcoded URLs
  const origin = new URL(req.url).origin;
  const res = NextResponse.redirect(new URL("/login", origin), { status: 303 });

  const isProduction = process.env.NODE_ENV === "production";

  // Clear the authentication cookie with all necessary security attributes
  const cookieValue = [
    "site_auth=",
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    "Max-Age=0",
    isProduction ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  res.headers.set("Set-Cookie", cookieValue);

  // Also clear via cookies() API for consistency
  try {
    const cookieStore = await cookies();
    cookieStore.delete("site_auth");
  } catch {
    // Fallback handled by Set-Cookie header above
  }

  return res;
}
