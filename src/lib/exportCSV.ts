// exportCSV.ts - CSV export functionality for Crisis Data Dashboard
import JSZip from 'jszip';
import type { OrganizationWithProjects, ProjectData } from '@/types/airtable';

/**
 * Escape CSV field value by wrapping in quotes if it contains special characters
 */
function escapeCSVField(value: unknown): string {
    if (value === null || value === undefined) {
        return '';
    }
    
    const stringValue = String(value);
    
    // If the field contains comma, quote, or newline, wrap it in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
}

/**
 * Convert array to CSV string
 */
function arrayToCSV(data: string[][]): string {
    return data.map(row => row.map(escapeCSVField).join(',')).join('\n');
}

/**
 * Generate Organizations CSV
 */
export function generateOrganizationsCSV(organizations: OrganizationWithProjects[]): string {
    // CSV Headers
    const headers = [
        'Organization Name',
        'Organization Type',
        'Description',
        'Supporting Donors',
    ];
    
    // Generate rows
    const rows = organizations.map(org => {
        // Get unique investment types from all projects
        const investmentTypesSet = new Set<string>();
        org.projects.forEach(project => {
            project.investmentTypes.forEach(type => investmentTypesSet.add(type));
        });
        const investmentTypes = Array.from(investmentTypesSet).sort().join('; ');
        
        // Format supporting countries
        const supportingCountries = org.donorCountries.sort().join('; ');
        
        return [
            org.organizationName,
            org.type,
            org.description || '',
            supportingCountries,
        ];
    });
    
    return arrayToCSV([headers, ...rows]);
}

/**
 * Generate Projects CSV
 */
export function generateProjectsCSV(organizations: OrganizationWithProjects[]): string {
    // CSV Headers
    const headers = [
        'Asset Name',
        'Organization Name',
        'Asset Types',
        'Supporting Donors',
        'Description',
        'Website'
    ];
    
    // First pass: collect all projects with their organizations
    // Use a Map to group by unique asset identifier (ID + name)
    const assetMap = new Map<string, {
        projectName: string;
        organizations: string[];
        investmentTypes: Set<string>;
        donorCountries: Set<string>;
        description: string;
        website: string;
    }>();
    
    organizations.forEach(org => {
        org.projects.forEach(project => {
            // Create unique key for this asset
            const assetKey = `${project.id}-${project.projectName}`;
            
            if (assetMap.has(assetKey)) {
                // Asset already exists, add this organization to the list
                const existing = assetMap.get(assetKey)!;
                existing.organizations.push(org.organizationName);
                
                // Merge investment types
                project.investmentTypes.forEach(type => existing.investmentTypes.add(type));
                
                // Merge donor countries
                const donors = project.donorCountries.length > 0 ? project.donorCountries : org.donorCountries;
                donors.forEach(donor => existing.donorCountries.add(donor));
            } else {
                // New asset, create entry
                const donors = project.donorCountries.length > 0 ? project.donorCountries : org.donorCountries;
                assetMap.set(assetKey, {
                    projectName: project.projectName,
                    organizations: [org.organizationName],
                    investmentTypes: new Set(project.investmentTypes),
                    donorCountries: new Set(donors),
                    description: project.projectDescription || project.description || '',
                    website: project.projectWebsite || project.website || ''
                });
            }
        });
    });
    
    // Second pass: convert Map to rows
    const rows: string[][] = [];
    assetMap.forEach(asset => {
        rows.push([
            asset.projectName,
            asset.organizations.join('; '), // Combine multiple organizations with semicolon
            Array.from(asset.investmentTypes).sort().join('; '),
            Array.from(asset.donorCountries).sort().join('; '),
            asset.description,
            asset.website
        ]);
    });
    
    return arrayToCSV([headers, ...rows]);
}

/**
 * Generate README file with export information
 */
