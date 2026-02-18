/**
 * Dashboard API Route
 *
 * POST /api/dashboard
 * Body: DashboardFiltersDTO
 * Returns: DashboardDataDTO
 */

import { NextRequest, NextResponse } from "next/server";
import { processDashboardData } from "@/server/services/dashboardService";
import type { DashboardFiltersDTO } from "@/server/dto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const filters: DashboardFiltersDTO = {
      searchQuery: body.searchQuery || undefined,
      donorCountries: Array.isArray(body.donorCountries)
        ? body.donorCountries
        : undefined,
      donorAgencies: Array.isArray(body.donorAgencies)
        ? body.donorAgencies
        : undefined,
      investmentTypes: Array.isArray(body.investmentTypes)
        ? body.investmentTypes
        : undefined,
      investmentThemes: Array.isArray(body.investmentThemes)
        ? body.investmentThemes
        : undefined,
      showGeneralContributions: body.showGeneralContributions ?? true,
    };

    const data = await processDashboardData(filters);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 },
    );
  }
}

// Also support GET with no filters (initial load)
export async function GET() {
  try {
    const data = await processDashboardData();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard data" },
      { status: 500 },
    );
  }
}
