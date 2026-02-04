import { getLastUpdatedDate } from "@/lib/getLastUpdated";

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  const lastUpdated = getLastUpdatedDate();

  return Response.json({ lastUpdated }, { status: 200 });
}
