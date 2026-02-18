/**
 * Shared server-side utilities used by multiple services.
 */

import type { OrgRow } from "./repositories";

/**
 * Group an array of rows by a string key into a Map.
 */
export function groupBy<T>(rows: T[], keyFn: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return map;
}

/** Deduplicate a string array */
export function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

/**
 * Reconstruct the Airtable-style `fields` object from SQL columns.
 * Used by both dashboardService and modalService for backward compatibility
 * with frontend components that read `org.fields["Org Full Name"]` etc.
 */
export function buildFieldsObject(org: OrgRow): Record<string, unknown> {
  return {
    "Org Full Name": org.full_name,
    "Org Short Name": org.short_name,
    "org_key": org.org_key,
    "Org Website": org.website,
    "Org Description": org.description,
    "Est. Org Budget": org.estimated_budget,
    "Org Programme Budget": org.programme_budget,
    "Budget Source": org.budget_source,
    "Link to Budget Source": org.budget_source_link,
    "Funding Type": org.funding_type,
    "Org Type": org.org_type,
    "Org HQ Country": org.hq_country,
    "HDX Org Key": org.hdx_org_key,
    "IATI Org Key": org.iati_org_key,
    "Org MPTFO Name": org.mptfo_name,
    "Org MPTFO URL [Formula]": org.mptfo_url,
    "Org Transparency Portal": org.transparency_portal_url,
    "Link to Data Products Overview": org.data_products_overview_url,
    "Last Updated": org.last_updated,
  };
}
