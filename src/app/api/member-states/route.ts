/**
 * Member States API Route
 *
 * GET /api/member-states
 * Returns: string[]
 */

import { NextResponse } from "next/server";
import { getMemberStates } from "@/server/services/memberStateService";

export async function GET() {
  try {
    const states = await getMemberStates();
    return NextResponse.json(states, {
      headers: { "Cache-Control": "s-maxage=86400, stale-while-revalidate=86400" },
    });
  } catch (error) {
    console.error("Member states API error:", error);
    return NextResponse.json(
      { error: "Failed to load member states" },
      { status: 500 },
    );
  }
}
