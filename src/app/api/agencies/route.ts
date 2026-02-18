/**
 * Agencies API Route
 *
 * GET /api/agencies?donors=Germany,France
 * Returns: Record<string, string[]>
 */

import { NextRequest, NextResponse } from "next/server";
import { getAgenciesByCountry } from "@/server/services/agencyService";

export async function GET(request: NextRequest) {
  try {
    const donorsParam = request.nextUrl.searchParams.get("donors");
    const donors = donorsParam
      ? donorsParam.split(",").filter(Boolean)
      : undefined;

    const agencies = await getAgenciesByCountry(donors);
    return NextResponse.json(agencies, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Agencies API error:", error);
    return NextResponse.json(
      { error: "Failed to load agencies" },
      { status: 500 },
    );
  }
}
