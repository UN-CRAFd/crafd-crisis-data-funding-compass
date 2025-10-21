'use client';

import type { DashboardFilters, DashboardStats, OrganizationProjectData, OrganizationTypeData, OrganizationWithProjects, ProjectTypeData } from '../types/airtable';
import { processDashboardData } from '../lib/data';
import { typeLabelToSlug, typeSlugToLabel } from '@/lib/urlShortcuts';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import CrisisDataDashboard from './CrisisDataDashboard';

/**
 * Wrapper component that handles routing, URL params, and data fetching.
 * Passes data and callbacks down to the presentational CrisisDataDashboard component.
 */
const CrisisDataDashboardWrapper = ({ logoutButton }: { logoutButton?: React.ReactNode }) => {
    // URL-based routing for filters
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Get filter values from URL (comma-separated for multi-select)
    // Using compact query keys: donors -> d, types -> t, search -> q
    // Read compact keys but fall back to legacy long keys for compatibility
    const combinedDonors = useMemo(() => {
        const raw = searchParams.get('d') ?? searchParams.get('donors');
        return raw?.split(',').filter(Boolean) || [];
    }, [searchParams]);
    const investmentTypes = useMemo(() => {
        const raw = searchParams.get('t') ?? searchParams.get('types');
        // raw values are slugs in the URL; convert to display labels for app use
        const items = raw?.split(',').filter(Boolean) || [];
        const labels = items.map(item => typeSlugToLabel(item));
        // Deduplicate case-insensitively
        const seen = new Set<string>();
        return labels.filter(label => {
            const normalized = label.toLowerCase().trim();
            if (seen.has(normalized)) return false;
            seen.add(normalized);
            return true;
        });
    }, [searchParams]);
    const searchQuery = searchParams.get('q') ?? searchParams.get('search') ?? '';

    // Local state for immediate search input (submitted on Enter key)
    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

    // State for dashboard data
    const [dashboardData, setDashboardData] = useState<{
        stats: DashboardStats;
        projectTypes: ProjectTypeData[];
        organizationTypes: OrganizationTypeData[];
        organizationProjects: OrganizationProjectData[];
        organizationsWithProjects: OrganizationWithProjects[];
        donorCountries: string[];
        investmentTypes: string[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Sync local search with URL when URL changes externally (e.g., browser back/forward)
    useEffect(() => {
        setLocalSearchQuery(searchQuery);
    }, [searchQuery]);

    // Helper function to update URL search params
    const updateURLParams = useCallback((params: { donors?: string[]; types?: string[]; search?: string }) => {
        const newSearchParams = new URLSearchParams(searchParams.toString());

        // Update or remove donors param (compact 'd')
        if (params.donors !== undefined) {
            if (params.donors.length > 0) {
                newSearchParams.set('d', params.donors.join(','));
            } else {
                newSearchParams.delete('d');
            }
        }

        // Update or remove types param (compact 't') - write slugs
        if (params.types !== undefined) {
            if (params.types.length > 0) {
                const slugs = params.types.map(t => typeLabelToSlug(t));
                // Deduplicate slugs case-insensitively before writing to URL
                const uniqueSlugs = Array.from(new Set(slugs.map(s => s.toLowerCase()))).map(s => 
                    slugs.find(slug => slug.toLowerCase() === s) || s
                );
                newSearchParams.set('t', uniqueSlugs.join(','));
            } else {
                newSearchParams.delete('t');
            }
        }

        // Update or remove search param (compact 'q')
        if (params.search !== undefined) {
            if (params.search) {
                newSearchParams.set('q', params.search);
            } else {
                newSearchParams.delete('q');
            }
        }

        // Update URL without reloading the page
        const newURL = `${pathname}?${newSearchParams.toString()}`;
        router.push(newURL, { scroll: false });
    }, [searchParams, pathname, router]);

    // Load and process ecosystem data
    useEffect(() => {
        async function fetchData() {
            try {
                setError(null);

                console.log('Loading dashboard data with filters:', { combinedDonors, investmentTypes });

                const filters: DashboardFilters = {
                    donorCountries: combinedDonors.length > 0 ? combinedDonors : undefined,
                    investmentTypes: investmentTypes.length > 0 ? investmentTypes : undefined,
                    searchQuery: searchQuery || undefined
                };

                const data = await processDashboardData(filters);
                console.log('Dashboard data loaded:', data);

                setDashboardData(data);
            } catch (err) {
                console.error('Failed to load dashboard data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load data');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [combinedDonors, investmentTypes, searchQuery]); // Re-run when filters change

    // Handle reset filters
    const handleResetFilters = () => {
        setLocalSearchQuery(''); // Clear local search immediately
        updateURLParams({ donors: [], types: [], search: '' });
    };

    // Handle filter changes
    const handleDonorsChange = (values: string[]) => {
        updateURLParams({ donors: values });
    };

    const handleTypesChange = (values: string[]) => {
        updateURLParams({ types: values });
    };

    // Search handler - updates local state immediately, URL only on Enter key
    const handleSearchChange = useCallback((value: string) => {
        // Update local state immediately for responsive UI
        setLocalSearchQuery(value);
    }, []);

    // Handle Enter key press to apply search
    const handleSearchSubmit = useCallback(() => {
        updateURLParams({ search: localSearchQuery });
    }, [localSearchQuery, updateURLParams]);

    return (
        <CrisisDataDashboard
            dashboardData={dashboardData}
            loading={loading}
            error={error}
            combinedDonors={combinedDonors}
            investmentTypes={investmentTypes}
            searchQuery={localSearchQuery}
            onDonorsChange={handleDonorsChange}
            onTypesChange={handleTypesChange}
            onSearchChange={handleSearchChange}
            onSearchSubmit={handleSearchSubmit}
            onResetFilters={handleResetFilters}
            logoutButton={logoutButton}
        />
    );
};

export default CrisisDataDashboardWrapper;
