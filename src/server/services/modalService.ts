/**
 * Modal Service
 *
 * Builds all the lookup maps used by OrganizationModal, ProjectModal,
 * and DonorModal. Replaces the client-side build*Map() functions that
 * previously operated on the static nestedOrganizationsRaw import.
 */

import type { DonorInfoDTO, ModalMapsDTO } from "../dto";
import {
  findAllOrganizations,
  findAllOrgAgencies,
  findAllOrgProjects,
  findAllProjectThemes,
  findAllProjectAgencies,
} from "../repositories";
import type {
  OrgAgencyRow,
  OrgProjectRow,
  ProjectThemeRow,
  ProjectAgencyRow,
} from "../repositories";

/**
 * Build all modal maps in a single call (avoids repeated DB round-trips).
 */
export async function buildModalMaps(): Promise<ModalMapsDTO> {
  const [orgs, orgAgencies, orgProjects, projectThemes, projectAgencies] =
    await Promise.all([
      findAllOrganizations(),
      findAllOrgAgencies(),
      findAllOrgProjects(),
      findAllProjectThemes(),
      findAllProjectAgencies(),
    ]);

  // Group rows by ID
  const orgAgenciesByOrg = group(orgAgencies, (r) => r.org_id);
  const orgProjectsByOrg = group(orgProjects, (r) => r.org_id);
  const themesByProject = group(projectThemes, (r) => r.project_id);
  const agenciesByProject = group(projectAgencies, (r) => r.project_id);

  // Build maps
  const projectNameMap: Record<string, string> = {};
  const projectIdToKeyMap: Record<string, string> = {};
  const projectDescriptionMap: Record<string, string> = {};
  const orgProjectsMap: Record<
    string,
    Array<{ id: string; investmentTypes: string[] }>
  > = {};
  const orgDonorCountriesMap: Record<string, string[]> = {};
  const orgDonorInfoMap: Record<string, DonorInfoDTO[]> = {};
  const orgAgenciesMap: Record<string, Record<string, string[]>> = {};
  const orgProjectDonorsMap: Record<string, Record<string, string[]>> = {};
  const orgProjectDonorAgenciesMap: Record<
    string,
    Record<string, Record<string, string[]>>
  > = {};
  const projectAgenciesMap: Record<string, Record<string, string[]>> = {};

  // Populate project-level maps
  for (const projs of orgProjectsByOrg.values()) {
    for (const p of projs) {
      projectNameMap[p.project_id] = p.project_name || p.project_id;
      if (p.product_key) projectIdToKeyMap[p.project_id] = p.product_key;
      projectDescriptionMap[p.project_id] = p.project_description || "";
    }
  }

  // Also populate projectAgenciesMap (project → country → agencies)
  for (const [projectId, pAgencies] of agenciesByProject) {
    const countryToAgencies: Record<string, string[]> = {};
    for (const a of pAgencies) {
      if (a.country_name && a.agency_name) {
        if (!countryToAgencies[a.country_name])
          countryToAgencies[a.country_name] = [];
        if (!countryToAgencies[a.country_name].includes(a.agency_name))
          countryToAgencies[a.country_name].push(a.agency_name);
      }
    }
    projectAgenciesMap[projectId] = countryToAgencies;
  }

  // Populate org-level maps
  for (const org of orgs) {
    const myAgencies = orgAgenciesByOrg.get(org.id) || [];
    const myProjects = orgProjectsByOrg.get(org.id) || [];

    // orgProjectsMap
    orgProjectsMap[org.id] = myProjects.map((p) => {
      const themes = themesByProject.get(p.project_id) || [];
      const investmentTypes = [
        ...new Set(themes.map((t) => t.type_name).filter(Boolean)),
      ] as string[];
      return { id: p.project_id, investmentTypes };
    });

    // orgDonorCountriesMap (org-level donors only)
    const orgLevelDonors = [
      ...new Set(
        myAgencies
          .map((a) => a.country_name)
          .filter((c): c is string => !!c),
      ),
    ].sort();
    orgDonorCountriesMap[org.id] = orgLevelDonors;

    // orgDonorInfoMap (combined org + project level)
    const projectLevelDonors = new Set<string>();
    for (const p of myProjects) {
      const pAgencies = agenciesByProject.get(p.project_id) || [];
      for (const a of pAgencies) {
        if (a.country_name) projectLevelDonors.add(a.country_name);
      }
    }
    const allDonorsSet = new Set<string>([
      ...orgLevelDonors,
      ...projectLevelDonors,
    ]);
    orgDonorInfoMap[org.id] = Array.from(allDonorsSet)
      .map((country) => ({
        country,
        isOrgLevel: orgLevelDonors.includes(country),
      }))
      .sort((a, b) => {
        if (a.isOrgLevel && !b.isOrgLevel) return -1;
        if (!a.isOrgLevel && b.isOrgLevel) return 1;
        return a.country.localeCompare(b.country);
      });

    // orgAgenciesMap (org-level: country → agency names)
    const countryToAgencies: Record<string, string[]> = {};
    for (const a of myAgencies) {
      if (a.country_name && a.agency_name) {
        if (!countryToAgencies[a.country_name])
          countryToAgencies[a.country_name] = [];
        if (!countryToAgencies[a.country_name].includes(a.agency_name))
          countryToAgencies[a.country_name].push(a.agency_name);
      }
    }
    orgAgenciesMap[org.id] = countryToAgencies;

    // orgProjectDonorsMap (project-level: country → project names)
    const countryToProjects: Record<string, string[]> = {};
    for (const p of myProjects) {
      const pAgencies = agenciesByProject.get(p.project_id) || [];
      for (const a of pAgencies) {
        if (a.country_name && p.project_name) {
          if (!countryToProjects[a.country_name])
            countryToProjects[a.country_name] = [];
          if (!countryToProjects[a.country_name].includes(p.project_name))
            countryToProjects[a.country_name].push(p.project_name);
        }
      }
    }
    orgProjectDonorsMap[org.id] = countryToProjects;

    // orgProjectDonorAgenciesMap (country → project → agencies)
    const countryToProjectAgencies: Record<
      string,
      Record<string, string[]>
    > = {};
    for (const p of myProjects) {
      const pAgencies = agenciesByProject.get(p.project_id) || [];
      for (const a of pAgencies) {
        if (a.country_name && p.project_name && a.agency_name) {
          if (!countryToProjectAgencies[a.country_name])
            countryToProjectAgencies[a.country_name] = {};
          if (!countryToProjectAgencies[a.country_name][p.project_name])
            countryToProjectAgencies[a.country_name][p.project_name] = [];
          if (
            !countryToProjectAgencies[a.country_name][p.project_name].includes(
              a.agency_name,
            )
          )
            countryToProjectAgencies[a.country_name][p.project_name].push(
              a.agency_name,
            );
        }
      }
    }
    orgProjectDonorAgenciesMap[org.id] = countryToProjectAgencies;
  }

  return {
    projectNameMap,
    projectIdToKeyMap,
    projectDescriptionMap,
    orgProjectsMap,
    orgDonorCountriesMap,
    orgDonorInfoMap,
    orgAgenciesMap,
    orgProjectDonorsMap,
    orgProjectDonorAgenciesMap,
    projectAgenciesMap,
  };
}

