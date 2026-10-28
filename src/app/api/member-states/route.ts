/**
 * Member States API Route
 *
 * GET /api/member-states
 * Returns: string[]
 */

import { findAllMemberStates } from "@/server/repositories/memberStateRepository";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const states = await findAllMemberStates();
    return NextResponse.json(states, {
      headers: {
        "Cache-Control": "s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Member states API error:", error);
    return NextResponse.json(
      { error: "Failed to load member states" },
      { status: 500 },
    );
  }
}
