'use client';

import { typeLabelToSlug, typeSlugToLabel, toUrlSlug, matchesUrlSlug } from '@/lib/urlShortcuts';
import { themeKeyToNames, themeNameToKey, ensureThemesMappingsLoaded, getMemberStates } from '@/lib/data';
import { useGeneralContributions } from '@/contexts/GeneralContributionsContext';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { processDashboardData } from '../lib/data';
import type { DashboardFilters, DashboardStats, OrganizationProjectData, OrganizationTypeData, OrganizationWithProjects, ProjectTypeData } from '../types/airtable';
import CrisisDataDashboard from './CrisisDataDashboard';

/**
 * Wrapper component that handles routing, URL params, and data fetching.
 * 
 * KEY ARCHITECTURE:
 * - Modal params (org, asset, donor) are COMPLETELY SEPARATE from filter params
 * - Filter changes never affect modal params
 * - Modal changes never trigger filter validation or data refetching
 * - All URL updates go through a single source of truth
 */
const CrisisDataDashboardWrapper = ({ logoutButton }: { logoutButton?: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    
    // Get General Contributions state to trigger refetch when it changes
    let showGeneralContributions = true;
    try {
        const { showGeneralContributions: value } = useGeneralContributions();
        showGeneralContributions = value;
    } catch (e) {
        // Provider not available
    }

    // ===========================================
    // MODAL STATE (Read-only from URL)
    // ===========================================
    const modalParams = useMemo(() => ({
        org: searchParams.get('org') ?? '',
        asset: searchParams.get('asset') ?? '',
        donor: searchParams.get('donor') ?? ''
    }), [searchParams]);

    // ===========================================
    // FILTER STATE
    // ===========================================
    const [themesLoaded, setThemesLoaded] = useState(false);
    const [investmentThemes, setInvestmentThemes] = useState<string[]>([]);
    const [memberStates, setMemberStates] = useState<string[]>([]);

    // Load themes on mount and when filter params change (NOT when modal params change)
    const filterParamsString = useMemo(() => {
        return searchParams.toString().split('&')
            .filter(p => !p.startsWith('org=') && !p.startsWith('asset=') && !p.startsWith('donor='))
            .join('&');
    }, [searchParams]);

    useEffect(() => {
        (async () => {
            const loadedMemberStates = await getMemberStates();
            setMemberStates(loadedMemberStates);
            await ensureThemesMappingsLoaded();
            setThemesLoaded(true);

            const raw = searchParams.get('th') ?? searchParams.get('themes');
            const keys = raw?.split(',').filter(Boolean) || [];
            const themeNames = keys.flatMap(key => themeKeyToNames(key));
            setInvestmentThemes(themeNames);
        })();
    }, [filterParamsString, showGeneralContributions]); // Re-run when general contributions setting changes

    // Read filter values from URL
    const donorSlugsFromUrl = useMemo(() => {
        const raw = searchParams.get('d') ?? searchParams.get('donors');
        const incoming = raw?.split(',').filter(Boolean) || [];
        const crafdExpansion = ['germany','netherlands','canada','finland','luxembourg','united-kingdom','european-union','usa'];
        return incoming.flatMap(s => s === 'crafd-donors' ? crafdExpansion : [s]);
    }, [searchParams]);

    const [dashboardData, setDashboardData] = useState<{
        stats: DashboardStats;
        projectTypes: ProjectTypeData[];
        organizationTypes: OrganizationTypeData[];
        organizationProjects: OrganizationProjectData[];
        organizationsWithProjects: OrganizationWithProjects[];
        allOrganizations: OrganizationWithProjects[];
        donorCountries: string[];
        investmentTypes: string[];
        investmentThemes: string[];
        investmentThemesByType: Record<string, string[]>;
        topDonors: { name: string; value: number }[];
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Parse donors from URL slugs once data is loaded
    const combinedDonors = useMemo(() => {
        if (!dashboardData) return [];
        const allDonors = new Set<string>();
        dashboardData.allOrganizations.forEach(org => {
            org.donorCountries?.forEach((d: string) => allDonors.add(d));
        });
        // Also include member states as valid donors
        memberStates.forEach(state => allDonors.add(state));

        // If the special shortcut `all` is present, select every donor available
        if (donorSlugsFromUrl.some(s => s === 'all')) {
            return Array.from(allDonors).sort();
        }

        return donorSlugsFromUrl
                .map(slug => Array.from(allDonors).find(d => matchesUrlSlug(slug, d)))
                .filter((d): d is string => d !== undefined);
    }, [donorSlugsFromUrl, dashboardData, memberStates]);

    // Parse investment types from URL
    const typeSlugsFromUrl = useMemo(() => {
        const raw = searchParams.get('t') ?? searchParams.get('types');
        return raw?.split(',').filter(Boolean) || [];
    }, [searchParams]);

    const investmentTypes = useMemo(() => {
        return typeSlugsFromUrl.map(slug => typeSlugToLabel(slug));
    }, [typeSlugsFromUrl]);

    // Search query
    const searchQuery = useMemo(() => {
        return searchParams.get('q') ?? searchParams.get('search') ?? '';
    }, [searchParams]);

    // Sort params
    const sortBy = useMemo(() => {
        const raw = searchParams.get('sb') ?? searchParams.get('sortBy');
        if (raw === 'donors' || raw === 'assets' || raw === 'funding') return raw;
        return 'name' as const;
    }, [searchParams]);

    const sortDirection = useMemo(() => {
        const raw = searchParams.get('sd') ?? searchParams.get('sortDirection');
        if (raw === 'asc') return 'asc';
        return 'desc' as const;
    }, [searchParams]);

    const [activeView, setActiveView] = useState<'table' | 'network'>('table');
    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

    const lastFetchedFiltersRef = useRef<string>('');

    // Sync local search with URL
    useEffect(() => {
        setLocalSearchQuery(searchQuery);
    }, [searchQuery]);

    // ===========================================
    // URL UPDATE FUNCTIONS
    // ===========================================

    /**
     * Update filter params while preserving modal params
     */
    const updateFilterParams = useCallback((params: {
        donors?: string[];
        types?: string[];
        themes?: string[];
        search?: string;
        sortBy?: 'name' | 'donors' | 'assets' | 'funding';
        sortDirection?: 'asc' | 'desc';
    }) => {
        const newSearchParams = new URLSearchParams();

        // Always preserve current modal params
        if (modalParams.org) newSearchParams.set('org', modalParams.org);
        if (modalParams.asset) newSearchParams.set('asset', modalParams.asset);
        if (modalParams.donor) newSearchParams.set('donor', modalParams.donor);

        // Set filter params
        if (params.donors !== undefined && params.donors.length > 0) {
            newSearchParams.set('d', params.donors.map(d => toUrlSlug(d)).join(','));
        } else if (params.donors === undefined && combinedDonors.length > 0) {
            newSearchParams.set('d', combinedDonors.map(d => toUrlSlug(d)).join(','));
        }

        if (params.types !== undefined && params.types.length > 0) {
            const slugs = params.types.map(t => typeLabelToSlug(t));
            const uniqueSlugs = Array.from(new Set(slugs.map(s => s.toLowerCase()))).map(s =>
                slugs.find(slug => slug.toLowerCase() === s) || s
            );
            newSearchParams.set('t', uniqueSlugs.join(','));
        } else if (params.types === undefined && investmentTypes.length > 0) {
            const slugs = investmentTypes.map(t => typeLabelToSlug(t));
            const uniqueSlugs = Array.from(new Set(slugs.map(s => s.toLowerCase()))).map(s =>
                slugs.find(slug => slug.toLowerCase() === s) || s
            );
            newSearchParams.set('t', uniqueSlugs.join(','));
        }

        if (params.themes !== undefined && params.themes.length > 0) {
            newSearchParams.set('th', params.themes.map(t => themeNameToKey(t)).join(','));
        } else if (params.themes === undefined && investmentThemes.length > 0) {
            newSearchParams.set('th', investmentThemes.map(t => themeNameToKey(t)).join(','));
        }

        if (params.search !== undefined && params.search) {
            newSearchParams.set('q', params.search);
        } else if (params.search === undefined && searchQuery) {
            newSearchParams.set('q', searchQuery);
        }

        const finalSortBy = params.sortBy ?? sortBy;
        if (finalSortBy !== 'name') {
            newSearchParams.set('sb', finalSortBy);
        }

        const finalSortDirection = params.sortDirection ?? sortDirection;
        if (finalSortDirection === 'asc') {
            newSearchParams.set('sd', finalSortDirection);
        }

        router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
    }, [modalParams, combinedDonors, investmentTypes, investmentThemes, searchQuery, sortBy, sortDirection, pathname, router]);

    /**
     * Update ONLY modal params, preserving all filter params
     */
    const updateModalParams = useCallback((modal: {
        org?: string | null;
        asset?: string | null;
        donor?: string | null;
    }) => {
        const newSearchParams = new URLSearchParams(searchParams.toString());

        // Update modal params
        if (modal.org === null) {
            newSearchParams.delete('org');
        } else if (modal.org !== undefined) {
            newSearchParams.set('org', toUrlSlug(modal.org));
        }

        if (modal.asset === null) {
            newSearchParams.delete('asset');
        } else if (modal.asset !== undefined) {
            newSearchParams.set('asset', toUrlSlug(modal.asset));
        }

        if (modal.donor === null) {
            newSearchParams.delete('donor');
        } else if (modal.donor !== undefined) {
            newSearchParams.set('donor', toUrlSlug(modal.donor));
        }

        router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
    }, [searchParams, pathname, router]);

    // ===========================================
    // DATA FETCHING (Only triggered by filter changes)
    // ===========================================
    useEffect(() => {
        async function fetchData() {
            try {
                const filterSignature = JSON.stringify({
                    donors: combinedDonors.sort(),
                    types: investmentTypes.sort(),
                    themes: investmentThemes.sort(),
                    search: searchQuery,
                    showGeneralContributions
                });

                if (filterSignature === lastFetchedFiltersRef.current) {
                    return;
                }

                lastFetchedFiltersRef.current = filterSignature;
                setLoading(false);

                const filters: DashboardFilters = {
                    donorCountries: combinedDonors.length > 0 ? combinedDonors : undefined,
                    investmentTypes: investmentTypes.length > 0 ? investmentTypes : undefined,
                    investmentThemes: investmentThemes.length > 0 ? investmentThemes : undefined,
                    searchQuery: searchQuery || undefined
                };

                const data = await processDashboardData(filters);
                setDashboardData(data);
                setError(null);
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [combinedDonors, investmentTypes, investmentThemes, searchQuery, showGeneralContributions]);

    // NOTE: Theme validation is disabled because it creates a chicken-and-egg problem:
    // - Themes are user-driven filters that should drive data fetching
    // - Validating themes against current data (which was fetched without the new theme)
    //   would immediately remove newly-added themes
    // - This prevents users from selecting themes when other filters are active
    // 
    // If theme validation is needed in the future, it should only run AFTER data has been
    // fetched with the new theme filter, not before.

    // ===========================================
    // FILTER HANDLERS
    // ===========================================
    const handleDonorsChange = useCallback((newDonors: string[]) => {
        updateFilterParams({ donors: newDonors });
    }, [updateFilterParams]);

    const handleTypesChange = useCallback((newTypes: string[]) => {
        updateFilterParams({ types: newTypes });
    }, [updateFilterParams]);

    const handleThemesChange = useCallback((newThemes: string[]) => {
        updateFilterParams({ themes: newThemes });
    }, [updateFilterParams]);

    const handleResetFilters = useCallback(() => {
        updateFilterParams({
            donors: [],
            types: [],
            themes: [],
            search: '',
            sortBy: 'name',
            sortDirection: 'desc'
        });
    }, [updateFilterParams]);

    const handleSortChange = (newSortBy: 'name' | 'donors' | 'assets' | 'funding', newSortDirection: 'asc' | 'desc') => {
        updateFilterParams({ sortBy: newSortBy, sortDirection: newSortDirection });
    };

    const handleSearchChange = useCallback((value: string) => {
        setLocalSearchQuery(value);
    }, []);

    const handleSearchSubmit = useCallback(() => {
        updateFilterParams({ search: localSearchQuery });
    }, [localSearchQuery, updateFilterParams]);

    // ===========================================
    // MODAL HANDLERS
    // ===========================================
    const handleOpenOrganizationModal = useCallback((orgKey: string) => {
        updateModalParams({ org: orgKey, asset: null, donor: null });
    }, [updateModalParams]);

    const handleOpenProjectModal = useCallback((projectKey: string) => {
        updateModalParams({ org: null, asset: projectKey, donor: null });
    }, [updateModalParams]);

    const handleOpenDonorModal = useCallback((donorCountry: string) => {
        updateModalParams({ org: null, asset: null, donor: donorCountry });
    }, [updateModalParams]);

    const handleCloseOrganizationModal = useCallback(() => {
        updateModalParams({ org: null });
    }, [updateModalParams]);

    const handleCloseProjectModal = useCallback(() => {
        updateModalParams({ asset: null });
    }, [updateModalParams]);

    const handleCloseDonorModal = useCallback(() => {
        updateModalParams({ donor: null });
    }, [updateModalParams]);

    // Click handlers for badges/pills
    const handleDonorClick = useCallback((donor: string) => {
        const updatedDonors = combinedDonors.includes(donor)
            ? combinedDonors.filter(d => d !== donor)
            : [...combinedDonors, donor];
        updateFilterParams({ donors: updatedDonors });
    }, [combinedDonors, updateFilterParams]);

    const handleTypeClick = useCallback((type: string) => {
        const updatedTypes = investmentTypes.includes(type)
            ? investmentTypes.filter(t => t !== type)
            : [...investmentTypes, type];
        updateFilterParams({ types: updatedTypes });
    }, [investmentTypes, updateFilterParams]);

    const handleThemeClick = useCallback((theme: string) => {
        const updatedThemes = investmentThemes.includes(theme)
            ? investmentThemes
            : [...investmentThemes, theme];
        updateFilterParams({ themes: updatedThemes });
    }, [investmentThemes, updateFilterParams]);

    const handleViewChange = useCallback((view: 'table' | 'network') => {
        setActiveView(view);
    }, []);

    return (
        <CrisisDataDashboard
            dashboardData={dashboardData} // ignore
            loading={loading}
            error={error}
            combinedDonors={combinedDonors}
            investmentTypes={investmentTypes}
            investmentThemes={investmentThemes}
            searchQuery={localSearchQuery}
            appliedSearchQuery={searchQuery}
            selectedOrgKey={modalParams.org}
            selectedProjectKey={modalParams.asset}
            selectedDonorCountry={modalParams.donor}
            sortBy={sortBy}
            sortDirection={sortDirection}
            onDonorsChange={handleDonorsChange}
            onTypesChange={handleTypesChange}
            onThemesChange={handleThemesChange}
            onSearchChange={handleSearchChange}
            onSearchSubmit={handleSearchSubmit}
            onResetFilters={handleResetFilters}
            onSortChange={handleSortChange}
            onOpenOrganizationModal={handleOpenOrganizationModal}
            onOpenProjectModal={handleOpenProjectModal}
            onOpenDonorModal={handleOpenDonorModal}
            onCloseOrganizationModal={handleCloseOrganizationModal}
            onCloseProjectModal={handleCloseProjectModal}
            onCloseDonorModal={handleCloseDonorModal}
            onDonorClick={handleDonorClick}
            onTypeClick={handleTypeClick}
            onThemeClick={handleThemeClick}
            onViewChange={handleViewChange}
            logoutButton={logoutButton}
        />
    );
};

export default CrisisDataDashboardWrapper;
