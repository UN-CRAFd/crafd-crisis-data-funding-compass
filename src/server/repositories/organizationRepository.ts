/**
 * Organization Repository
 *
 * All SQL queries related to organizations, projects, agencies, and their relationships.
 * Returns raw database rows — no business logic here.
 */

import { queryRows } from "../db";

// ─────────────────────────────────────────────────────────
// Row types (database result shapes)
// ─────────────────────────────────────────────────────────

export interface OrgRow {
  id: string;
  org_key: string | null;
  full_name: string | null;
  short_name: string | null;
  website: string | null;
  description: string | null;
  estimated_budget: number | null;
  programme_budget: number | null;
  budget_source: string | null;
  budget_source_link: string | null;
  hdx_org_key: string | null;
  iati_org_key: string | null;
  mptfo_name: string | null;
  mptfo_url: string | null;
  transparency_portal_url: string | null;
  data_products_overview_url: string | null;
  funding_type: string | null;
  last_updated: string | null;
  org_type: string | null;
  hq_country: string | null;
}

export interface OrgAgencyRow {
  org_id: string;
  agency_id: string;
  agency_name: string;
  agency_website: string | null;
  country_name: string | null;
}

export interface OrgProjectRow {
  org_id: string;
  project_id: string;
  product_key: string | null;
  project_name: string;
  project_description: string | null;
  project_website: string | null;
  hdx_sohd: boolean | null;
}

export interface ProjectThemeRow {
  project_id: string;
  theme_name: string;
  theme_key: string | null;
  theme_desc: string | null;
  type_name: string | null;
}

export interface ProjectAgencyRow {
  project_id: string;
  agency_id: string;
  agency_name: string;
  agency_website: string | null;
  country_name: string | null;
}

// ─────────────────────────────────────────────────────────
// Queries
// ─────────────────────────────────────────────────────────

/**
 * Fetch all organizations with their type and HQ country.
 */
export async function findAllOrganizations(): Promise<OrgRow[]> {
  return queryRows<OrgRow>(`
    SELECT
      o.id,
      o.org_key,
      o.full_name,
      o.short_name,
      o.website,
      o.description,
      o.estimated_budget,
      o.programme_budget,
      o.budget_source,
      o.budget_source_link,
      o.hdx_org_key,
      o.iati_org_key,
      o.mptfo_name,
      o.mptfo_url,
      o.transparency_portal_url,
      o.data_products_overview_url,
      o.funding_type,
      o.last_updated::text,
      ot.name AS org_type,
      c.name  AS hq_country
    FROM organizations o
    LEFT JOIN organization_types ot ON o.organization_type_id = ot.id
    LEFT JOIN countries c ON o.country_id = c.id
    ORDER BY o.full_name
  `);
}

/**
 * Fetch all org-level agency funding relationships.
 * Returns which agencies fund each organization, with country names.
 */
export async function findAllOrgAgencies(): Promise<OrgAgencyRow[]> {
  return queryRows<OrgAgencyRow>(`
    SELECT
      aof.organization_id AS org_id,
      a.id                AS agency_id,
      a.name              AS agency_name,
      a.website           AS agency_website,
      c.name              AS country_name
    FROM agency_organization_funding aof
    JOIN agencies a ON aof.agency_id = a.id
    LEFT JOIN countries c ON a.country_id = c.id
    ORDER BY c.name, a.name
  `);
}

/**
 * Fetch all organization–project relationships with project details.
 */
export async function findAllOrgProjects(): Promise<OrgProjectRow[]> {
  return queryRows<OrgProjectRow>(`
    SELECT
      op.organization_id AS org_id,
      p.id               AS project_id,
      p.product_key,
      p.name             AS project_name,
      p.description      AS project_description,
      p.website          AS project_website,
      p.hdx_sohd
    FROM organization_project op
    JOIN projects p ON op.project_id = p.id
    ORDER BY p.name
  `);
}

/**
 * Fetch all project–theme relationships with theme and type names.
 */
export async function findAllProjectThemes(): Promise<ProjectThemeRow[]> {
  return queryRows<ProjectThemeRow>(`
    SELECT
      pt.project_id,
      t.name        AS theme_name,
      t.theme_key,
      t.description AS theme_desc,
      tp.name       AS type_name
    FROM project_themes pt
    JOIN themes t ON pt.theme_id = t.id
    LEFT JOIN types tp ON t.type_id = tp.id
    ORDER BY tp.name, t.name
  `);
}

/**
 * Fetch all project-level agency funding relationships.
 * Returns which agencies fund each project at the project level.
 */
export async function findAllProjectAgencies(): Promise<ProjectAgencyRow[]> {
  return queryRows<ProjectAgencyRow>(`
    SELECT
      apf.project_id,
      a.id      AS agency_id,
      a.name    AS agency_name,
      a.website AS agency_website,
      c.name    AS country_name
    FROM agency_project_funding apf
    JOIN agencies a ON apf.agency_id = a.id
    LEFT JOIN countries c ON a.country_id = c.id
    ORDER BY c.name, a.name
  `);
}

/**
 * Fetch all known organization types.
 */
export async function findAllOrganizationTypes(): Promise<string[]> {
  const rows = await queryRows<{ name: string }>(
    "SELECT name FROM organization_types ORDER BY name",
  );
  return rows.map((r) => r.name);
}

/**
 * Fetch all known investment types.
 */
export async function findAllInvestmentTypes(): Promise<string[]> {
  const rows = await queryRows<{ name: string }>(
    "SELECT name FROM types ORDER BY name",
  );
  return rows.map((r) => r.name);
}
