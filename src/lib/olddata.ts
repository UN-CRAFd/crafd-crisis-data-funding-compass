/**
 * Export all organizations with their types to a JSON file
 * @param organizations Array of OrganizationWithProjects
 * @param outputPath Path to output JSON file
 */

/**
 * Calculate organization type distribution from organizationsWithProjects array
 * Counts types based on the 'type' property assigned to each organization
 */
export function calculateOrganizationTypesFromOrganizationsWithProjects(
    organizations: OrganizationWithProjects[],
    allTypes?: string[]
): OrganizationTypeData[] {
    // Use allTypes to get the complete list of types, or infer from organizations
    const types = allTypes || Array.from(new Set(organizations.map(org => org.type)));
    // Count organizations per type
    const typeCount: Record<string, number> = {};
    types.forEach(type => {
        typeCount[type] = 0;
    });
    organizations.forEach(org => {
        // Defensive: skip if type is missing
        if (org.type && typeCount.hasOwnProperty(org.type)) {
            typeCount[org.type]++;
        }
    });
    const colors = [
        'bg-gradient-to-r from-cyan-400 to-cyan-500',
        'bg-gradient-to-r from-cyan-500 to-cyan-600',
        'bg-gradient-to-r from-cyan-600 to-cyan-700',
        'bg-gradient-to-r from-blue-500 to-blue-600',
        'bg-gradient-to-r from-blue-600 to-blue-700',
        'bg-gradient-to-r from-indigo-500 to-indigo-600',
        'bg-gradient-to-r from-indigo-600 to-indigo-700'
    ];
    const total = Object.values(typeCount).reduce((sum, count) => sum + count, 0);
    return Object.entries(typeCount)
        .sort(([, valueA], [, valueB]) => valueB - valueA)
        .map(([name, value], index) => ({
            name,
            value,
            percentage: total > 0 ? Math.round((value / total) * 100) : 0,
            color: colors[index % colors.length]
        }));
}

// Test utility for organization type counting
export function _test_organizationTypeCounting() {
    const sample: OrganizationWithProjects[] = [
        { id: 'org-1', organizationName: 'OrgA', donorCountries: [], type: 'UN', projects: [] },
        { id: 'org-2', organizationName: 'OrgB', donorCountries: [], type: 'NGO', projects: [] },
        { id: 'org-3', organizationName: 'OrgC', donorCountries: [], type: 'UN', projects: [] },
        { id: 'org-4', organizationName: 'OrgD', donorCountries: [], type: 'Gov', projects: [] },
        { id: 'org-5', organizationName: 'OrgE', donorCountries: [], type: 'NGO', projects: [] },
        { id: 'org-6', organizationName: 'OrgF', donorCountries: [], type: 'Unknown', projects: [] },
    ];
    const result = calculateOrganizationTypesFromOrganizationsWithProjects(sample);
    console.log('Test org type chart:', result);
    return result;
}
/**
 * Ecosystem Data Processing
 * Processes data from ecosystem-table.json for dashboard display
 */

// Types for ecosystem data
export interface EcosystemRecord {
    id: string;
    // Use unknown instead of any to satisfy lint rules; callers should narrow before use
    fields: Record<string, unknown>;
    createdTime: string;
}

export interface DashboardStats {
    dataProjects: number;
    dataProviders: number;
    donorCountries: number;
}

export interface ProjectTypeData {
    name: string;
    value: number;
    percentage: number;
    color: string;
}

export interface OrganizationTypeData {
    name: string;
    value: number;
    percentage: number;
    color: string;
}

export interface OrganizationProjectData {
    id: string;
    organization: string;
    type: string;
    projects: number;
    funding: string;
    categories: string[];
    status: string;
}

export interface ProjectData {
    id: string;
    projectName: string;
    donorCountries: string[];
    investmentTypes: string[];
    investmentThemes: string[];
    projectWebsite: string | null;
    isCrafdFunded: string;
    projectDescription: string | null;
}

export interface OrganizationWithProjects {
    id: string;
    organizationName: string;
    donorCountries: string[];
    type: string;
    projects: ProjectData[];
}

