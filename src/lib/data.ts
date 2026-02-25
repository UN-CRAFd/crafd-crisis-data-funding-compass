/**
 * data.ts — Client-side data layer
 *
 * Thin wrapper calling server-side API endpoints.
 * All heavy lifting (SQL queries, filtering, assembly) happens server-side.
 *
 * Replaces the previous version that loaded static JSON files and
 * performed all filtering in the browser.
 */

import type {
  OrganizationProjectData,
  OrganizationTypeData,
  OrganizationWithProjects,
  ProjectData,
  ProjectTypeData,
  DashboardFilters,
} from "@/types/airtable";

// Re-export types for backward compatibility
export type {
  OrganizationProjectData,
  OrganizationTypeData,
  OrganizationWithProjects,
  ProjectData,
  ProjectTypeData,
} from "@/types/airtable";

// ================================================================
// General Contributions (member states) toggle
// ================================================================

let showGeneralContributions = true;

export function setGeneralContributionsEnabled(enabled: boolean) {
  showGeneralContributions = enabled;
}

export function isGeneralContributionsEnabled(): boolean {
  return showGeneralContributions;
}

// ================================================================
// Theme Mappings (loaded from /api/themes)
// ================================================================

interface ThemeMappings {
  themeToType: Record<string, string>;
  themeToKey: Record<string, string>;
  keyToThemes: Record<string, string[]>;
}

let cachedThemesMappings: ThemeMappings | null = null;
let themesLoadPromise: Promise<ThemeMappings> | null = null;

async function loadThemesMappings(): Promise<ThemeMappings> {
  if (cachedThemesMappings) return cachedThemesMappings;
  if (themesLoadPromise) return themesLoadPromise;

  themesLoadPromise = (async () => {
    try {
      const response = await fetch("/api/themes");
      if (!response.ok) {
        console.warn(`Failed to load themes: ${response.status}`);
        return { themeToType: {}, themeToKey: {}, keyToThemes: {} };
      }
      cachedThemesMappings = await response.json();
      return cachedThemesMappings!;
    } catch (error) {
      console.error("Error loading themes:", error);
      return { themeToType: {}, themeToKey: {}, keyToThemes: {} };
    }
  })();

  return themesLoadPromise;
}

export async function ensureThemesMappingsLoaded(): Promise<void> {
  await loadThemesMappings();
}

export async function getThemeToTypeMapping(): Promise<Record<string, string>> {
  const mappings = await loadThemesMappings();
  return mappings.themeToType;
}

export function themeNameToKey(themeName: string): string {
  if (!cachedThemesMappings) return themeName;
  return cachedThemesMappings.themeToKey[themeName] || themeName;
}

export function themeKeyToNames(themeKey: string): string[] {
  if (!cachedThemesMappings) return [themeKey];
  return cachedThemesMappings.keyToThemes[themeKey] || [themeKey];
}

export function themeKeyToName(themeKey: string): string {
  return themeKeyToNames(themeKey)[0] || themeKey;
}

// ================================================================
// Member States (loaded from /api/member-states)
// ================================================================

let cachedMemberStates: string[] | null = null;
let memberStatesLoadPromise: Promise<string[]> | null = null;

async function loadMemberStates(): Promise<string[]> {
  if (cachedMemberStates) return cachedMemberStates;
  if (memberStatesLoadPromise) return memberStatesLoadPromise;

  memberStatesLoadPromise = (async () => {
    try {
      const response = await fetch("/api/member-states");
      if (!response.ok) {
        console.warn(`Failed to load member states: ${response.status}`);
        return [];
      }
      cachedMemberStates = await response.json();
      return cachedMemberStates!;
    } catch (error) {
      console.error("Error loading member states:", error);
      return [];
    }
  })();

  return memberStatesLoadPromise;
}

export async function getMemberStates(): Promise<string[]> {
  if (!showGeneralContributions) return [];
  return loadMemberStates();
}

export async function isMemberState(country: string): Promise<boolean> {
  if (!showGeneralContributions) return false;
  const states = await loadMemberStates();
  return states.includes(country);
}

// ================================================================
// Agency Data (loaded from /api/agencies)
// ================================================================

export async function getAgenciesForDonors(
  donorCountries: string[],
): Promise<Map<string, string[]>> {
  if (donorCountries.length === 0) return new Map();

  try {
    const response = await fetch(
      `/api/agencies?donors=${encodeURIComponent(donorCountries.join(","))}`,
    );
    if (!response.ok) return new Map();
    const data: Record<string, string[]> = await response.json();
    return new Map(Object.entries(data));
  } catch (error) {
    console.error("Error loading agencies:", error);
    return new Map();
  }
}

export async function getAgencyListForDonors(
  donorCountries: string[],
): Promise<string[]> {
  const map = await getAgenciesForDonors(donorCountries);
  const set = new Set<string>();
  for (const agencies of map.values()) {
    for (const a of agencies) set.add(a);
  }
  return Array.from(set).sort();
}

// ================================================================
// Dashboard Data (from /api/dashboard)
// ================================================================

export async function processDashboardData(filters: DashboardFilters = {}) {
  const response = await fetch("/api/dashboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...filters,
      showGeneralContributions,
    }),
  });

  if (!response.ok) {
    throw new Error(`Dashboard API error: ${response.status}`);
  }

  return response.json();
}

// ================================================================
// Calculation functions (pure — no data loading)
// Used by CrisisDataDashboard for client-side aggregation.
// ================================================================

export function calculateOrganizationTypesFromOrganizationsWithProjects(
  organizations: OrganizationWithProjects[],
  allKnownTypes: string[],
): OrganizationTypeData[] {
  const typeCounts = new Map<string, number>();
  for (const t of allKnownTypes) typeCounts.set(t, 0);

  for (const org of organizations) {
    if (org.type && org.type !== "Unknown") {
      typeCounts.set(org.type, (typeCounts.get(org.type) || 0) + 1);
    }
  }

  return Array.from(typeCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

// ================================================================
// Dashboard stats type re-export
// ================================================================

export interface DashboardStats {
  donorCountries: number;
  dataProviders: number;
  dataProjects: number;
}
