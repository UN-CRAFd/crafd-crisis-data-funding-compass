/**
 * useProjectCounts Hook
 * Shared filtering and counting logic for project types and themes
 */

import { useMemo } from 'react';
import type { OrganizationWithProjects } from '@/types/airtable';

interface ProjectCountsParams {
    organizations: OrganizationWithProjects[];
    combinedDonors: string[];
    appliedSearchQuery: string;
    investmentTypes: string[];
    investmentThemes: string[];
}

interface ProjectCounts {
    projectCountsByType: Record<string, number>;
    projectCountsByTheme: Record<string, number>;
}

/**
 * Calculate project counts by type and theme based on current filters
 * - For type counts: filters by donors, search, and themes (but not types themselves)
 * - For theme counts: filters by donors, search, and types (but not themes themselves)
 */
export function useProjectCounts({
    organizations,
    combinedDonors,
    appliedSearchQuery,
    investmentTypes,
    investmentThemes
}: ProjectCountsParams): ProjectCounts {
    
    const projectCountsByType = useMemo(() => {
        const projectsByType: Record<string, Set<string>> = {};
        
        organizations.forEach(org => {
            // Check if org meets donor requirements at org level
            const orgMeetsDonorRequirement = combinedDonors.length === 0 ||
                combinedDonors.every(selectedDonor => org.donorCountries.includes(selectedDonor));

            org.projects.forEach(project => {
                // If org doesn't meet donor requirement, check project-level donors
                if (!orgMeetsDonorRequirement) {
                    const projectMeetsDonorRequirement = combinedDonors.every(selectedDonor =>
                        Array.isArray(project.donorCountries) && project.donorCountries.includes(selectedDonor)
                    );
                    if (!projectMeetsDonorRequirement) return;
                }

                // Filter by search query
                if (appliedSearchQuery) {
                    const searchLower = appliedSearchQuery.toLowerCase();
                    const matchesSearch =
                        project.projectName?.toLowerCase().includes(searchLower) ||
                        project.description?.toLowerCase().includes(searchLower) ||
                        org.organizationName?.toLowerCase().includes(searchLower);
                    if (!matchesSearch) return;
                }

                // Filter by themes (not by types - we're counting types)
                if (investmentThemes.length > 0) {
                    const hasMatchingTheme = project.investmentThemes?.some(theme =>
                        investmentThemes.some(selectedTheme =>
                            theme.toLowerCase().trim() === selectedTheme.toLowerCase().trim()
                        )
                    );
                    if (!hasMatchingTheme) return;
                }

                // Count this project for each of its types
                project.investmentTypes?.forEach(type => {
                    const normalizedType = type.toLowerCase().trim();
                    if (!projectsByType[normalizedType]) {
                        projectsByType[normalizedType] = new Set();
                    }
                    projectsByType[normalizedType].add(project.id);
                });
            });
        });

        // Convert Sets to counts
        const counts: Record<string, number> = {};
        Object.keys(projectsByType).forEach(type => {
            counts[type] = projectsByType[type].size;
        });
        return counts;
    }, [organizations, combinedDonors, appliedSearchQuery, investmentThemes]);

    const projectCountsByTheme = useMemo(() => {
        const projectsByTheme: Record<string, Set<string>> = {};
        
        organizations.forEach(org => {
            // Check if org meets donor requirements at org level
            const orgMeetsDonorRequirement = combinedDonors.length === 0 ||
                combinedDonors.every(selectedDonor => org.donorCountries.includes(selectedDonor));

            org.projects.forEach(project => {
                // If org doesn't meet donor requirement, check project-level donors
                if (!orgMeetsDonorRequirement) {
                    const projectMeetsDonorRequirement = combinedDonors.every(selectedDonor =>
                        Array.isArray(project.donorCountries) && project.donorCountries.includes(selectedDonor)
                    );
                    if (!projectMeetsDonorRequirement) return;
                }

                // Filter by search query
                if (appliedSearchQuery) {
                    const searchLower = appliedSearchQuery.toLowerCase();
                    const matchesSearch =
                        project.projectName?.toLowerCase().includes(searchLower) ||
                        project.description?.toLowerCase().includes(searchLower) ||
                        org.organizationName?.toLowerCase().includes(searchLower);
                    if (!matchesSearch) return;
                }

                // Filter by types (not by themes - we're counting themes)
                if (investmentTypes.length > 0) {
                    const hasMatchingType = project.investmentTypes?.some(type =>
                        investmentTypes.some(selectedType =>
                            type.toLowerCase().trim() === selectedType.toLowerCase().trim()
                        )
                    );
                    if (!hasMatchingType) return;
                }

                // Count this project for each of its themes
                project.investmentThemes?.forEach(theme => {
                    const normalizedTheme = theme.toLowerCase().trim();
                    if (!projectsByTheme[normalizedTheme]) {
                        projectsByTheme[normalizedTheme] = new Set();
                    }
                    projectsByTheme[normalizedTheme].add(project.id);
                });
            });
        });

        // Convert Sets to counts
        const counts: Record<string, number> = {};
        Object.keys(projectsByTheme).forEach(theme => {
            counts[theme] = projectsByTheme[theme].size;
        });
        return counts;
    }, [organizations, combinedDonors, appliedSearchQuery, investmentTypes]);

    return {
        projectCountsByType,
        projectCountsByTheme
    };
}
