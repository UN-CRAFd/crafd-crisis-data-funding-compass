/**
 * Modal Maps API Route
 *
 * GET /api/modal-maps
 * Returns: ModalMapsDTO
 */

import { NextResponse } from "next/server";
import { buildModalMaps } from "@/server/services/modalService";

export async function GET() {
  try {
    const maps = await buildModalMaps();
    return NextResponse.json(maps, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Modal maps API error:", error);
    return NextResponse.json(
      { error: "Failed to load modal maps" },
      { status: 500 },
    );
  }
}