export interface DashboardFilters {
    combinedDonors?: string[];
    investmentTypes?: string[];
    searchQuery?: string;
}

/**
 * Split a string by commas while respecting commas within parentheses and quotes
 */
function splitRespectingParentheses(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let parenthesesDepth = 0;
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < str.length; i++) {
        const char = str[i];

        if ((char === '"' || char === "'") && !inQuotes) {
            // Starting a quoted section
            inQuotes = true;
            quoteChar = char;
            current += char;
        } else if (char === quoteChar && inQuotes) {
            // Ending a quoted section
            inQuotes = false;
            quoteChar = '';
            current += char;
        } else if (char === '(' && !inQuotes) {
            parenthesesDepth++;
            current += char;
        } else if (char === ')' && !inQuotes) {
            parenthesesDepth--;
            current += char;
        } else if (char === ',' && parenthesesDepth === 0 && !inQuotes) {
            // Only split on commas outside of parentheses and quotes
            if (current.trim()) {
                result.push(current.trim());
            }
            current = '';
        } else {
            current += char;
        }
    }

    // Add the last part
    if (current.trim()) {
        result.push(current.trim());
    }

    // Clean up quotes from the results
    return result.map(item => {
        let cleaned = item.trim();
        // Remove surrounding quotes if they exist
        if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
            (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
            cleaned = cleaned.slice(1, -1);
        }
        return cleaned;
    });
}

/**
 * Load ecosystem data from static JSON file
 */
export async function loadEcosystemData(): Promise<EcosystemRecord[]> {
    try {
        const response = await fetch('/data/ecosystem-table.json');
        if (!response.ok) {
            throw new Error(`Failed to load data: ${response.statusText}`);
        }
        const data = await response.json();
        console.log('Loaded ecosystem data:', data.length, 'records');
        return data;
    } catch (error) {
        console.error('Error loading ecosystem data:', error);
        throw error;
    }
}

/**
 * Apply filters to ecosystem records
 */
export function applyFilters(records: EcosystemRecord[], filters: DashboardFilters): EcosystemRecord[] {
    let filteredRecords = [...records];

    // Filter by Combined Donors (check donor countries field) - multi-select
    if (filters.combinedDonors && filters.combinedDonors.length > 0) {
        filteredRecords = filteredRecords.filter(record => {
            const donorField = record.fields['Org Donor Countries (based on Agency) (from Provider Org Full Name)'];
            if (!donorField || typeof donorField !== 'string') return false;

            // Check if ANY of the selected donors is in the comma-separated list
            const donors = donorField.split(',').map(d => d.trim());
            return filters.combinedDonors!.some(selectedDonor =>
                donors.some(donor =>
                    donor.toLowerCase().includes(selectedDonor.toLowerCase()) ||
                    selectedDonor.toLowerCase().includes(donor.toLowerCase())
                )
            );
        });
    }

    // Filter by Investment Types - multi-select
    if (filters.investmentTypes && filters.investmentTypes.length > 0) {
        filteredRecords = filteredRecords.filter(record => {
            const investmentField = record.fields['Investment Type(s)'];
            if (!investmentField || typeof investmentField !== 'string') return false;

            // Check if ANY of the selected investment types matches
            return filters.investmentTypes!.some(selectedType =>
                investmentField.toLowerCase().includes(selectedType.toLowerCase())
            );
        });
    }

    // Filter by Search Query (search across multiple fields)
    if (filters.searchQuery && filters.searchQuery.trim() !== '') {
        const searchTerm = filters.searchQuery.toLowerCase().trim();
        filteredRecords = filteredRecords.filter(record => {
            const fields = record.fields;

            // Search in project name
            const projectName = fields['Project/Product Name'] || fields['Project Name'] || '';
            if (typeof projectName === 'string' && projectName.toLowerCase().includes(searchTerm)) {
                return true;
            }

            // Search in organization name
            const orgName = fields['Provider Org Full Name'] || '';
            if (typeof orgName === 'string' && orgName.toLowerCase().includes(searchTerm)) {
                return true;
            }

            return false;
        });
    }

    console.log(`Filtered from ${records.length} to ${filteredRecords.length} records`, filters);
    return filteredRecords;
}

