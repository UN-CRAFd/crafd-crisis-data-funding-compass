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
        'Number of Assets',
        'Supporting Countries',
        'Investment Types'
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
            org.projects.length.toString(),
            supportingCountries,
            investmentTypes
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
        'Investment Types',
        'Investment Themes',
        'Supporting Countries',
        'Description',
        'Website'
    ];
    
    // Generate rows - flatten all projects from all organizations
    const rows: string[][] = [];
    
    organizations.forEach(org => {
        org.projects.forEach(project => {
            rows.push([
                project.projectName,
                org.organizationName,
                project.investmentTypes.join('; '),
                project.investmentThemes ? project.investmentThemes.join('; ') : '',
                project.donorCountries.length > 0 ? project.donorCountries.sort().join('; ') : org.donorCountries.sort().join('; '),
                project.projectDescription || project.description || '',
                project.projectWebsite || project.website || ''
            ]);
        });
    });
    
    return arrayToCSV([headers, ...rows]);
}

/**
 * Export current view as CSV (zipped folder with organizations and projects CSVs)
 */
export async function exportViewAsCSV(organizations: OrganizationWithProjects[]): Promise<void> {
    try {
        // Generate CSV strings
        const organizationsCSV = generateOrganizationsCSV(organizations);
        const projectsCSV = generateProjectsCSV(organizations);
        
        // Create a new JSZip instance
        const zip = new JSZip();
        
        // Add CSV files to zip
        zip.file('organizations.csv', organizationsCSV);
        zip.file('assets.csv', projectsCSV);
        
        // Generate zip file
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        // Create download link
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        
        // Generate filename with timestamp
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
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
