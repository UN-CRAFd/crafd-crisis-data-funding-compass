// data.ts - Data layer for Crisis Data Dashboard
// Loads organizations-nested.json and applies filtering logic

import labels from '@/config/labels.json';
import type { NestedOrganization, OrganizationProjectData, OrganizationTypeData, OrganizationWithProjects, ProjectData, ProjectTypeData } from '@/types/airtable';

// Re-export types for backward compatibility
export type { OrganizationProjectData, OrganizationTypeData, OrganizationWithProjects, ProjectData, ProjectTypeData } from '@/types/airtable';

// Load nested organizations data
let cachedNestedData: NestedOrganization[] | null = null;

async function loadNestedOrganizations(): Promise<NestedOrganization[]> {
    if (cachedNestedData) {
        return cachedNestedData;
    }

    try {
        const response = await fetch('/data/organizations-nested.json');
        if (!response.ok) {
            throw new Error(`Failed to load nested data: ${response.status}`);
        }
        cachedNestedData = await response.json();
        return cachedNestedData || [];
    } catch (error) {
        console.error('Error loading nested organizations:', error);
        return [];
    }
}

// Extract donor countries from agencies
// Helper function to safely get donor countries from organization data
function getDonorCountries(org: NestedOrganization): string[] {
    // Ensure uniqueness and sort alphabetically
    const countries = org.donor_countries || [];
    return Array.from(new Set(countries)).sort();
}

// Extract investment types from projects
function extractInvestmentTypesFromProjects(projects: Array<{ fields?: Record<string, unknown> }>): string[] {
    const types = new Set<string>();

    for (const project of projects) {
        const fields = project.fields || {};
        const investmentTypes = fields['Investment Type(s)'] || fields['Investment Types'] || [];

        if (Array.isArray(investmentTypes)) {
            investmentTypes.forEach(type => {
                if (typeof type === 'string' && type.trim()) {
                    types.add(type.trim());
                }
            });
        } else if (typeof investmentTypes === 'string' && investmentTypes.trim()) {
            // Handle comma-separated string
            investmentTypes.split(',').forEach(type => {
                const cleaned = type.trim();
                if (cleaned) {
                    types.add(cleaned);
                }
            });
        }
    }

    return Array.from(types).sort();
}

// Convert nested organization to OrganizationWithProjects format
function convertToOrganizationWithProjects(org: NestedOrganization): OrganizationWithProjects {
    const projects = org.projects || [];

    // Get pre-computed donor countries
    const donorCountries = getDonorCountries(org);

    // Convert projects to ProjectData format
    const projectsData: ProjectData[] = projects.map(project => {
        const fields = project.fields || {};
        // Extract donor countries only from the project's own agencies (if any)
        // Do NOT fall back to organization-level donor countries
        const projectAgencies = project.agencies || [];
        const projectDonorCountriesSet = new Set<string>();
        if (Array.isArray(projectAgencies) && projectAgencies.length > 0) {
            projectAgencies.forEach(a => {
                const aFields = (a && a.fields) || {};
                const c = aFields['Country Name'] || aFields['Country'] || aFields['Agency Associated Country'];
                if (Array.isArray(c)) {
                    c.forEach((cc: unknown) => { if (typeof cc === 'string' && cc.trim()) projectDonorCountriesSet.add(cc.trim()); });
                } else if (typeof c === 'string' && c.trim()) {
                    projectDonorCountriesSet.add(c.trim());
                }
            });
        }

        // Only use project-level agencies; empty array if no agencies found
        const projectDonorCountries = Array.from(projectDonorCountriesSet);

        return {
            id: project.id,
            projectName: fields['Project/Product Name'] || 'Unnamed Project',
            donorCountries: projectDonorCountries,
            investmentTypes: extractInvestmentTypesFromProjects([project]),
            investmentThemes: fields['Investment Theme(s)'] || [],
            description: fields['Project Description'] || '',
            projectDescription: fields['Project Description'] || '',
            website: fields['Project Website'] || '',
            projectWebsite: fields['Project Website'] || '',
            isCrafdFunded: fields["CRAF'd-Funded Project?"] || false,
            provider: org.name || 'Unknown Provider'
        };
    });

    // Extract organization type, handling both string and array formats
    const orgTypeRaw = org.fields?.['Org Type'];
    let orgType = 'Unknown';
    if (typeof orgTypeRaw === 'string') {
        orgType = orgTypeRaw;
    } else if (Array.isArray(orgTypeRaw) && orgTypeRaw.length > 0) {
        orgType = orgTypeRaw[0];
    }

    return {
        id: org.id,
        organizationName: org.name || 'Unnamed Organization',
        type: orgType,
        donorCountries,
        projects: projectsData,
        projectCount: projectsData.length
    };
}