/**
 * Calculate main dashboard statistics
 */
export function calculateDashboardStats(records: EcosystemRecord[]): DashboardStats {
    // Simply count total records
    const dataProjects = records.length;
    // Handle comma-separated organizations in single records
    const uniqueOrgs = new Set<string>();

    records.forEach(record => {
        const orgField = record.fields['Provider Org Full Name'];
        if (orgField && typeof orgField === 'string') {
            // Split by comma respecting parentheses and clean up each organization name
            const orgs = splitRespectingParentheses(orgField)
                .filter((org: string) => org.length > 0);
            orgs.forEach((org: string) => uniqueOrgs.add(org));
        }
    });

    // Count unique donors using the organizations table field that backs the donors list/table
    // (Org Donor Countries (based on Agency) (from Provider Org Full Name))
    const uniqueDonorCountries = new Set<string>();

    records.forEach(record => {
        const donorField = record.fields['Org Donor Countries (based on Agency) (from Provider Org Full Name)'];
        if (donorField && typeof donorField === 'string') {
            // Field is a comma-separated list of donor country names; split and clean
            const donors = donorField.split(',')
                .map((d: string) => d.trim())
                .filter((d: string) => d.length > 0);
            donors.forEach((d: string) => uniqueDonorCountries.add(d));
        }
    });

    console.log(`🔄 Calculated stats: ${dataProjects} projects, ${uniqueOrgs.size} orgs, ${uniqueDonorCountries.size} countries`);

    return {
        dataProjects: dataProjects,
        dataProviders: uniqueOrgs.size,
        donorCountries: uniqueDonorCountries.size
    };
}

/**
 * Calculate project type distribution
 * Always returns all possible investment types, even if count is 0
 */
export function calculateProjectTypes(records: EcosystemRecord[], allRecords?: EcosystemRecord[]): ProjectTypeData[] {
    // Use allRecords to get the complete list of types, or fall back to records if not provided
    const recordsForTypes = allRecords || records;

    // Get all unique investment types from the entire dataset first
    const allTypes = getUniqueInvestmentTypes(recordsForTypes);

    // Initialize counts for all types
    const typeCount: Record<string, number> = {};
    allTypes.forEach(type => {
        typeCount[type] = 0;
    });

    // Count actual occurrences from the (possibly filtered) records
    records.forEach(record => {
        const fields = record.fields;
        const projectType = fields['Investment Type(s)'];

        if (projectType && typeof projectType === 'string') {
            const individualTypes = splitRespectingParentheses(projectType);
            individualTypes.forEach(individualType => {
                const trimmed = individualType.trim();
                if (trimmed.length > 0 && typeCount.hasOwnProperty(trimmed)) {
                    typeCount[trimmed]++;
                }
            });
        }
    });

    const colors = [
        'bg-gradient-to-r from-orange-400 to-orange-500',
        'bg-gradient-to-r from-amber-400 to-amber-500',
        'bg-gradient-to-r from-emerald-400 to-emerald-500',
        'bg-gradient-to-r from-violet-400 to-violet-500',
        'bg-gradient-to-r from-rose-400 to-rose-500',
        'bg-gradient-to-r from-teal-400 to-teal-500'
    ];

    const total = Object.values(typeCount).reduce((sum, count) => sum + count, 0);

    // Return ALL types sorted by value (highest first)
    return Object.entries(typeCount)
        .sort(([, valueA], [, valueB]) => valueB - valueA) // Sort by value, highest first
        .map(([name, value], index) => ({
            name,
            value,
            percentage: total > 0 ? Math.round((value / total) * 100) : 0,
            color: colors[index % colors.length]
        }));
}

/**
 * Calculate organization type distribution
 * Always returns all possible organization types, even if count is 0
 */