function generateReadme(
    organizations: OrganizationWithProjects[],
    filterInfo: {
        searchQuery?: string;
        donorCountries?: string[];
        investmentTypes?: string[];
        totalOrganizations: number;
        totalProjects: number;
    }
): string {
    const timestamp = new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
    });

    let readme = `# Crisis Data Funding Compass - Data Export\n\n`;
    readme += `Export Date: ${timestamp}\n\n`;
    readme += `## About This Dataset\n\n`;
    readme += `This export contains data from the Crisis Data Funding Compass, an overview of the crisis data funding ecosystem. The dataset includes information about organizations providing crisis data products and services, along with details about their specific assets/projects. The data set is subject to expansion and correction.\n\n`;
    
    readme += `## Export Contents\n\n`;
    readme += `This export includes two CSV files:\n\n`;
    readme += `1. organizations.csv - Information about data provider organizations\n`;
    readme += `   - Organization Name\n`;
    readme += `   - Organization Type\n`;
    readme += `   - Description\n`;
    readme += `   - Supporting Donors (donor donors funding the organization)\n`;
    readme += `   - Investment Types (types of data assets provided)\n\n`;
    readme += `2. assets.csv - Information about specific data products/projects\n`;
    readme += `   - Asset Name\n`;
    readme += `   - Organization Name (provider)\n`;
    readme += `   - Investment Types\n`;
    readme += `   - Investment Themes\n`;
    readme += `   - Supporting Donors\n`;
    readme += `   - Description\n`;
    readme += `   - Website\n\n`;
    
    readme += `## Current View Filters\n\n`;
    
    const hasFilters = filterInfo.searchQuery || 
                      (filterInfo.donorCountries && filterInfo.donorCountries.length > 0) || 
                      (filterInfo.investmentTypes && filterInfo.investmentTypes.length > 0);
    
    if (hasFilters) {
        readme += `This export represents a filtered view of the data with the following criteria:\n\n`;
        
        if (filterInfo.donorCountries && filterInfo.donorCountries.length > 0) {
            readme += `Donor Countries: ${filterInfo.donorCountries.join(', ')}\n`;
        }
        
        if (filterInfo.investmentTypes && filterInfo.investmentTypes.length > 0) {
            readme += `Investment Types: ${filterInfo.investmentTypes.join(', ')}\n`;
        }
        
        if (filterInfo.searchQuery) {
            readme += `Search Query: "${filterInfo.searchQuery}"\n`;
        }
        
        readme += `\n`;
    } else {
        readme += `This export contains the complete dataset with no filters applied.\n\n`;
    }
    
    readme += `## Data Summary\n\n`;
    readme += `- Total Organizations: ${filterInfo.totalOrganizations}\n`;
    readme += `- Total Assets/Projects: ${filterInfo.totalProjects}\n`;
    readme += `- Unique Donor Countries: ${new Set(organizations.flatMap(org => org.donorCountries)).size}\n\n`;
    
    readme += `## Data Notes\n\n`;
    readme += `- Multiple values in a single field are separated by semicolons (;)\n`;
    readme += `- Empty fields indicate that information was not available\n`;
    readme += `- Supporting Countries refers to donor countries that fund the organization or asset\n`;
    readme += `- For assets without specific donor information, organization-level donors are used\n\n`;
    
    readme += `## Source\n\n`;
    readme += `This data is maintained by the Complex Risk Analytics Fund (CRAF'd).\n`;
    readme += `For more information, visit: https://crafd.io\n\n`;
    readme += `For questions about this dataset, please contact CRAF'd through the feedback form in the Crisis Data Funding Compass.\n`;
    
    return readme;
}

/**
 * Export current view as CSV (zipped folder with organizations and projects CSVs)
 */
export async function exportViewAsCSV(
    organizations: OrganizationWithProjects[],
    filterInfo?: {
        searchQuery?: string;
        donorCountries?: string[];
        investmentTypes?: string[];
    }
): Promise<void> {
    try {
        // Calculate totals with deduplication
        // Use the same deduplication logic as in data.ts
        const uniqueProjects = new Set<string>();
        organizations.forEach(org => {
            org.projects.forEach(project => {
                // Use both ID and name for deduplication (same as data.ts)
                const projectKey = `${project.id}-${project.projectName}`;
                uniqueProjects.add(projectKey);
            });
        });
        const totalProjects = uniqueProjects.size;
        
        // Generate CSV strings
        const organizationsCSV = generateOrganizationsCSV(organizations);
        const projectsCSV = generateProjectsCSV(organizations);
        
        // Generate README
        const readme = generateReadme(organizations, {
            ...filterInfo,
            totalOrganizations: organizations.length,
            totalProjects
        });
        
        // Generate timestamp in ISO 8601 format (YYYY-MM-DD)
        const timestamp = new Date().toISOString().split('T')[0];
        
        // Create a new JSZip instance
        const zip = new JSZip();
        
        // Create a folder with timestamp in the zip
        const folder = zip.folder(`crisis-data-export-${timestamp}`);
        if (!folder) {
            throw new Error('Failed to create folder in zip');
        }
        
        // Add files to the timestamped folder
        folder.file('README.txt', readme);
        folder.file(`organizations-${timestamp}.csv`, organizationsCSV);
        folder.file(`assets-${timestamp}.csv`, projectsCSV);
        
        // Generate zip file
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        // Create download link
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename with timestamp
        link.download = `crisis-data-export-${timestamp}.zip`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting CSV:', error);
        throw error;
    }
}
