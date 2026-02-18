/**
 * Theme Repository
 *
 * SQL queries for theme and investment type data.
 */

import { queryRows } from "../db";

export interface ThemeRow {
  id: string;
  theme_key: string | null;
  name: string;
  description: string | null;
  type_name: string | null;
}

/**
 * Fetch all themes with their associated investment type.
 */
export async function findAllThemes(): Promise<ThemeRow[]> {
  return queryRows<ThemeRow>(`
    SELECT
      t.id,
      t.theme_key,
      t.name,
      t.description,
      tp.name AS type_name
    FROM themes t
    LEFT JOIN types tp ON t.type_id = tp.id
    ORDER BY tp.name, t.name
  `);
}
