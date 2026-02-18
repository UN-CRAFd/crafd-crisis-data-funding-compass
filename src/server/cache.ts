/**
 * Server-side TTL Cache
 *
 * Caches the results of the 5 core batch queries that power every endpoint.
 * The dataset is small (~92 orgs, ~226 projects) and changes only via an
 * offline data pipeline, so a 60-second TTL eliminates redundant DB traffic
 * without risking stale data.
 *
 * Every API route that needs organization/project/agency/theme data goes
 * through `getCoreData()` instead of calling repositories directly.
 */

import {
  findAllOrganizations,
  findAllOrgAgencies,
  findAllOrgProjects,
  findAllProjectThemes,
  findAllProjectAgencies,
} from "./repositories";
import { findAllAgencies } from "./repositories/agencyRepository";
import { findAllThemes } from "./repositories/themeRepository";
import { findAllMemberStates } from "./repositories/memberStateRepository";
import type {
  OrgRow,
  OrgAgencyRow,
  OrgProjectRow,
  ProjectThemeRow,
  ProjectAgencyRow,
  AgencyRow,
  ThemeRow,
} from "./repositories";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface CoreData {
  orgs: OrgRow[];
  orgAgencies: OrgAgencyRow[];
  orgProjects: OrgProjectRow[];
  projectThemes: ProjectThemeRow[];
  projectAgencies: ProjectAgencyRow[];
  agencies: AgencyRow[];
  themes: ThemeRow[];
  memberStates: string[];
}

// ─────────────────────────────────────────────────────────
// Cache internals
// ─────────────────────────────────────────────────────────

const TTL_MS = 60_000; // 60 seconds

let cached: CoreData | null = null;
let cachedAt = 0;
let loadPromise: Promise<CoreData> | null = null;

async function loadAll(): Promise<CoreData> {
  const [
    orgs,
    orgAgencies,
    orgProjects,
    projectThemes,
    projectAgencies,
    agencies,
    themes,
    memberStates,
  ] = await Promise.all([
    findAllOrganizations(),
    findAllOrgAgencies(),
    findAllOrgProjects(),
    findAllProjectThemes(),
    findAllProjectAgencies(),
    findAllAgencies(),
    findAllThemes(),
    findAllMemberStates(),
  ]);

  return { orgs, orgAgencies, orgProjects, projectThemes, projectAgencies, agencies, themes, memberStates };
}

/**
 * Get all core data, cached with a 60-second TTL.
 * Concurrent callers share the same in-flight promise (no stampede).
 */
export async function getCoreData(): Promise<CoreData> {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) return cached;

  if (!loadPromise) {
    loadPromise = loadAll().then((data) => {
      cached = data;
      cachedAt = Date.now();
      loadPromise = null;
      return data;
    }).catch((err) => {
      loadPromise = null;
      throw err;
    });
  }

  return loadPromise;
}

/**
 * Force-invalidate the cache (e.g. after a data pipeline run).
 */
export function invalidateCache(): void {
  cached = null;
  cachedAt = 0;
  loadPromise = null;
}