export function calculateOrganizationTypes(records: EcosystemRecord[], allRecords?: EcosystemRecord[]): OrganizationTypeData[] {
    // Use allRecords to get the complete list of types, or fall back to records if not provided
    const recordsForTypes = allRecords || records;

    // Get all unique organization types from the entire dataset first
    const allTypes = getUniqueOrganizationTypes(recordsForTypes);

    // Initialize with all types mapped to empty sets
    const typeToOrgsMap: Record<string, Set<string>> = {};
    allTypes.forEach(type => {
        typeToOrgsMap[type] = new Set<string>();
    });

    // Count from the (possibly filtered) records
    records.forEach(record => {
        const fields = record.fields;

        // Get organization name(s) - handle comma-separated organizations
        const orgName = fields['Provider Org Full Name'];
        if (!orgName || typeof orgName !== 'string') return;
        // Always split by comma, then trim, then apply splitRespectingParentheses to each part for robustness
        const organizations = orgName
            .split(',')
            .map(part => part.trim())
            .flatMap(part => splitRespectingParentheses(part))
            .filter((org: string) => org.length > 0);

        // Get organization type(s) - handle comma-separated types
        const orgType = fields['Organization Type'];

        if (orgType && typeof orgType === 'string') {
            // Split organization types by comma and process each type
            const individualTypes = orgType.split(',').map(t => t.trim()).filter(t => t.length > 0);

            individualTypes.forEach(individualType => {
                // Only process if this type exists in our master list
                if (typeToOrgsMap.hasOwnProperty(individualType)) {
                    // Add each organization to this type's set (ensures uniqueness)
                    organizations.forEach((singleOrgName: string) => {
                        typeToOrgsMap[individualType].add(singleOrgName);
                    });
                }
            });
        }
    });

    // Convert sets to counts
    const typeCount: Record<string, number> = {};
    Object.entries(typeToOrgsMap).forEach(([type, orgSet]) => {
        typeCount[type] = orgSet.size;
    });

    const colors = [
        'bg-gradient-to-r from-cyan-400 to-cyan-500',
        'bg-gradient-to-r from-cyan-500 to-cyan-600',
        'bg-gradient-to-r from-cyan-600 to-cyan-700',
        'bg-gradient-to-r from-blue-500 to-blue-600',
        'bg-gradient-to-r from-blue-600 to-blue-700',
        'bg-gradient-to-r from-indigo-500 to-indigo-600',
        'bg-gradient-to-r from-indigo-600 to-indigo-700'
    ];

    const total = Object.values(typeCount).reduce((sum, count) => sum + count, 0);

    // Return ALL types sorted by value (highest first)
    return Object.entries(typeCount)
        .sort(([, valueA], [, valueB]) => valueB - valueA) // Sort by value, highest first
        .map(([name, value], index) => ({
            name,
            value,
            percentage: total > 0 ? Math.round((value / total) * 100) : 0,
            color: colors[index % colors.length]
        }));
}

/**
 * Process organization project data for table display
 */
