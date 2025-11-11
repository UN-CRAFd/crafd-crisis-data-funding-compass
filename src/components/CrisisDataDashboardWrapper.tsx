'use client';

import { typeLabelToSlug, typeSlugToLabel } from '@/lib/urlShortcuts';
import { themeKeyToName, themeNameToKey, ensureThemesMappingsLoaded } from '@/lib/data';
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
            const themeNames = keys.map(key => themeKeyToName(key));
            setInvestmentThemes(themeNames);
        })();
    }, [searchParams]);

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
    
    // Get sort parameters from URL (compact keys: sb -> sortBy, sd -> sortDirection)
    const sortBy = useMemo(() => {
        const raw = searchParams.get('sb') ?? searchParams.get('sortBy');
        if (raw === 'donors' || raw === 'assets') return raw;
        return 'name'; // default
    }, [searchParams]);
    
    const sortDirection = useMemo(() => {
        const raw = searchParams.get('sd') ?? searchParams.get('sortDirection');
        if (raw === 'desc') return 'desc';
        return 'asc'; // default
    }, [searchParams]);

    // Track active view (table or network)
    const [activeView, setActiveView] = useState<'table' | 'network'>('table');

    // Modal state for network view (local state, no URL changes)
    const [localSelectedOrgKey, setLocalSelectedOrgKey] = useState('');
    const [localSelectedProjectKey, setLocalSelectedProjectKey] = useState('');

    // Modal state from URL for table view
    const urlOrgKey = searchParams.get('org') ?? '';
    const urlProjectKey = searchParams.get('asset') ?? '';

    // Choose modal state based on active view
    const selectedOrgKey = activeView === 'table' ? urlOrgKey : localSelectedOrgKey;
    const selectedProjectKey = activeView === 'table' ? urlProjectKey : localSelectedProjectKey;

    // Local state for immediate search input (submitted on Enter key)
    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

    // Store the underlying page state when modals are opened
    const [underlyingPageState, setUnderlyingPageState] = useState<{
        searchQuery: string;
        combinedDonors: string[];
        investmentTypes: string[];
        investmentThemes: string[];
    } | null>(null);
    
    // Track the last fetched filter state to prevent unnecessary refetches
    const lastFetchedFiltersRef = useRef<string>('');

    // Determine if we're currently showing a modal
    // Use underlying page state for dashboard data when modal is open
    const shouldUseStoredState = (selectedOrgKey || selectedProjectKey) && underlyingPageState;
    
    // Memoize effective filters to prevent unnecessary recalculations
    const effectiveSearchQuery = useMemo(() => 
        shouldUseStoredState ? underlyingPageState.searchQuery : searchQuery,
        [shouldUseStoredState, underlyingPageState, searchQuery]
    );
    
    const effectiveDonors = useMemo(() => 
        shouldUseStoredState ? underlyingPageState.combinedDonors : combinedDonors,
        [shouldUseStoredState, underlyingPageState, combinedDonors]
    );
    
    const effectiveInvestmentTypes = useMemo(() => 
        shouldUseStoredState ? underlyingPageState.investmentTypes : investmentTypes,
        [shouldUseStoredState, underlyingPageState, investmentTypes]
    );
    
    const effectiveInvestmentThemes = useMemo(() => 
        shouldUseStoredState ? underlyingPageState.investmentThemes : investmentThemes,
        [shouldUseStoredState, underlyingPageState, investmentThemes]
    );

    // State for dashboard data
    const [dashboardData, setDashboardData] = useState<{
        stats: DashboardStats;
        projectTypes: ProjectTypeData[];
        organizationTypes: OrganizationTypeData[];
        organizationProjects: OrganizationProjectData[];
        organizationsWithProjects: OrganizationWithProjects[];
        allOrganizations: OrganizationWithProjects[]; // Add unfiltered organizations
        donorCountries: string[];
        investmentTypes: string[];
        investmentThemes: string[];
        investmentThemesByType: Record<string, string[]>; // Grouped themes by investment type
        topDonors: Array<{ name: string; value: number }>; // Add top co-financing donors
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Sync local search with URL when URL changes externally (e.g., browser back/forward)
    useEffect(() => {
        setLocalSearchQuery(searchQuery);
    }, [searchQuery]);

    // Helper function to update URL search params
    const updateURLParams = useCallback((params: { 
        donors?: string[]; 
        types?: string[]; 
        themes?: string[]; 
        search?: string;
        sortBy?: 'name' | 'donors' | 'assets';
        sortDirection?: 'asc' | 'desc';
    }) => {
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
            // Only set in URL if non-default
            if (params.sortDirection !== 'asc') {
                newSearchParams.set('sd', params.sortDirection);
            } else {
                newSearchParams.delete('sd');
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
                // Create a stable filter signature to detect actual changes
                const filterSignature = JSON.stringify({
                    donors: effectiveDonors.sort(),
                    types: effectiveInvestmentTypes.sort(),
                    themes: effectiveInvestmentThemes.sort(),
                    search: effectiveSearchQuery
                });
                
                // Skip fetch if filters haven't actually changed
                if (lastFetchedFiltersRef.current === filterSignature) {
                    return;
                }
                
                lastFetchedFiltersRef.current = filterSignature;
                
                setError(null);

                const filters: DashboardFilters = {
                    donorCountries: effectiveDonors.length > 0 ? effectiveDonors : undefined,
                    investmentTypes: effectiveInvestmentTypes.length > 0 ? effectiveInvestmentTypes : undefined,
                    investmentThemes: effectiveInvestmentThemes.length > 0 ? effectiveInvestmentThemes : undefined,
                    searchQuery: effectiveSearchQuery || undefined
                };

                const data = await processDashboardData(filters);

                setDashboardData(data);
            } catch (err) {
                console.error('Failed to load dashboard data:', err);
                setError(err instanceof Error ? err.message : 'Failed to load data');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [effectiveDonors, effectiveInvestmentTypes, effectiveInvestmentThemes, effectiveSearchQuery]); // Re-run when effective filters change

    // Validate selected themes against available themes based on current filters
    // Remove themes that no longer have matching projects
    useEffect(() => {
        if (!dashboardData?.allOrganizations || investmentThemes.length === 0 || !themesLoaded) {
            return; // Nothing to validate
        }

        // Calculate which themes are available given current donors, types, and query
        const availableThemes = new Set<string>();
        const allOrgs = dashboardData.allOrganizations;

        allOrgs.forEach(org => {
            // Filter by donors
            if (combinedDonors.length > 0) {
                const hasMatchingDonor = org.donorCountries.some(country => 
                    combinedDonors.includes(country)
                );
                if (!hasMatchingDonor) return;
            }

            org.projects.forEach(project => {
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
        updateURLParams({ donors: [], types: [], themes: [], search: '', sortBy: 'name', sortDirection: 'asc' });
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

    const handleSortChange = (newSortBy: 'name' | 'donors' | 'assets', newSortDirection: 'asc' | 'desc') => {
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

    // Modal handlers - use URL for table view, local state for network view
    const handleOpenOrganizationModal = useCallback((orgKey: string) => {
        if (activeView === 'table') {
            // Table view: update URL - replace any existing modal with org modal
            const newSearchParams = new URLSearchParams(searchParams.toString());
            newSearchParams.set('org', orgKey);
            // Close project modal if open
            newSearchParams.delete('asset');
            router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
        } else {
            // Network view: use local state only, store page state
            const stateToStore = {
                searchQuery,
                combinedDonors: [...combinedDonors],
                investmentTypes: [...investmentTypes],
                investmentThemes: [...investmentThemes]
            };
            
            setUnderlyingPageState(stateToStore);
            // Close project modal if open
            setLocalSelectedProjectKey('');
            setLocalSelectedOrgKey(orgKey);
        }
    }, [activeView, searchParams, pathname, router, searchQuery, combinedDonors, investmentTypes, investmentThemes]);

    const handleOpenProjectModal = useCallback((projectKey: string) => {
        if (activeView === 'table') {
            // Table view: update URL - replace any existing modal with project modal
            const newSearchParams = new URLSearchParams(searchParams.toString());
            newSearchParams.set('asset', projectKey);
            // Close organization modal if open
            newSearchParams.delete('org');
            router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
        } else {
            // Network view: use local state only, store page state
            const stateToStore = {
                searchQuery,
                combinedDonors: [...combinedDonors],
                investmentTypes: [...investmentTypes],
                investmentThemes: [...investmentThemes]
            };
            
            setUnderlyingPageState(stateToStore);
            // Close organization modal if open
            setLocalSelectedOrgKey('');
            setLocalSelectedProjectKey(projectKey);
        }
    }, [activeView, searchParams, pathname, router, searchQuery, combinedDonors, investmentTypes, investmentThemes]);

    const handleCloseOrganizationModal = useCallback(() => {
        if (activeView === 'table') {
            // Table view: clear URL param
            const newSearchParams = new URLSearchParams(searchParams.toString());
            newSearchParams.delete('org');
            router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
        } else {
            // Network view: clear local state
            setLocalSelectedOrgKey('');
            
            // Clear stored state after a short delay to prevent flash
            setTimeout(() => {
                setUnderlyingPageState(null);
            }, 50);
        }
    }, [activeView, searchParams, pathname, router]);

    const handleCloseProjectModal = useCallback(() => {
        if (activeView === 'table') {
            // Table view: clear URL param
            const newSearchParams = new URLSearchParams(searchParams.toString());
            newSearchParams.delete('asset');
            router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
        } else {
            // Network view: clear local state
            setLocalSelectedProjectKey('');
            
            // Clear stored state after a short delay to prevent flash
            setTimeout(() => {
                setUnderlyingPageState(null);
            }, 50);
        }
    }, [activeView, searchParams, pathname, router]);

    // Handle view change
    const handleViewChange = useCallback((view: 'table' | 'network') => {
        setActiveView(view);
        
        // When switching views, close any open modals
        if (view === 'network') {
            // Switching to network - clear URL modals if any
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
            
            if (needsUpdate) {
                router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
            }
        } else if (view === 'table') {
            // Switching to table - clear local modals if any
            if (localSelectedOrgKey || localSelectedProjectKey) {
                setLocalSelectedOrgKey('');
                setLocalSelectedProjectKey('');
                setUnderlyingPageState(null);
            }
        }
    }, [localSelectedOrgKey, localSelectedProjectKey, searchParams, pathname, router]);

    // Handle donor click from modal - add to filter and close modal
    const handleDonorClick = useCallback((country: string) => {
        const newSearchParams = new URLSearchParams(searchParams.toString());
        
        // Add donor to filter if not already present
        const currentDonors = (newSearchParams.get('d') ?? newSearchParams.get('donors') ?? '').split(',').filter(Boolean);
        if (!currentDonors.includes(country)) {
            const updatedDonors = [...currentDonors, country];
            newSearchParams.set('d', updatedDonors.join(','));
        }
        
        // Close any open modal by removing org/asset params
        newSearchParams.delete('org');
        newSearchParams.delete('asset');
        
        // Update URL with both changes at once
        router.push(`${pathname}?${newSearchParams.toString()}`, { scroll: false });
        
        // For network view, also clear local state
        if (activeView === 'network') {
            setLocalSelectedOrgKey('');
            setLocalSelectedProjectKey('');
            setTimeout(() => {
                setUnderlyingPageState(null);
            }, 50);
        }
    }, [searchParams, pathname, router, activeView]);

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
            onCloseOrganizationModal={handleCloseOrganizationModal}
            onCloseProjectModal={handleCloseProjectModal}
            onDonorClick={handleDonorClick}
            onViewChange={handleViewChange}
            logoutButton={logoutButton}
        />
    );
};

export default CrisisDataDashboardWrapper;