/**
 * Build data needed by DonorModal — reconstructs the nested organization
 * structure with agencies and projects that DonorModal expects.
 */
export async function getNestedOrganizationsForDonorModal(): Promise<
  Array<{
    id: string;
    name: string;
    fields: Record<string, unknown>;
    agencies: Array<{ id: string; fields: Record<string, unknown> }>;
    projects: Array<{
      id: string;
      fields: Record<string, unknown>;
      agencies: Array<{ id: string; fields: Record<string, unknown> }>;
    }>;
  }>
> {
  const [orgs, orgAgencies, orgProjects, projectThemes, projectAgencies] =
    await Promise.all([
      findAllOrganizations(),
      findAllOrgAgencies(),
      findAllOrgProjects(),
      findAllProjectThemes(),
      findAllProjectAgencies(),
    ]);

  const orgAgenciesByOrg = group(orgAgencies, (r) => r.org_id);
  const orgProjectsByOrg = group(orgProjects, (r) => r.org_id);
  const themesByProject = group(projectThemes, (r) => r.project_id);
  const agenciesByProject = group(projectAgencies, (r) => r.project_id);

  return orgs.map((org) => {
    const myAgencies = orgAgenciesByOrg.get(org.id) || [];
    const myProjects = orgProjectsByOrg.get(org.id) || [];

    return {
      id: org.id,
      name: org.full_name || org.short_name || "",
      fields: {
        "Org Full Name": org.full_name,
        "Org Short Name": org.short_name,
        "org_key": org.org_key,
        "Org Type": org.org_type,
        "Org HQ Country": org.hq_country,
        "Funding Type": org.funding_type,
        "Org Description": org.description,
        "Est. Org Budget": org.estimated_budget,
        "Org Website": org.website,
      },
      agencies: myAgencies.map((a) => ({
        id: a.agency_id,
        fields: {
          "Country Name": a.country_name,
          "Agency/Department Name": a.agency_name,
          "Agency Website": a.agency_website,
        },
      })),
      projects: myProjects.map((p) => {
        const themes = themesByProject.get(p.project_id) || [];
        const pAgencies = agenciesByProject.get(p.project_id) || [];

        return {
          id: p.project_id,
          fields: {
            "Project/Product Name": p.project_name,
            "product_key": p.product_key,
            "Project Description": p.project_description,
            "Project Website": p.project_website,
            "HDX_SOHD": p.hdx_sohd,
            "Investment Type(s)": [
              ...new Set(
                themes.map((t) => t.type_name).filter(Boolean),
              ),
            ],
            "Investment Theme(s)": themes.map((t) => t.theme_name),
          },
          agencies: pAgencies.map((a) => ({
            id: a.agency_id,
            fields: {
              "Country Name": a.country_name,
              "Agency/Department Name": a.agency_name,
              "Agency Website": a.agency_website,
            },
          })),
        };
      }),
    };
  });
}

// Utility
function group<T>(rows: T[], keyFn: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyFn(row);
    const list = map.get(key);
    if (list) list.push(row);
    else map.set(key, [row]);
  }
  return map;
}
