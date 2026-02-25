/**
 * Data Transfer Objects (DTOs)
 *
 * These types define the exact shapes returned by the API layer.
 * They must match the contracts that the frontend already consumes.
 * Any transformation from database rows to these shapes happens in the service layer.
 */

// ─────────────────────────────────────────────────────────
// Core DTOs matching existing frontend types
// ─────────────────────────────────────────────────────────

export interface DonorInfoDTO {
  country: string;
  isOrgLevel: boolean;
}

export interface ProjectDTO {
  id: string;
  productKey: string;
  projectName: string;
  donorCountries: string[];
  donorAgencies: Record<string, string[]>;
  investmentTypes: string[];
  investmentThemes: string[];
  description: string;
  projectDescription: string;
  website: string;
  projectWebsite: string;
  isCrafdFunded: boolean | string;
  provider: string;
  hdxSohd?: string;
}

export interface OrganizationDTO {
  id: string;
  orgKey: string;
  organizationName: string;
  orgShortName: string;
  type: string;
  description?: string;
  donorCountries: string[];
  donorInfo: DonorInfoDTO[];
  orgAgencies: Record<string, string[]>;
  projects: ProjectDTO[];
  projectCount: number;
  estimatedBudget?: number;
  fields?: Record<string, unknown>;
}

export interface DashboardStatsDTO {
  donorCountries: number;
  dataProviders: number;
  dataProjects: number;
}

export interface ProjectTypeDTO {
  name: string;
  count: number;
}

export interface OrganizationTypeDTO {
  name: string;
  count: number;
}

export interface OrganizationProjectDTO {
  organizationName: string;
  projectCount: number;
  type: string;
  donorCountries: string[];
}

export interface TopDonorDTO {
  name: string;
  value: number;
}

// ─────────────────────────────────────────────────────────
// Dashboard API response — must match the return of processDashboardData()
// ─────────────────────────────────────────────────────────

export interface DashboardDataDTO {
  stats: DashboardStatsDTO;
  projectTypes: ProjectTypeDTO[];
  organizationTypes: OrganizationTypeDTO[];
  organizationProjects: OrganizationProjectDTO[];
  organizationsWithProjects: OrganizationDTO[];
  allOrganizations: OrganizationDTO[];
  donorCountries: string[];
  investmentTypes: string[];
  investmentThemes: string[];
  investmentThemesByType: Record<string, string[]>;
  topDonors: TopDonorDTO[];
}

// ─────────────────────────────────────────────────────────
// Filter DTOs
// ─────────────────────────────────────────────────────────

export interface DashboardFiltersDTO {
  searchQuery?: string;
  donorCountries?: string[];
  donorAgencies?: string[];
  investmentTypes?: string[];
  investmentThemes?: string[];
  showGeneralContributions?: boolean;
}

// ─────────────────────────────────────────────────────────
// Theme / Agency / Member State DTOs
// ─────────────────────────────────────────────────────────

export interface ThemeMappingsDTO {
  themeToType: Record<string, string>;
  themeToKey: Record<string, string>;
  keyToThemes: Record<string, string[]>;
}

export interface AgencyDTO {
  name: string;
  country: string;
  website?: string;
}

// ─────────────────────────────────────────────────────────
// Modal data DTOs — used by build*Map functions
// ─────────────────────────────────────────────────────────

export interface ModalMapsDTO {
  projectNameMap: Record<string, string>;
  projectIdToKeyMap: Record<string, string>;
  projectDescriptionMap: Record<string, string>;
  orgProjectsMap: Record<
    string,
    Array<{ id: string; investmentTypes: string[] }>
  >;
  orgDonorCountriesMap: Record<string, string[]>;
  orgDonorInfoMap: Record<string, DonorInfoDTO[]>;
  orgAgenciesMap: Record<string, Record<string, string[]>>;
  orgProjectDonorsMap: Record<string, Record<string, string[]>>;
  orgProjectDonorAgenciesMap: Record<
    string,
    Record<string, Record<string, string[]>>
  >;
  projectAgenciesMap: Record<string, Record<string, string[]>>;
}

// ─────────────────────────────────────────────────────────
// IATI DTO (passthrough — already stored in JSON within the DB)
// ─────────────────────────────────────────────────────────

export interface IATIOrganizationDataDTO {
  org_ref: string;
  org_name: string;
  activities: unknown[];
  transaction_summary: unknown;
  activity_summary: unknown;
  stats: {
    total_activities: number;
    stored_activities: number;
    total_transactions: number;
  };
}
