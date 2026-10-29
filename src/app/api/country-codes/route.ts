/**
 * Country Codes API Route
 *
 * GET /api/country-codes
 * Returns: Record<string, string> (country name → ISO alpha-3 code)
 */

import { getCoreData } from "@/server/cache";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { countryCodes } = await getCoreData();
    return NextResponse.json(
      Object.fromEntries(countryCodes.map((c) => [c.name, c.iso_alpha3])),
      {
        headers: {
          "Cache-Control": "s-maxage=86400, stale-while-revalidate=86400",
        },
      },
    );
  } catch (error) {
    console.error("Country codes API error:", error);
    return NextResponse.json(
      { error: "Failed to load country codes" },
      { status: 500 },
    );
  }
}