// Apply dashboard filters
function applyFilters(
    organizations: OrganizationWithProjects[],
    filters: {
        searchQuery?: string;
        donorCountries?: string[];
        investmentTypes?: string[];
    }
): OrganizationWithProjects[] {
    return organizations.map(org => {
        const hasSearchFilter = filters.searchQuery && filters.searchQuery.trim();
        const hasDonorFilter = filters.donorCountries && filters.donorCountries.length > 0;
        const hasTypeFilter = filters.investmentTypes && filters.investmentTypes.length > 0;

        // Step 1: Check if organization matches search filter
        let orgMatchesSearch = false;
        if (hasSearchFilter) {
            const query = filters.searchQuery!.toLowerCase().trim();
            orgMatchesSearch = org.organizationName.toLowerCase().includes(query) ||
                org.type.toLowerCase().includes(query);
        }

        // Step 2: Determine which projects should be visible
        let visibleProjects: ProjectData[] = [];

        // Helper function to check if project matches current filters
        const projectMatchesFilters = (project: ProjectData): boolean => {
            // Search filter check
            if (hasSearchFilter) {
                const query = filters.searchQuery!.toLowerCase().trim();
                const projectMatchesSearch = project.projectName.toLowerCase().includes(query)
                if (!projectMatchesSearch) return false;
            }

            // Type filter check
            if (hasTypeFilter) {
                const projectMatchesType = project.investmentTypes.some(type =>
                    filters.investmentTypes!.some(filterType =>
                        type.toLowerCase().includes(filterType.toLowerCase()) ||
                        filterType.toLowerCase().includes(type.toLowerCase())
                    )
                );
                if (!projectMatchesType) return false;
            }

            return true;
        };

        // Check if organization meets donor requirements (gatekeeper)
        const orgMeetsDonorRequirement = !hasDonorFilter ||
            filters.donorCountries!.every(selectedDonor => org.donorCountries.includes(selectedDonor));

        if (!orgMeetsDonorRequirement) {
            // Organization doesn't meet donor requirements -> no projects can show
            visibleProjects = [];
        } else if (orgMatchesSearch) {
            // Organization matches search: show all its projects (apply type filter if exists)
            visibleProjects = hasTypeFilter
                ? org.projects.filter(project => {
                    // Only apply type filter, skip search filter since org already matches
                    if (hasTypeFilter) {
                        return project.investmentTypes.some(type =>
                            filters.investmentTypes!.some(filterType =>
                                type.toLowerCase().includes(filterType.toLowerCase()) ||
                                filterType.toLowerCase().includes(type.toLowerCase())
                            )
                        );
                    }
                    return true;
                })
                : [...org.projects];
        } else if (!hasSearchFilter) {
            // No search filter: apply type filter if exists, otherwise show all projects
            visibleProjects = hasTypeFilter
                ? org.projects.filter(project => {
                    return project.investmentTypes.some(type =>
                        filters.investmentTypes!.some(filterType =>
                            type.toLowerCase().includes(filterType.toLowerCase()) ||
                            filterType.toLowerCase().includes(type.toLowerCase())
                        )
                    );
                })
                : [...org.projects];
        } else {
            // Organization doesn't match search, check individual projects
            visibleProjects = org.projects.filter(projectMatchesFilters);
        }

        // Step 3: Decide if organization should be shown
        let shouldShowOrg = false;

        if (orgMeetsDonorRequirement) {
            if (!hasTypeFilter && !hasSearchFilter) {
                // No filters except donor: show all orgs that meet donor requirement
                shouldShowOrg = true;
            } else if (!hasTypeFilter && hasSearchFilter) {
                // Only search filter: show org if it matches search OR has projects matching search
                shouldShowOrg = orgMatchesSearch || visibleProjects.length > 0;
            } else {
                // Type filter active: only show if org has visible projects (projects that match type+search)
                shouldShowOrg = visibleProjects.length > 0;
            }
        }

        if (!shouldShowOrg) {
            return null;
        }

        // Return organization with visible projects
        return {
            ...org,
            projects: visibleProjects,
            projectCount: visibleProjects.length
        };
    }).filter((org): org is OrganizationWithProjects => org !== null);
}

