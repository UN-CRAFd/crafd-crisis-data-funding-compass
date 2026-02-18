/**
 * Theme Service
 *
 * Builds theme ↔ investment-type and theme ↔ key mappings from cached data.
 */

import { getCoreData } from "../cache";

export interface ThemeMappings {
  themeToType: Record<string, string>;
  themeToKey: Record<string, string>;
  keyToThemes: Record<string, string[]>;
}

export async function getThemeMappings(): Promise<ThemeMappings> {
  const { themes } = await getCoreData();
  const themeToType: Record<string, string> = {};
  const themeToKey: Record<string, string> = {};
  const keyToThemes: Record<string, string[]> = {};

  for (const row of themes) {
    if (row.name && row.type_name) {
      themeToType[row.name] = row.type_name;
    }
    if (row.name && row.theme_key) {
      themeToKey[row.name] = row.theme_key;
      const existing = keyToThemes[row.theme_key] || [];
      if (!existing.includes(row.name)) {
        existing.push(row.name);
        keyToThemes[row.theme_key] = existing;
      }
    }
  }

  return { themeToType, themeToKey, keyToThemes };
}

/**
 * Get theme descriptions keyed by theme name.
 */
export async function getThemeDescriptions(): Promise<Record<string, string>> {
  const { themes } = await getCoreData();
  const map: Record<string, string> = {};
  for (const row of themes) {
    if (row.name && row.description) {
      map[row.name] = row.description;
    }
  }
  return map;
}
