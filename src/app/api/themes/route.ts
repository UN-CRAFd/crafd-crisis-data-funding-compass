/**
 * Themes API Route
 *
 * GET /api/themes
 * Returns: ThemeMappingsDTO
 */

import { NextResponse } from "next/server";
import { getThemeMappings } from "@/server/services/themeService";

export async function GET() {
  try {
    const mappings = await getThemeMappings();
    return NextResponse.json(mappings, {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Themes API error:", error);
    return NextResponse.json(
      { error: "Failed to load theme mappings" },
      { status: 500 },
    );
  }
}