// Calculate dashboard statistics
function calculateDashboardStats(organizations: OrganizationWithProjects[]): DashboardStats {
    const donorCountries = new Set<string>();
    const dataProviders = organizations.length;
    const uniqueProjects = new Set<string>();

    organizations.forEach(org => {
        org.donorCountries.forEach(country => donorCountries.add(country));
        // Deduplicate projects by ID and name to avoid counting the same project multiple times
        org.projects.forEach(project => {
            // Use both ID and name for better deduplication
            const projectKey = `${project.id}-${project.projectName}`;
            uniqueProjects.add(projectKey);
        });
    });

    return {
        donorCountries: donorCountries.size,
        dataProviders,
        dataProjects: uniqueProjects.size
    };
}

// Calculate project types for chart
function calculateProjectTypes(organizations: OrganizationWithProjects[], allKnownInvestmentTypes: string[]): ProjectTypeData[] {
    // Use Map of Sets to deduplicate projects within each investment type
    const typeProjectSets = new Map<string, Set<string>>();

    // Initialize with all known investment types
    allKnownInvestmentTypes.forEach(type => {
        typeProjectSets.set(type, new Set<string>());
    });

    organizations.forEach(org => {
        org.projects.forEach(project => {
            // Create unique project identifier
            const projectKey = `${project.id}-${project.projectName}`;

            project.investmentTypes.forEach(type => {
                // Add project to the set for this type (automatically deduplicates)
                if (typeProjectSets.has(type)) {
                    typeProjectSets.get(type)!.add(projectKey);
                } else {
                    // Handle investment types not in the known list
                    const newSet = new Set<string>();
                    newSet.add(projectKey);
                    typeProjectSets.set(type, newSet);
                }
            });
        });
    });

    // Convert sets to counts
    return Array.from(typeProjectSets.entries())
        .map(([name, projectSet]) => ({ name, count: projectSet.size }))
        .sort((a, b) => b.count - a.count);
}

