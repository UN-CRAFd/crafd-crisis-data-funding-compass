// Essential Airtable types for ecosystem dashboard

export type AirtableFieldValue =
    | string
    | number
    | boolean
    | string[]
    | number[]
    | null
    | undefined;

export interface AirtableRecord<T = Record<string, AirtableFieldValue>> {
    id: string;
    fields: T;
    createdTime: string;
}

// Nested organization structure from organizations-nested.json
export interface NestedOrganization {
    id: string;
    name: string;
    fields: Record<string, any>;
    donor_countries: string[];
    agencies: Array<{
        id: string;
        fields: Record<string, any>;
        createdTime?: string;
        agencies?: Array<{
            id: string;
            fields: Record<string, any>;
            createdTime?: string;
        }>;
    }>;
    projects: Array<{
        id: string;
        fields: Record<string, any>;
        createdTime?: string;
        agencies?: Array<{
            id: string;
            fields: Record<string, any>;
            createdTime?: string;
        }>;
    }>;
}

// Dashboard data structures
export interface DashboardStats {
    donorCountries: number;
    dataProviders: number;
    dataProjects: number;
}

export interface ProjectData {
    id: string;
    projectName: string;
    donorCountries: string[];
    investmentTypes: string[];
    investmentThemes: string[];
    description: string;
    projectDescription: string;
    website: string;
    projectWebsite: string;
    isCrafdFunded: boolean | string;
    provider: string;
    productKey: string;
    hdxSohd?: string;
}

export interface OrganizationWithProjects {
    id: string;
    organizationName: string;
    orgShortName: string;
    type: string;
    description?: string;
    donorCountries: string[];
    projects: ProjectData[];
    projectCount: number;
    estimatedBudget?: number;
}

export interface ProjectTypeData {
    name: string;
    count: number;
}

export interface OrganizationTypeData {
    name: string;
    count: number;
}

export interface OrganizationProjectData {
    organizationName: string;
    projectCount: number;
    type: string;
}

export interface DashboardFilters {
    searchQuery?: string;
    donorCountries?: string[];
    investmentTypes?: string[];
    investmentThemes?: string[];
}