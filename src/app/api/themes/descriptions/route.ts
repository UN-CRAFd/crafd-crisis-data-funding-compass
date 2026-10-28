/**
 * Theme Descriptions API Route
 *
 * GET /api/themes/descriptions
 * Returns: Record<string, string> — theme name → description
 */

import { getThemeDescriptions } from "@/server/services/themeService";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const descriptions = await getThemeDescriptions();
    return NextResponse.json(descriptions, {
      headers: {
        "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Theme descriptions API error:", error);
    return NextResponse.json(
      { error: "Failed to load theme descriptions" },
      { status: 500 },
    );
  }
}
