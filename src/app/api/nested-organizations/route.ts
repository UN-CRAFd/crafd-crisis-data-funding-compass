/**
 * Nested Organizations API Route
 *
 * GET /api/nested-organizations
 * Returns nested org structures for DonorModal
 */

import { NextResponse } from "next/server";
import { getNestedOrganizationsForDonorModal } from "@/server/services/modalService";

export async function GET() {
  try {
    const data = await getNestedOrganizationsForDonorModal();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Nested organizations API error:", error);
    return NextResponse.json(
      { error: "Failed to load nested organizations" },
      { status: 500 },
    );
  }
}
