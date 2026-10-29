/**
 * Member State Repository
 *
 * SQL queries for UN member states used by the general contributions feature.
 * The list comes from `un_member_states` (loaded by the data pipeline from
 * data/un_member_states.csv) and is joined to countries on ISO alpha-3 code.
 */

import { queryRows } from "../db";

/**
 * Names of all UN member states.
 *
 * A member state that is also a country in the data takes that country's name
 * (e.g. "Netherlands" rather than "Netherlands (Kingdom of the)"), so donor
 * filters, modals and general-contribution links all use one name per state.
 */
export async function findAllMemberStates(): Promise<string[]> {
  const rows = await queryRows<{ name: string }>(`
    SELECT DISTINCT COALESCE(c.name, ms.name) AS name
    FROM un_member_states ms
    LEFT JOIN countries c ON c.iso_alpha3 = ms.iso_alpha3
    ORDER BY name
  `);
  return rows.map((r) => r.name);
}