export function processOrganizationData(records: EcosystemRecord[]): OrganizationProjectData[] {
    type OrgAgg = {
        id: string;
        organization: string;
        type: string;
        projects: number;
        funding: number;
        categories: Set<string>;
        status: string;
    };

    const organizationMap = new Map<string, OrgAgg>();

    records.forEach(record => {
        const fields = record.fields;

        // Get organization name from Provider Org Full Name
        const orgName = fields['Provider Org Full Name'];
        if (!orgName || typeof orgName !== 'string') return;

        // Handle comma-separated organizations, respecting commas within parentheses
        const organizations = splitRespectingParentheses(orgName).filter((org: string) => org.length > 0);

        organizations.forEach((singleOrgName: string) => {
            if (!organizationMap.has(singleOrgName)) {
                organizationMap.set(singleOrgName, {
                    id: `org-${singleOrgName.replace(/[^a-zA-Z0-9]/g, '-')}`,
                    organization: singleOrgName,
                    type: (fields['Organization Type'] as string) || 'Unknown',
                    projects: 0,
                    funding: 0,
                    categories: new Set<string>(),
                    status: (fields.Status as string) || 'Active'
                });
            }

            const org = organizationMap.get(singleOrgName)!;
            org.projects += 1;

            // Add funding if available (from Est. Project Budget field)
            const funding = parseFloat((fields['Est. Project Budget [2024, $M]'] as string) || '0');
            if (!isNaN(funding)) {
                org.funding += funding;
            }

            // Add investment type categories
            const investmentTypes = fields['Investment Type(s)'];
            if (investmentTypes && typeof investmentTypes === 'string') {
                const individualTypes = (investmentTypes as string).split(',').map(t => t.trim()).filter(t => t.length > 0);
                individualTypes.forEach(type => org.categories.add(type));
            }
        });
    });

    return Array.from(organizationMap.values())
        .map(org => ({
            ...org,
            funding: org.funding > 0 ? `$${(org.funding / 1000000).toFixed(1)}M` : 'N/A',
            categories: Array.from(org.categories).slice(0, 3) // Limit to 3 categories
        }))
        .sort((a, b) => b.projects - a.projects)
        .slice(0, 10); // Top 10 organizations
}

/**
 * Process organizations with all their projects (unfiltered)
 */
export function processOrganizationsWithProjects(records: EcosystemRecord[]): OrganizationWithProjects[] {
    const organizationMap = new Map<string, OrganizationWithProjects>();

    records.forEach(record => {
        const fields = record.fields;

        // Get organization name from Provider Org Full Name
        const orgName = fields['Provider Org Full Name'];
        if (!orgName || typeof orgName !== 'string') return;

        // Handle comma-separated organizations, respecting commas within parentheses
        const organizations = splitRespectingParentheses(orgName).filter((org: string) => org.length > 0);

        // Get organization type(s) - handle comma-separated types, assign by position
        const orgTypeField = fields['Organization Type'];
        let types: string[] = [];
        if (orgTypeField && typeof orgTypeField === 'string') {
            types = orgTypeField.split(',').map(t => t.trim()).filter(t => t.length > 0);
        }

        organizations.forEach((singleOrgName: string, idx: number) => {
            // Assign type by position; fallback to last type or 'Unknown'
            let orgType = 'Unknown';
            if (types.length > 0) {
                orgType = types[idx] !== undefined ? types[idx] : types[types.length - 1];
            }

            if (!organizationMap.has(singleOrgName)) {
                // Get donor countries for this organization
                const donorCountriesField = fields['Org Donor Countries (based on Agency) (from Provider Org Full Name)'];
                let donorCountries: string[] = [];

                if (donorCountriesField && typeof donorCountriesField === 'string') {
                    donorCountries = donorCountriesField.split(',').map(country => country.trim()).filter(country => country.length > 0);
                }

                organizationMap.set(singleOrgName, {
                    id: `org-${singleOrgName.replace(/[^a-zA-Z0-9]/g, '-')}`,
                    organizationName: singleOrgName,
                    donorCountries: donorCountries,
                    type: orgType,
                    projects: []
                });
            }

            const org = organizationMap.get(singleOrgName)!;

            // Create project data
            const projectDonorCountriesField = fields['Project Donor Countries (based on Agency)'] as unknown;
            let projectDonorCountries: string[] = [];

            if (projectDonorCountriesField && typeof projectDonorCountriesField === 'string') {
                projectDonorCountries = (projectDonorCountriesField as string).split(',').map(country => country.trim()).filter(country => country.length > 0);
            }

            const investmentTypesField = fields['Investment Type(s)'] as unknown;
            let investmentTypes: string[] = [];

            if (investmentTypesField && typeof investmentTypesField === 'string') {
                investmentTypes = (investmentTypesField as string).split(',').map(type => type.trim()).filter(type => type.length > 0);
            }

            // Get investment themes
            const investmentThemesField = fields['Investment Theme(s)'] as unknown;
            let investmentThemes: string[] = [];

            if (typeof investmentThemesField === 'string' && investmentThemesField.trim()) {
                investmentThemes = splitRespectingParentheses(investmentThemesField as string).filter(Boolean);
            } else {
                investmentThemes = [];
            }

            // Use the proper project name from the "Project/Product Name" field
            const projectName = (fields['Project/Product Name'] as string) ||
                (fields['Project Name'] as string) ||
                (fields['Name'] as string) ||
                (fields['Title'] as string) ||
                `Unnamed Project ${record.id}`;

            org.projects.push({
                id: record.id,
                projectName: projectName,
                donorCountries: projectDonorCountries,
                investmentTypes: investmentTypes,
                investmentThemes: investmentThemes,
                projectWebsite: (fields['Project Website'] as string) || null,
                isCrafdFunded: (fields[`CRAF’d-Funded Project?`] as string) || 'NO',
                projectDescription: (fields['Project Description'] as string) || null
            });
        });
    });

    // Sort organizations by name and limit projects per organization for display
    return Array.from(organizationMap.values())
        .sort((a, b) => a.organizationName.localeCompare(b.organizationName));
}

