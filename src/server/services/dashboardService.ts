/**
 * Dashboard Service
 *
 * Core business logic: assembles SQL rows into OrganizationWithProjects,
 * applies filters, calculates statistics, and returns the DashboardDataDTO.
 *
 * This file replaces the client-side `processDashboardData()` from data.ts.
 * No SQL here — all data comes from repositories.
 */

import type {
  DashboardDataDTO,
  DashboardFiltersDTO,
  DashboardStatsDTO,
  DonorInfoDTO,
  OrganizationDTO,
  OrganizationProjectDTO,
  OrganizationTypeDTO,
  ProjectDTO,
  ProjectTypeDTO,
  TopDonorDTO,
} from "../dto";
import type {
  OrgRow,
  OrgAgencyRow,
  OrgProjectRow,
  ProjectThemeRow,
  ProjectAgencyRow,
} from "../repositories";
import {
  findAllOrganizations,
  findAllOrgAgencies,
  findAllOrgProjects,
  findAllProjectThemes,
  findAllProjectAgencies,
  findAllInvestmentTypes,
} from "../repositories";
import { findAllMemberStates } from "../repositories/memberStateRepository";
import { findAllAgencies } from "../repositories/agencyRepository";
import { getThemeMappings } from "./themeService";
import labels from "@/config/labels.json";

// ─────────────────────────────────────────────────────────
// Data Assembly (SQL rows → DTOs)
// ─────────────────────────────────────────────────────────

/** Build a lookup map grouping rows by a key */
function groupBy<T>(rows: T[], keyFn: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return map;
}

