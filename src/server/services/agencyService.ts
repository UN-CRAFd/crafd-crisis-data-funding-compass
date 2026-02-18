/**
 * Agency Service
 *
 * Country → agencies lookup from SQL.
 */

import { findAllAgencies } from "../repositories/agencyRepository";

/**
 * Get agencies grouped by country name.
 * Optionally filter to only the given countries.
 */
export async function getAgenciesByCountry(
  donorCountries?: string[],
): Promise<Record<string, string[]>> {
  const rows = await findAllAgencies();
  const map: Record<string, string[]> = {};

  for (const row of rows) {
    if (!row.country_name || !row.agency_name) continue;
    if (donorCountries && !donorCountries.includes(row.country_name)) continue;

    if (!map[row.country_name]) map[row.country_name] = [];
    if (!map[row.country_name].includes(row.agency_name)) {
      map[row.country_name].push(row.agency_name);
    }
  }

  // Sort agencies within each country
  for (const country of Object.keys(map)) {
    map[country].sort();
  }

  return map;
}

/**
 * Get flat list of all agency names for given donor countries.
 */
export async function getAgencyListForDonors(
  donorCountries: string[],
): Promise<string[]> {
  const byCountry = await getAgenciesByCountry(donorCountries);
  const set = new Set<string>();
  for (const agencies of Object.values(byCountry)) {
    for (const a of agencies) set.add(a);
  }
  return Array.from(set).sort();
}
