/**
 * Agency Repository
 *
 * SQL queries for agency data grouped by country.
 */

import { queryRows } from "../db";

export interface AgencyRow {
  agency_name: string;
  agency_website: string | null;
  country_name: string | null;
}

/**
 * Fetch all agencies with their country name, sorted for display.
 */
export async function findAllAgencies(): Promise<AgencyRow[]> {
  return queryRows<AgencyRow>(`
    SELECT
      a.name    AS agency_name,
      a.website AS agency_website,
      c.name    AS country_name
    FROM agencies a
    LEFT JOIN countries c ON a.country_id = c.id
    ORDER BY c.name, a.name
  `);
}