/** Reconstruct the raw `fields` object from SQL columns (backward compat) */
function buildFieldsObject(org: OrgRow): Record<string, unknown> {
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

/** Deduplicate a string array */
function unique(arr: string[]): string[] {
  return [...new Set(arr)];
}

/** Assemble OrganizationDTO[] from raw SQL rows (5 batch queries) */
function assembleOrganizations(
  orgs: OrgRow[],
  orgAgenciesRows: OrgAgencyRow[],
  orgProjectsRows: OrgProjectRow[],
  projectThemesRows: ProjectThemeRow[],
  projectAgenciesRows: ProjectAgencyRow[],
): OrganizationDTO[] {
  // Build lookup maps
  const orgAgenciesMap = groupBy(orgAgenciesRows, (r) => r.org_id);
  const orgProjectsMap = groupBy(orgProjectsRows, (r) => r.org_id);
  const projectThemesMap = groupBy(projectThemesRows, (r) => r.project_id);
  const projectAgenciesMap = groupBy(projectAgenciesRows, (r) => r.project_id);

  return orgs.map((org) => {
    const myAgencies = orgAgenciesMap.get(org.id) || [];
    const myProjectLinks = orgProjectsMap.get(org.id) || [];

    // Org-level donors = unique countries from org-level agencies
    const orgLevelDonors = unique(
      myAgencies.map((a) => a.country_name).filter((c): c is string => !!c),
    ).sort();

    // Org-level agencies grouped by country
    const orgAgencies: Record<string, string[]> = {};
    for (const a of myAgencies) {
      if (a.country_name && a.agency_name) {
        if (!orgAgencies[a.country_name]) orgAgencies[a.country_name] = [];
        if (!orgAgencies[a.country_name].includes(a.agency_name)) {
          orgAgencies[a.country_name].push(a.agency_name);
        }
      }
    }

    // Assemble projects
    const projectLevelDonorsSet = new Set<string>();

    const projects: ProjectDTO[] = myProjectLinks.map((pl) => {
      const themes = projectThemesMap.get(pl.project_id) || [];
      const pAgencies = projectAgenciesMap.get(pl.project_id) || [];

      const investmentTypes = unique(
        themes.map((t) => t.type_name).filter((n): n is string => !!n),
      ).sort();
      const investmentThemes = themes.map((t) => t.theme_name);

      // Project-level donors
      const projectDonorCountries = unique(
        pAgencies
          .map((a) => a.country_name)
          .filter((c): c is string => !!c),
      );
      for (const d of projectDonorCountries) projectLevelDonorsSet.add(d);

      // Project-level agencies by country
      const donorAgencies: Record<string, string[]> = {};
      for (const a of pAgencies) {
        if (a.country_name && a.agency_name) {
          if (!donorAgencies[a.country_name])
            donorAgencies[a.country_name] = [];
          if (!donorAgencies[a.country_name].includes(a.agency_name)) {
            donorAgencies[a.country_name].push(a.agency_name);
          }
        }
      }

      return {
        id: pl.project_id,
        productKey: pl.product_key || pl.project_id,
        projectName: pl.project_name,
        donorCountries: projectDonorCountries,
        donorAgencies,
        investmentTypes,
        investmentThemes,
        description: pl.project_description || "",
        projectDescription: pl.project_description || "",
        website: pl.project_website || "",
        projectWebsite: pl.project_website || "",
        isCrafdFunded: false, // Not tracked in SQL yet
        provider: org.full_name || "Unknown Provider",
        hdxSohd: pl.hdx_sohd ? "true" : undefined,
      };
    });

    // Combined donor info (org-level + project-level)
    const allDonorsSet = new Set<string>([
      ...orgLevelDonors,
      ...projectLevelDonorsSet,
    ]);
    const donorInfo: DonorInfoDTO[] = Array.from(allDonorsSet)
      .map((country) => ({
        country,
        isOrgLevel: orgLevelDonors.includes(country),
      }))
      .sort((a, b) => {
        if (a.isOrgLevel && !b.isOrgLevel) return -1;
        if (!a.isOrgLevel && b.isOrgLevel) return 1;
        return a.country.localeCompare(b.country);
      });

    const fields = buildFieldsObject(org);
    // Populate the array of project IDs that OrganizationModal reads to render the projects section
    fields["Provided Data Ecosystem Projects"] = projects.map((p) => p.id);

    return {
      id: org.id,
      organizationName: org.full_name || "Unnamed Organization",
      orgShortName: org.short_name || "",
      orgKey: org.org_key || "",
      type: org.org_type || "Unknown",
      description: org.description || "",
      donorCountries: orgLevelDonors,
      donorInfo,
      orgAgencies,
      projects,
      projectCount: projects.length,
      estimatedBudget: org.estimated_budget ?? undefined,
      fields,
    };
  });
}

// ─────────────────────────────────────────────────────────
// Member State Injection
// ─────────────────────────────────────────────────────────

function injectMemberStateDonors(
  organizations: OrganizationDTO[],
  selectedMemberStates: string[],
): OrganizationDTO[] {
  if (selectedMemberStates.length === 0) return organizations;

  return organizations.map((org) => {
    const fundingType = org.fields?.["Funding Type"];
    if (fundingType !== "Core") return org;

    const newDonorCountries = unique([
      ...org.donorCountries,
      ...selectedMemberStates,
    ]);

    const existingCountries = new Set(org.donorInfo.map((d) => d.country));
    const newDonorInfo = [...org.donorInfo];
    for (const ms of selectedMemberStates) {
      if (!existingCountries.has(ms)) {
        newDonorInfo.push({ country: ms, isOrgLevel: true });
      }
    }
    newDonorInfo.sort((a, b) => {
      if (a.isOrgLevel && !b.isOrgLevel) return -1;
      if (!a.isOrgLevel && b.isOrgLevel) return 1;
      return a.country.localeCompare(b.country);
    });

    return { ...org, donorCountries: newDonorCountries, donorInfo: newDonorInfo };
  });
}

// ─────────────────────────────────────────────────────────
// Filtering (ported from data.ts applyFilters)
// ─────────────────────────────────────────────────────────

function applyFilters(
  organizations: OrganizationDTO[],
  filters: DashboardFiltersDTO,
  countryAgenciesMap: Map<string, string[]>,
): OrganizationDTO[] {
  return organizations
    .map((org) => {
      const hasSearchFilter = !!(filters.searchQuery && filters.searchQuery.trim());
      const hasDonorFilter = !!(
        filters.donorCountries && filters.donorCountries.length > 0
      );

      // Agency filter bypass: if ALL available agencies of the selected donor are selected
      let hasAgencyFilter =
        !!(filters.donorAgencies && filters.donorAgencies.length > 0);

      if (
        hasAgencyFilter &&
        hasDonorFilter &&
        filters.donorCountries!.length === 1
      ) {
        const selectedDonor = filters.donorCountries![0];
        const allAvailable = countryAgenciesMap.get(selectedDonor) || [];
        if (
          allAvailable.length > 0 &&
          filters.donorAgencies!.length >= allAvailable.length &&
          allAvailable.every((a) => filters.donorAgencies!.includes(a))
        ) {
          hasAgencyFilter = false;
        }
      }

      const hasTypeFilter = !!(
        filters.investmentTypes && filters.investmentTypes.length > 0
      );
      const hasThemeFilter = !!(
        filters.investmentThemes && filters.investmentThemes.length > 0
      );

      // Step 1: org matches search?
      let orgMatchesSearch = false;
      if (hasSearchFilter) {
        const q = filters.searchQuery!.toLowerCase().trim();
        orgMatchesSearch =
          org.organizationName.toLowerCase().includes(q) ||
          org.type.toLowerCase().includes(q);
      }

      // Helper: project matches donor filter
      const projectMatchesDonorFilter = (p: ProjectDTO): boolean => {
        if (!hasDonorFilter) return true;
        return filters.donorCountries!.every(
          (d) => Array.isArray(p.donorCountries) && p.donorCountries.includes(d),
        );
      };

      // Helper: project matches other filters (search, type, theme)
      const projectMatchesOtherFilters = (p: ProjectDTO): boolean => {
        if (hasSearchFilter) {
          const q = filters.searchQuery!.toLowerCase().trim();
          if (!p.projectName.toLowerCase().includes(q)) return false;
        }
        if (hasTypeFilter) {
          const matchesType = p.investmentTypes.some((type) =>
            filters.investmentTypes!.some(
              (ft) =>
                type.toLowerCase().includes(ft.toLowerCase()) ||
                ft.toLowerCase().includes(type.toLowerCase()),
            ),
          );
          if (!matchesType) return false;
        }
        if (hasThemeFilter) {
          const matchesTheme =
            Array.isArray(p.investmentThemes) &&
            p.investmentThemes.some((theme) =>
              filters.investmentThemes!.some(
                (ft) =>
                  typeof theme === "string" &&
                  theme.toLowerCase().trim() === ft.toLowerCase().trim(),
              ),
            );
          if (!matchesTheme) return false;
        }
        return true;
      };

      // Org donor requirement
      const allOrgDonors =
        org.donorInfo?.map((d) => d.country) || org.donorCountries || [];
      const orgMeetsDonorRequirement =
        !hasDonorFilter ||
        filters.donorCountries!.every((d) => allOrgDonors.includes(d));

      // Org has selected agency at org level
      const orgHasSelectedAgency = (): boolean => {
        if (!hasAgencyFilter) return false;
        if (
          !hasDonorFilter ||
          !filters.donorCountries ||
          filters.donorCountries.length !== 1
        )
          return false;
        const selectedDonor = filters.donorCountries![0];
        const orgAgenciesForDonor = org.orgAgencies[selectedDonor] || [];
        return filters.donorAgencies!.some((a) =>
          orgAgenciesForDonor.includes(a),
        );
      };

      // Project matches agency filter
      const projectMatchesAgencyFilter = (p: ProjectDTO): boolean => {
        if (!hasAgencyFilter) return true;
        if (orgHasSelectedAgency()) return true;
        if (
          !hasDonorFilter ||
          !filters.donorCountries ||
          filters.donorCountries.length !== 1
        )
          return true;
        const selectedDonor = filters.donorCountries![0];
        const agenciesForDonor = p.donorAgencies?.[selectedDonor] || [];
        return filters.donorAgencies!.some((a) =>
          agenciesForDonor.includes(a),
        );
      };

      // Step 2: Determine visible projects
      let visibleProjects: ProjectDTO[] = [];

      if (orgMeetsDonorRequirement) {
        if (orgMatchesSearch) {
          // Org matches search: show all projects (apply type/theme/agency)
          visibleProjects =
            hasTypeFilter || hasThemeFilter || hasAgencyFilter
              ? org.projects.filter((p) => {
                  if (hasAgencyFilter && !projectMatchesAgencyFilter(p))
                    return false;
                  if (hasTypeFilter) {
                    if (
                      !p.investmentTypes.some((type) =>
                        filters.investmentTypes!.some(
                          (ft) =>
                            type.toLowerCase().includes(ft.toLowerCase()) ||
                            ft.toLowerCase().includes(type.toLowerCase()),
                        ),
                      )
                    )
                      return false;
                  }
                  if (hasThemeFilter) {
                    if (
                      !(
                        Array.isArray(p.investmentThemes) &&
                        p.investmentThemes.some((theme) =>
                          filters.investmentThemes!.some(
                            (ft) =>
                              typeof theme === "string" &&
                              theme.toLowerCase().trim() ===
                                ft.toLowerCase().trim(),
                          ),
                        )
                      )
                    )
                      return false;
                  }
                  return true;
                })
              : [...org.projects];
        } else if (!hasSearchFilter) {
          visibleProjects =
            hasTypeFilter || hasThemeFilter || hasAgencyFilter
              ? org.projects.filter((p) => {
                  if (hasAgencyFilter && !projectMatchesAgencyFilter(p))
                    return false;
                  if (hasTypeFilter) {
                    if (
                      !p.investmentTypes.some((type) =>
                        filters.investmentTypes!.some(
                          (ft) =>
                            type.toLowerCase().includes(ft.toLowerCase()) ||
                            ft.toLowerCase().includes(type.toLowerCase()),
                        ),
                      )
                    )
                      return false;
                  }
                  if (hasThemeFilter) {
                    if (
                      !(
                        Array.isArray(p.investmentThemes) &&
                        p.investmentThemes.some((theme) =>
                          filters.investmentThemes!.some(
                            (ft) =>
                              typeof theme === "string" &&
                              theme.toLowerCase().trim() ===
                                ft.toLowerCase().trim(),
                          ),
                        )
                      )
                    )
                      return false;
                  }
                  return true;
                })
              : [...org.projects];
        } else {
          visibleProjects = org.projects.filter(projectMatchesOtherFilters);
        }
      } else {
        visibleProjects = org.projects.filter(
          (p) =>
            projectMatchesDonorFilter(p) &&
            projectMatchesAgencyFilter(p) &&
            projectMatchesOtherFilters(p),
        );
      }

      // Step 3: Should org be shown?
      let shouldShowOrg = false;
      if (orgMeetsDonorRequirement) {
        if (
          !hasTypeFilter &&
          !hasThemeFilter &&
          !hasSearchFilter &&
          !hasAgencyFilter
        ) {
          shouldShowOrg = true;
        } else if (
          !hasTypeFilter &&
          !hasThemeFilter &&
          hasSearchFilter &&
          !hasAgencyFilter
        ) {
          shouldShowOrg = orgMatchesSearch || visibleProjects.length > 0;
        } else {
          shouldShowOrg =
            visibleProjects.length > 0 ||
            (hasAgencyFilter && orgHasSelectedAgency());
        }
      } else {
        shouldShowOrg = visibleProjects.length > 0;
      }

      if (!shouldShowOrg) return null;

      return {
        ...org,
        projects: visibleProjects,
        projectCount: visibleProjects.length,
      };
    })
    .filter((org): org is OrganizationDTO => org !== null);
}

// ─────────────────────────────────────────────────────────
// Statistics & Chart Calculations
// ─────────────────────────────────────────────────────────

function calculateStats(orgs: OrganizationDTO[]): DashboardStatsDTO {
  const donorCountries = new Set<string>();
  const uniqueProjects = new Set<string>();

  for (const org of orgs) {
    for (const c of org.donorCountries) donorCountries.add(c);
    for (const p of org.projects) {
      uniqueProjects.add(`${p.id}-${p.projectName}`);
    }
  }

  return {
    donorCountries: donorCountries.size,
    dataProviders: orgs.length,
    dataProjects: uniqueProjects.size,
  };
}

function calculateProjectTypes(
  orgs: OrganizationDTO[],
  allKnownTypes: string[],
): ProjectTypeDTO[] {
  const typeProjectSets = new Map<string, Set<string>>();
  for (const t of allKnownTypes) typeProjectSets.set(t, new Set());

  for (const org of orgs) {
    for (const p of org.projects) {
      const key = `${p.id}-${p.projectName}`;
      for (const type of p.investmentTypes) {
        let s = typeProjectSets.get(type);
        if (!s) {
          s = new Set();
          typeProjectSets.set(type, s);
        }
        s.add(key);
      }
    }
  }

  return Array.from(typeProjectSets.entries())
    .map(([name, set]) => ({ name, count: set.size }))
    .sort((a, b) => b.count - a.count);
}

function calculateOrganizationTypes(
  orgs: OrganizationDTO[],
  allKnownTypes: string[],
): OrganizationTypeDTO[] {
  const counts = new Map<string, number>();
  for (const t of allKnownTypes) counts.set(t, 0);

  for (const org of orgs) {
    if (org.type && org.type !== "Unknown") {
      counts.set(org.type, (counts.get(org.type) || 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function calculateTopCoFinancingDonors(
  orgs: OrganizationDTO[],
  excludedDonors: string[],
  limit: number,
): TopDonorDTO[] {
  const donorOrgCounts = new Map<string, Set<string>>();

  for (const org of orgs) {
    for (const d of org.donorCountries) {
      if (excludedDonors.includes(d)) continue;
      let s = donorOrgCounts.get(d);
      if (!s) {
        s = new Set();
        donorOrgCounts.set(d, s);
      }
      s.add(org.id);
    }
  }

  return Array.from(donorOrgCounts.entries())
    .map(([name, set]) => ({ name, value: set.size }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

function calculateOrganizationProjects(
  orgs: OrganizationDTO[],
): OrganizationProjectDTO[] {
  return orgs.map((org) => ({
    organizationName: org.organizationName,
    projectCount: org.projects.length,
    type: org.type,
    donorCountries: org.donorCountries,
  }));
}

function getFilterOptions(
  orgs: OrganizationDTO[],
  themeMappings: { themeToType: Record<string, string> },
) {
  const donors = new Set<string>();
  const types = new Set<string>();
  const themes = new Set<string>();

  for (const org of orgs) {
    for (const c of org.donorCountries) donors.add(c);
    for (const p of org.projects) {
      for (const t of p.investmentTypes) types.add(t);
      if (Array.isArray(p.investmentThemes)) {
        for (const th of p.investmentThemes) {
          if (typeof th === "string" && th.trim()) themes.add(th.trim());
        }
      }
    }
  }

  // Group themes by investment type
  const themesByType: Record<string, string[]> = {};
  for (const theme of themes) {
    const type = themeMappings.themeToType[theme] || "Other";
    if (!themesByType[type]) themesByType[type] = [];
    themesByType[type].push(theme);
  }
  for (const type of Object.keys(themesByType)) {
    themesByType[type].sort();
  }

  return {
    donorCountries: Array.from(donors).sort(),
    investmentTypes: Array.from(types).sort(),
    investmentThemes: Array.from(themes).sort(),
    investmentThemesByType: themesByType,
  };
}

// ─────────────────────────────────────────────────────────
// Country → Agencies Map (for agency filter bypass logic)
// ─────────────────────────────────────────────────────────

async function buildCountryAgenciesMap(): Promise<Map<string, string[]>> {
  const rows = await findAllAgencies();
  const map = new Map<string, string[]>();
  for (const row of rows) {
    if (row.country_name && row.agency_name) {
      let list = map.get(row.country_name);
      if (!list) {
        list = [];
        map.set(row.country_name, list);
      }
      if (!list.includes(row.agency_name)) list.push(row.agency_name);
    }
  }
  // Sort agencies within each country
  for (const [country, agencies] of map) {
    map.set(country, agencies.sort());
  }
  return map;
}

// ─────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────

export async function processDashboardData(
  filters: DashboardFiltersDTO = {},
): Promise<DashboardDataDTO> {
  // Load all data in parallel (5 batch queries + support data)
  const [
    orgs,
    orgAgencies,
    orgProjects,
    projectThemes,
    projectAgencies,
    memberStates,
    countryAgenciesMap,
    themeMappings,
  ] = await Promise.all([
    findAllOrganizations(),
    findAllOrgAgencies(),
    findAllOrgProjects(),
    findAllProjectThemes(),
    findAllProjectAgencies(),
    filters.showGeneralContributions !== false ? findAllMemberStates() : Promise.resolve([]),
    buildCountryAgenciesMap(),
    getThemeMappings(),
  ]);

  // Assemble
  let allOrganizations = assembleOrganizations(
    orgs,
    orgAgencies,
    orgProjects,
    projectThemes,
    projectAgencies,
  );

  // Inject member states into core-funded orgs
  const selectedMemberStates =
    filters.showGeneralContributions !== false
      ? (filters.donorCountries || []).filter((d) => memberStates.includes(d))
      : [];

  if (selectedMemberStates.length > 0) {
    allOrganizations = injectMemberStateDonors(
      allOrganizations,
      selectedMemberStates,
    );
  }

  // Apply filters
  const filtered = applyFilters(allOrganizations, filters, countryAgenciesMap);

  // Statistics
  const stats = calculateStats(filtered);
  const allKnownInvestmentTypes = Object.values(labels.investmentTypes);
  const projectTypes = calculateProjectTypes(filtered, allKnownInvestmentTypes);
  const organizationProjects = calculateOrganizationProjects(filtered);
  const topDonors = calculateTopCoFinancingDonors(
    filtered,
    filters.donorCountries || [],
    5,
  );

  // Filter options (from filtered data for donors, unfiltered for themes)
  const filterOptions = getFilterOptions(filtered, themeMappings);
  const allFilterOptions = getFilterOptions(allOrganizations, themeMappings);

  return {
    stats,
    projectTypes,
    organizationTypes: [], // Calculated on frontend with known types
    organizationProjects,
    organizationsWithProjects: filtered,
    allOrganizations,
    donorCountries: filterOptions.donorCountries,
    investmentTypes: filterOptions.investmentTypes,
    investmentThemes: allFilterOptions.investmentThemes,
    investmentThemesByType: allFilterOptions.investmentThemesByType,
    topDonors,
  };
}

/**
 * Get all organization types (for the org type chart).
 */
export async function getAllOrganizationTypes(): Promise<string[]> {
  const rows = await findAllOrganizations();
  const types = new Set<string>();
  for (const r of rows) {
    if (r.org_type) types.add(r.org_type);
  }
  return Array.from(types).sort();
}

/**
 * Public re-exports for use by other services
 */
export { calculateOrganizationTypes, calculateTopCoFinancingDonors };
