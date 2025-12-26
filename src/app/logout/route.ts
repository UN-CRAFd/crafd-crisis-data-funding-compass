import { NextResponse } from "next/server";

export async function POST() {
  // Clear the authentication cookie and redirect to login
  const res = NextResponse.redirect(
    new URL(
      "/login",
      process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
    ),
  );
  // Expire the cookie
  res.headers.set(
    "Set-Cookie",
    "site_auth=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0",
  );
  return res;
}