// Calculate organization types for chart
export function calculateOrganizationTypesFromOrganizationsWithProjects(
    organizations: OrganizationWithProjects[],
    allKnownTypes: string[]
): OrganizationTypeData[] {
    const typeCounts = new Map<string, number>();

    // Initialize with all known types
    allKnownTypes.forEach(type => {
        typeCounts.set(type, 0);
    });

    // Count actual organizations
    organizations.forEach(org => {
        if (org.type && org.type !== 'Unknown') {
            typeCounts.set(org.type, (typeCounts.get(org.type) || 0) + 1);
        }
    });

    return Array.from(typeCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
}

// Calculate top co-financing donors (excluding selected donors)
export function calculateTopCoFinancingDonors(
    organizations: OrganizationWithProjects[],
    excludedDonors: string[] = [],
    limit: number = 5
): Array<{ name: string; value: number }> {
    const donorOrgCounts = new Map<string, Set<string>>();

    // Count unique organizations each donor funds
    organizations.forEach(org => {
        org.donorCountries.forEach(donor => {
            // Skip excluded donors
            if (excludedDonors.includes(donor)) {
                return;
            }

            if (!donorOrgCounts.has(donor)) {
                donorOrgCounts.set(donor, new Set<string>());
            }
            // Add organization ID to this donor's set (automatically deduplicates)
            donorOrgCounts.get(donor)!.add(org.id);
        });
    });

    // Convert to array with counts and sort
    return Array.from(donorOrgCounts.entries())
        .map(([name, orgSet]) => ({ name, value: orgSet.size }))
        .sort((a, b) => b.value - a.value)
        .slice(0, limit);
}

// Calculate organization-project data
function calculateOrganizationProjects(organizations: OrganizationWithProjects[]): OrganizationProjectData[] {
    return organizations.map(org => ({
        organizationName: org.organizationName,
        projectCount: org.projects.length,
        type: org.type
    }));
}

// Get available filter options
function getAvailableFilterOptions(organizations: OrganizationWithProjects[]) {
    const donorCountries = new Set<string>();
    const investmentTypes = new Set<string>();

    organizations.forEach(org => {
        org.donorCountries.forEach(country => donorCountries.add(country));
        org.projects.forEach(project => {
            project.investmentTypes.forEach(type => investmentTypes.add(type));
        });
    });

    return {
        donorCountries: Array.from(donorCountries).sort(),
        investmentTypes: Array.from(investmentTypes).sort()
    };
}

// Main function to process dashboard data with filters
export async function processDashboardData(filters: {
    searchQuery?: string;
    donorCountries?: string[];
    investmentTypes?: string[];
} = {}) {
    try {
        // Load nested organizations
        const nestedOrgs = await loadNestedOrganizations();

        // Convert to OrganizationWithProjects format
        const allOrganizations = nestedOrgs.map(convertToOrganizationWithProjects);

        // Apply filters
        const filteredOrganizations = applyFilters(allOrganizations, filters);

        // Calculate statistics and chart data
        const stats = calculateDashboardStats(filteredOrganizations);

        // Get all known investment types from labels
        const allKnownInvestmentTypes = Object.values(labels.investmentTypes);
        const projectTypes = calculateProjectTypes(filteredOrganizations, allKnownInvestmentTypes);
        const organizationProjects = calculateOrganizationProjects(filteredOrganizations);

        // Calculate top co-financing donors (excluding selected donors)
        const topDonors = calculateTopCoFinancingDonors(
            filteredOrganizations,
            filters.donorCountries || [],
            5
        );

        // Get available filter options from all organizations (not filtered)
        const filterOptions = getAvailableFilterOptions(allOrganizations);

        return {
            stats,
            projectTypes,
            organizationTypes: [], // Will be calculated separately with all known types
            organizationProjects,
            organizationsWithProjects: filteredOrganizations,
            allOrganizations, // Add unfiltered organizations for modal use
            donorCountries: filterOptions.donorCountries,
            investmentTypes: filterOptions.investmentTypes,
            topDonors // Add top co-financing donors
        };
    } catch (error) {
        console.error('Error processing dashboard data:', error);
        throw error;
    }
}

// Legacy function for backward compatibility
export async function loadEcosystemData() {
    return processDashboardData();
}

// Export interface for dashboard stats
export interface DashboardStats {
    donorCountries: number;
    dataProviders: number;
    dataProjects: number;
}

// Helper functions for modal data processing

/**
 * Build a map from project ID to project name for quick lookup
 * Used by modals to resolve project IDs to human-readable names
 */
export function buildProjectNameMap(organizations: NestedOrganization[]): Record<string, string> {
    const map: Record<string, string> = {};
    
    organizations.forEach(org => {
        (org.projects || []).forEach(project => {
            if (project && project.id) {
                const fields = project.fields || {};
                const name = (fields['Project/Product Name'] || fields['Project Name']) as string || '';
                map[project.id] = String(name || '').trim() || project.id;
            }
        });
    });
    
    return map;
}

/**
 * Build a map from organization ID to its projects with investment types
 * Used by organization modal to display project investment types
 */
export function buildOrgProjectsMap(organizations: NestedOrganization[]): Record<string, Array<{ investmentTypes: string[] }>> {
    const map: Record<string, Array<{ investmentTypes: string[] }>> = {};
    
    organizations.forEach(org => {
        if (org && org.id) {
            const projects = (org.projects || []).map(project => {
                const fields = project?.fields || {};
                const investmentTypes = fields['Investment Type(s)'] || fields['Investment Types'] || [];
                return {
                    investmentTypes: Array.isArray(investmentTypes) ? investmentTypes : []
                };
            });
            map[org.id] = projects;
        }
    });
    
    return map;
}

/**
 * Get nested organization data for modal use
 * Returns the raw nested organization structure
 */
export async function getNestedOrganizationsForModals(): Promise<NestedOrganization[]> {
    return loadNestedOrganizations();
}

/**
 * Build a map from organization ID to donor countries
 * Used by modals to display organization donor countries
 */
export function buildOrgDonorCountriesMap(organizations: NestedOrganization[]): Record<string, string[]> {
    const map: Record<string, string[]> = {};
    
    organizations.forEach(org => {
        if (org && org.id) {
            map[org.id] = getDonorCountries(org);
        }
    });
    
    return map;
}
