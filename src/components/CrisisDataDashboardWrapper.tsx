'use client';

import { typeLabelToSlug, typeSlugToLabel, toUrlSlug, matchesUrlSlug } from '@/lib/urlShortcuts';
import { themeKeyToNames, themeNameToKey, ensureThemesMappingsLoaded } from '@/lib/data';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { processDashboardData } from '../lib/data';
import type { DashboardFilters, DashboardStats, OrganizationProjectData, OrganizationTypeData, OrganizationWithProjects, ProjectTypeData } from '../types/airtable';
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
    
    // State for themes (needs async loading)
    const [themesLoaded, setThemesLoaded] = useState(false);
    const [investmentThemes, setInvestmentThemes] = useState<string[]>([]);
    
    // Load themes mappings and parse URL themes
    useEffect(() => {
        (async () => {
            await ensureThemesMappingsLoaded();
            setThemesLoaded(true);
            
            // Parse themes from URL
            const raw = searchParams.get('th') ?? searchParams.get('themes');
            const keys = raw?.split(',').filter(Boolean) || [];
            // Flatten array since each key can map to multiple theme names
            const themeNames = keys.flatMap(key => themeKeyToNames(key));
            setInvestmentThemes(themeNames);
        })();
    }, [searchParams]);

    // Get filter values from URL (comma-separated for multi-select)
    // Using compact query keys: donors -> d, types -> t, search -> q
    // Read compact keys but fall back to legacy long keys for compatibility
    // Store raw URL slugs - will be resolved to actual names once data is loaded
    const donorSlugsFromUrl = useMemo(() => {
        const raw = searchParams.get('d') ?? searchParams.get('donors');
        return raw?.split(',').filter(Boolean) || [];
    }, [searchParams]);
    
    // State for dashboard data (declared early so combinedDonors can depend on it)
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
        topDonors: Array<{ name: string; value: number }>;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Resolve URL slugs to actual donor country names by matching against available donors
    const combinedDonors = useMemo(() => {
        if (!donorSlugsFromUrl.length) return [];
        const availableDonors = dashboardData?.donorCountries || [];
        // For each slug, find the matching donor country name
        return donorSlugsFromUrl
            .map(slug => availableDonors.find(donor => matchesUrlSlug(slug, donor)))
            .filter((donor): donor is string => !!donor);
    }, [donorSlugsFromUrl, dashboardData?.donorCountries]);
    
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
    
    // Get sort parameters from URL (compact keys: sb -> sortBy, sd -> sortDirection)
    const sortBy = useMemo(() => {
        const raw = searchParams.get('sb') ?? searchParams.get('sortBy');
        if (raw === 'donors' || raw === 'assets' || raw === 'funding') return raw;
        return 'name'; // default
    }, [searchParams]);
    
    const sortDirection = useMemo(() => {
        const raw = searchParams.get('sd') ?? searchParams.get('sortDirection');
        if (raw === 'asc') return 'asc';
        return 'desc'; // default
    }, [searchParams]);

    // Track active view (table or network)
    const [activeView, setActiveView] = useState<'table' | 'network'>('table');

    // Modal state from URL (used for both table and network views)
    const selectedOrgKey = searchParams.get('org') ?? '';
    const selectedProjectKey = searchParams.get('asset') ?? '';
    const selectedDonorCountry = searchParams.get('donor') || '';

    // Local state for immediate search input (submitted on Enter key)
    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
    
    // Track the last fetched filter state to prevent unnecessary refetches
    const lastFetchedFiltersRef = useRef<string>('');

    // Effective filters - always use current URL filter values
    const effectiveSearchQuery = searchQuery;
    const effectiveDonors = combinedDonors;
    const effectiveInvestmentTypes = investmentTypes;
    const effectiveInvestmentThemes = investmentThemes;

    // Sync local search with URL when URL changes externally (e.g., browser back/forward)
    useEffect(() => {
        setLocalSearchQuery(searchQuery);
    }, [searchQuery]);

    // Helper function to update URL search params
    // NOTE: This function only updates filter params and preserves modal params (org, asset, donor)
    const updateURLParams = useCallback((params: { 
        donors?: string[]; 
        types?: string[]; 
        themes?: string[]; 
        search?: string;
        sortBy?: 'name' | 'donors' | 'assets' | 'funding';
        sortDirection?: 'asc' | 'desc';
    }) => {
        const newSearchParams = new URLSearchParams(searchParams.toString());

        // IMPORTANT: Preserve modal params (org, asset, donor) - these are managed separately
        // and should never be affected by filter updates
        const modalOrg = searchParams.get('org');
        const modalAsset = searchParams.get('asset');
        const modalDonor = searchParams.get('donor');

        // Update or remove donors param (compact 'd') - write as lowercase with dashes
        if (params.donors !== undefined) {
            if (params.donors.length > 0) {
                const slugs = params.donors.map(d => toUrlSlug(d));
                newSearchParams.set('d', slugs.join(','));
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

        // Update or remove themes param (compact 'th') - write theme keys
        if (params.themes !== undefined) {
            if (params.themes.length > 0) {
                const themeKeys = params.themes.map(t => themeNameToKey(t));
                newSearchParams.set('th', themeKeys.join(','));
            } else {
                newSearchParams.delete('th');
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

        // Update or remove sort params (compact 'sb' and 'sd')
        if (params.sortBy !== undefined) {
            // Only set in URL if non-default
            if (params.sortBy !== 'name') {
                newSearchParams.set('sb', params.sortBy);
            } else {
                newSearchParams.delete('sb');
            }
        }
        
        if (params.sortDirection !== undefined) {
            // Only set in URL if non-default (default is now 'desc')
            if (params.sortDirection === 'asc') {
                newSearchParams.set('sd', params.sortDirection);
            } else {
                newSearchParams.delete('sd');
            }
        }

        // Restore modal params if they were present
        if (modalOrg) newSearchParams.set('org', modalOrg);
        if (modalAsset) newSearchParams.set('asset', modalAsset);
        if (modalDonor) newSearchParams.set('donor', modalDonor);

        // Update URL without reloading the page
        const newURL = `${pathname}?${newSearchParams.toString()}`;
        router.push(newURL, { scroll: false });
    }, [searchParams, pathname, router]);

    // Load and process ecosystem data
    useEffect(() => {
        async function fetchData() {
            try {
                // Create a stable filter signature to detect actual changes
                const filterSignature = JSON.stringify({
                    donors: effectiveDonors.sort(),
                    types: effectiveInvestmentTypes.sort(),
                    themes: effectiveInvestmentThemes.sort(),
                    search: effectiveSearchQuery
                });
                
                // Skip fetch if filters haven't actually changed
                if (lastFetchedFiltersRef.current === filterSignature) {
                    // Ensure loading is false if we're skipping the fetch
                    setLoading(false);
                    return;
                }
                
                lastFetchedFiltersRef.current = filterSignature;
                
                // Only show loading spinner if we don't have data yet (initial load)
                if (!dashboardData) {
                    setLoading(true);
                }
                setError(null);

                const filters: DashboardFilters = {
                    donorCountries: effectiveDonors.length > 0 ? effectiveDonors : undefined,
                    investmentTypes: effectiveInvestmentTypes.length > 0 ? effectiveInvestmentTypes : undefined,
                    investmentThemes: effectiveInvestmentThemes.length > 0 ? effectiveInvestmentThemes : undefined,
                    searchQuery: effectiveSearchQuery || undefined
                };

                const data = await processDashboardData(filters);

                setDashboardData(data);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [effectiveDonors, effectiveInvestmentTypes, effectiveInvestmentThemes, effectiveSearchQuery]); // Re-run when effective filters change

    // Validate selected themes against available themes based on current filters
    // Remove themes that no longer have matching projects
    useEffect(() => {
        // Skip validation when modals are open - we don't want to trigger URL changes
        // that might interfere with modal routing
        if (selectedOrgKey || selectedProjectKey || selectedDonorCountry) {
            return;
        }

        if (!dashboardData?.allOrganizations || investmentThemes.length === 0 || !themesLoaded) {
            return; // Nothing to validate
        }

        // Calculate which themes are available given current donors, types, and query
        const availableThemes = new Set<string>();
        const allOrgs = dashboardData.allOrganizations;

        allOrgs.forEach(org => {
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
                if (searchQuery) {
                    const searchLower = searchQuery.toLowerCase();
                    const matchesSearch = 
                        project.projectName?.toLowerCase().includes(searchLower) ||
                        project.description?.toLowerCase().includes(searchLower) ||
                        org.organizationName?.toLowerCase().includes(searchLower);
                    if (!matchesSearch) return;
                }

                // Filter by types
                if (investmentTypes.length > 0) {
                    const hasMatchingType = project.investmentTypes?.some(type =>
                        investmentTypes.some(selectedType => 
                            type.toLowerCase().trim() === selectedType.toLowerCase().trim()
                        )
                    );
                    if (!hasMatchingType) return;
                }

                // This project matches all filters except themes - add its themes to available set
                project.investmentThemes?.forEach(theme => {
                    availableThemes.add(theme.toLowerCase().trim());
                });
            });
        });

        // Check if any selected themes are no longer available
        const validThemes = investmentThemes.filter(theme => 
            availableThemes.has(theme.toLowerCase().trim())
        );

        // If some themes were removed, update the URL
        if (validThemes.length !== investmentThemes.length) {
            updateURLParams({ themes: validThemes });
        }
    }, [dashboardData?.allOrganizations, combinedDonors, investmentTypes, searchQuery, investmentThemes, themesLoaded, updateURLParams]);

    // Handle reset filters
    const handleResetFilters = () => {
        setLocalSearchQuery(''); // Clear local search immediately
        updateURLParams({ donors: [], types: [], themes: [], search: '', sortBy: 'name', sortDirection: 'desc' });
    };

    // Handle filter changes
    const handleDonorsChange = (values: string[]) => {
        updateURLParams({ donors: values });
    };

    const handleTypesChange = (values: string[]) => {
        updateURLParams({ types: values });
    };

    const handleThemesChange = (values: string[]) => {
        updateURLParams({ themes: values });
    };

    const handleSortChange = (newSortBy: 'name' | 'donors' | 'assets' | 'funding', newSortDirection: 'asc' | 'desc') => {
        updateURLParams({ sortBy: newSortBy, sortDirection: newSortDirection });
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

    // Modal handlers - always use URL routing for both table and network views
    const handleOpenOrganizationModal = useCallback((orgKey: string) => {
        // Always use URL routing
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.set('org', toUrlSlug(orgKey));
        newSearchParams.delete('asset');
        newSearchParams.delete('donor');
        router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
    }, [searchParams, pathname, router]);

    const handleOpenProjectModal = useCallback((projectKey: string) => {
        // Always use URL routing
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.set('asset', toUrlSlug(projectKey));
        // Close organization and donor modals if open
        newSearchParams.delete('org');
        newSearchParams.delete('donor');
        router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
    }, [searchParams, pathname, router]);

    const handleCloseOrganizationModal = useCallback(() => {
        // Always use URL routing
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete('org');
        router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
    }, [searchParams, pathname, router]);

    const handleCloseProjectModal = useCallback(() => {
        // Always use URL routing
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete('asset');
        router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
    }, [searchParams, pathname, router]);

    // Donor modal handlers
    const handleOpenDonorModal = useCallback((donorCountry: string) => {
        // Always use URL routing for both table and network views
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.set('donor', toUrlSlug(donorCountry));
        // Close org and project modals
        newSearchParams.delete('org');
        newSearchParams.delete('asset');
        router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
    }, [searchParams, pathname, router]);

    const handleCloseDonorModal = useCallback(() => {
        // Always use URL routing for both table and network views
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete('donor');
        router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
    }, [searchParams, pathname, router]);

    // Handle view change
    const handleViewChange = useCallback((view: 'table' | 'network') => {
        setActiveView(view);
        
        // When switching views, close any open modals (remove modal URL params)
        const newSearchParams = new URLSearchParams(searchParams.toString());
        let needsUpdate = false;
        
        if (newSearchParams.has('org')) {
            newSearchParams.delete('org');
            needsUpdate = true;
        }
        if (newSearchParams.has('asset')) {
            newSearchParams.delete('asset');
            needsUpdate = true;
        }
        if (newSearchParams.has('donor')) {
            newSearchParams.delete('donor');
            needsUpdate = true;
        }
        
        if (needsUpdate) {
            router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
        }
    }, [searchParams, pathname, router]);

    // Handle donor click from modal - open donor modal
    const handleDonorClick = useCallback((country: string) => {
        // Open the donor modal
        handleOpenDonorModal(country);
    }, [handleOpenDonorModal]);

    // Handle investment type click from modal - add to filter and close modal
    const handleTypeClick = useCallback((type: string) => {
        const newSearchParams = new URLSearchParams(searchParams.toString());
        
        // Add type to filter if not already present
        const currentTypesRaw = (newSearchParams.get('t') ?? newSearchParams.get('types') ?? '').split(',').filter(Boolean);
        // Convert slugs back to labels for comparison
        const currentTypes = currentTypesRaw.map(slug => typeSlugToLabel(slug));
        
        if (!currentTypes.includes(type)) {
            const updatedTypes = [...currentTypes, type];
            // Convert to slugs for URL
            const slugs = updatedTypes.map(t => typeLabelToSlug(t));
            const uniqueSlugs = Array.from(new Set(slugs.map(s => s.toLowerCase()))).map(s =>
                slugs.find(slug => slug.toLowerCase() === s) || s
            );
            newSearchParams.set('t', uniqueSlugs.join(','));
        }
        
        // Close any open modal by removing org/asset params
        newSearchParams.delete('org');
        newSearchParams.delete('asset');
        
        // Update URL with both changes at once
        router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
    }, [searchParams, pathname, router]);

    // Handle investment theme click from modal - add to filter and close modal
    const handleThemeClick = useCallback((theme: string) => {
        // Add theme to current themes if not already present
        const updatedThemes = investmentThemes.includes(theme) 
            ? investmentThemes 
            : [...investmentThemes, theme];
        
        // Apply theme filter AND close project modal in one update
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.delete('asset'); // Close project modal
        
        // Convert themes to keys and set th parameter (deduplicate keys since multiple themes may share the same key)
        const themeKeys = updatedThemes.map(themeName => themeNameToKey(themeName)).filter(Boolean);
        const uniqueKeys = Array.from(new Set(themeKeys));
        if (uniqueKeys.length > 0) {
            newSearchParams.set('th', uniqueKeys.join(','));
        }
        
        router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
    }, [investmentThemes, searchParams, pathname, router]);

    return (
        <CrisisDataDashboard
            dashboardData={dashboardData}
            loading={loading}
            error={error}
            combinedDonors={effectiveDonors}
            investmentTypes={effectiveInvestmentTypes}
            investmentThemes={effectiveInvestmentThemes}
            searchQuery={localSearchQuery}
            appliedSearchQuery={effectiveSearchQuery}
            selectedOrgKey={selectedOrgKey}
            selectedProjectKey={selectedProjectKey}
            selectedDonorCountry={selectedDonorCountry}
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