/**
 * Get unique donor countries from all records
 */
export function getUniqueDonorCountries(records: EcosystemRecord[]): string[] {
    const donorsSet = new Set<string>();

    records.forEach(record => {
        const donorField = record.fields['Org Donor Countries (based on Agency) (from Provider Org Full Name)'];
        if (donorField && typeof donorField === 'string') {
            const donors = donorField.split(',').map(d => d.trim()).filter(d => d.length > 0);
            donors.forEach(donor => donorsSet.add(donor));
        }
    });

    return Array.from(donorsSet).sort();
}

/**
 * Get unique investment types from all records
 */
export function getUniqueInvestmentTypes(records: EcosystemRecord[]): string[] {
    const typesSet = new Set<string>();

    records.forEach(record => {
        const investmentField = record.fields['Investment Type(s)'];
        if (investmentField && typeof investmentField === 'string') {
            const types = splitRespectingParentheses(investmentField);
            types.forEach(type => {
                const trimmed = type.trim();
                if (trimmed.length > 0) {
                    typesSet.add(trimmed);
                }
            });
        }
    });

    return Array.from(typesSet).sort();
}

/**
 * Get unique organization types from all records
 */
export function getUniqueOrganizationTypes(records: EcosystemRecord[]): string[] {
    const typesSet = new Set<string>();

    records.forEach(record => {
        const orgTypeField = record.fields['Organization Type'];
        if (orgTypeField && typeof orgTypeField === 'string') {
            const types = orgTypeField.split(',').map(t => t.trim()).filter(t => t.length > 0);
            types.forEach(type => {
                typesSet.add(type);
            });
        }
    });

    return Array.from(typesSet).sort();
}

/**
 * Process all dashboard data with optional filters
 */
export async function processDashboardData(filters: DashboardFilters = {}) {
    try {
        const allRecords = await loadEcosystemData();

        // Get unique options from ALL records (not filtered) for dropdowns
        const donorCountries = getUniqueDonorCountries(allRecords);
        const investmentTypes = getUniqueInvestmentTypes(allRecords);

        // Apply filters at the beginning - all calculations use filtered data
        const filteredRecords = applyFilters(allRecords, filters);

        const stats = calculateDashboardStats(filteredRecords);

        // Pass allRecords as second parameter so charts always show all categories
        const projectTypes = calculateProjectTypes(filteredRecords, allRecords);
        const organizationTypes = calculateOrganizationTypes(filteredRecords, allRecords);
        const organizationProjects = processOrganizationData(filteredRecords);

        // Process organizations with projects using filtered records
        const organizationsWithProjects = processOrganizationsWithProjects(filteredRecords);

        return {
            stats,
            projectTypes,
            organizationTypes,
            organizationProjects,
            organizationsWithProjects,
            donorCountries,
            investmentTypes,
            totalRecords: allRecords.length,
            filteredRecords: filteredRecords.length
        };
    } catch (error) {
        console.error('Error processing dashboard data:', error);
        throw error;
    }
}
