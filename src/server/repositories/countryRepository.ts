/**
 * Country Repository
 *
 * SQL queries for country ISO codes, used for flags.
 */

import { queryRows } from "../db";

export interface CountryCodeRow {
  name: string;
  iso_alpha3: string;
}

/**
 * ISO alpha-3 code of every country the site can show: the countries in the
 * data, plus UN member states that aren't in it (shown as general-contribution
 * donors). Names match those returned by findAllMemberStates. Donor groups
 * (European Union, Foundations, …) have no code and are not included.
 */
export async function findAllCountryCodes(): Promise<CountryCodeRow[]> {
  return queryRows<CountryCodeRow>(`
    SELECT name, iso_alpha3
    FROM countries
    WHERE iso_alpha3 IS NOT NULL
    UNION
    SELECT ms.name, ms.iso_alpha3
    FROM un_member_states ms
    WHERE NOT EXISTS (
      SELECT 1 FROM countries c WHERE c.iso_alpha3 = ms.iso_alpha3
    )
    ORDER BY name
  `);
}
