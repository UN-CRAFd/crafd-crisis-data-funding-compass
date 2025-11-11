'use client';

import React, { useEffect, useMemo, useState } from 'react';
// Image import removed because it's not used in this file
import ChartCard from '@/components/ChartCard';
import FilterBar from '@/components/FilterBar';
import { SectionHeader, type SectionHeaderProps } from '@/components/SectionHeader';
import dynamic from 'next/dynamic';
import OrganizationModal from '@/components/OrganizationModal';
import ProjectModal from '@/components/ProjectModal';
import SurveyBanner from '@/components/SurveyBanner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TooltipContent, TooltipProvider, TooltipTrigger, Tooltip as TooltipUI } from '@/components/ui/tooltip';
import labels from '@/config/labels.json';
import { getIconForInvestmentType } from '@/config/investmentTypeIcons';
import { Building2, ChevronDown, ChevronRight, Database, Table, DatabaseBackup, FileDown, Filter, FolderDot, FolderOpenDot, Globe, Info, MessageCircle, RotateCcw, Search, Share2, ArrowUpDown, ArrowUpWideNarrow, ArrowDownWideNarrow, Network } from 'lucide-react';
import organizationsTableRaw from '../../public/data/organizations-table.json';
import { buildOrgDonorCountriesMap, buildOrgProjectsMap, buildProjectNameMap, buildProjectIdToKeyMap, calculateOrganizationTypesFromOrganizationsWithProjects, getNestedOrganizationsForModals } from '../lib/data';
import { exportDashboardToPDF } from '../lib/exportPDF';
import { exportViewAsCSV, exportViewAsXLSX } from '../lib/exportCSV';
import type { DashboardStats, OrganizationProjectData, OrganizationTypeData, OrganizationWithProjects, ProjectData, ProjectTypeData } from '../types/airtable';

// Eagerly load NetworkGraph on client side to avoid lazy loading delay
const NetworkGraph = dynamic(() => import('@/components/NetworkGraph'), {
    ssr: false,
});

// Consolidated style constants
const STYLES = {
    // Card styles
    statCard: "!border-0 transition-all duration-300 hover:ring-2 hover:ring-slate-300/50",
    cardGlass: "!border-0 bg-white",
    cardGlassLight: "!border-0 bg-white p-1 rounded-md shadow-none",

    // Typography
    sectionHeader: "flex items-center gap-2 text-lg font-qanelas-subtitle font-black text-slate-800 mb-0 mt-0 uppercase",

    // Badges
    badgeBase: "inline-flex items-center px-2 py-1 rounded-md text-xs font-medium",

    // Interactive elements
    projectItem: "p-3 bg-white rounded-lg border border-slate-100 hover:bg-slate-200 cursor-pointer transition-colors duration-200 group",
    orgRow: "flex items-center justify-between p-4 hover:bg-slate-200 rounded-lg border border-slate-200 bg-white",

    // Chart config
    chartTooltip: {
        backgroundColor: 'var(--tooltip-bg)',
        backdropFilter: 'blur(12px)',
        border: '1px solid var(--tooltip-border)',
        borderRadius: '10px',
        fontSize: '12px',
        padding: '8px',
        lineHeight: '0.8',
    }
} as const;

interface CrisisDataDashboardProps {
    dashboardData: {
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
    } | null;
    loading: boolean;
    error: string | null;
    combinedDonors: string[];
    investmentTypes: string[];
    investmentThemes: string[];
    searchQuery: string; // Current input value
    appliedSearchQuery: string; // Applied search query (from URL)
    selectedOrgKey: string; // Organization key from URL
    selectedProjectKey: string; // Asset key from URL
    sortBy: 'name' | 'donors' | 'assets'; // Sort field from URL
    sortDirection: 'asc' | 'desc'; // Sort direction from URL
    onDonorsChange: (values: string[]) => void;
    onTypesChange: (values: string[]) => void;
    onThemesChange: (values: string[]) => void;
    onSearchChange: (value: string) => void;
    onSearchSubmit: () => void;
    onResetFilters: () => void;
    onSortChange: (sortBy: 'name' | 'donors' | 'assets', sortDirection: 'asc' | 'desc') => void;
    onOpenOrganizationModal: (orgKey: string) => void;
    onOpenProjectModal: (projectKey: string) => void;
    onCloseOrganizationModal: () => void;
    onCloseProjectModal: () => void;
    onDonorClick?: (country: string) => void;
    onViewChange?: (view: 'table' | 'network') => void;
    logoutButton?: React.ReactNode;
}

// Reusable StatCard component
interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: number;
    label: string;
    colorScheme: 'amber';
    tooltip?: string;
}

const StatCard = React.memo(function StatCard({ icon, title, value, label, colorScheme, tooltip }: StatCardProps) {
    const gradients = {
        amber: {
            bg: 'from-[var(--brand-bg-lighter)] to-[var(--brand-bg-light)]',
            // Use a solid text color for the stat value instead of a gradient
            value: 'text-[var(--brand-primary)]',
            label: 'text-[var(--brand-primary)]'
        }
    };

    const colors = gradients[colorScheme];

    const cardContent = (
        <Card className={`${STYLES.statCard} bg-gradient-to-br ${colors.bg}`}>
            <CardHeader className="pb-0 h-5">
                <CardDescription>
                    <SectionHeader icon={icon} title={title} />
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex items-baseline gap-2">
                    <div className={`text-4xl sm:text-5xl font-bold font-mono leading-none tabular-nums ${colors.value}`}>
                        {value}
                    </div>
                    <div className={`leading-none text-sm sm:text-lg font-medium ${colors.label}`}>
                        {label}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (tooltip) {
        return (
            <TooltipProvider delayDuration={0}>
                <TooltipUI>
                    <TooltipTrigger asChild>
                        {cardContent}
                    </TooltipTrigger>
                    <TooltipContent
                        side="bottom"
                        align="center"
                        className="max-w-100 p-3 bg-white text-slate-800 text-sm rounded-lg border border-slate-200"
                        sideOffset={5}
                        avoidCollisions={true}
                        style={{ ...STYLES.chartTooltip }}
                    >
                        <p className="leading-relaxed">{tooltip}</p>
                    </TooltipContent>
                </TooltipUI>
            </TooltipProvider>
        );
    }

    return cardContent;
});
StatCard.displayName = 'StatCard';

// Reusable Badge component
interface BadgeProps {
    text: string;
    variant: 'blue' | 'emerald' | 'violet' | 'slate' | 'highlighted' | 'beta' | 'types' | 'indigo';
}

const Badge = ({ text, variant }: BadgeProps) => {
    const variants = {
        blue: 'bg-[var(--brand-bg-light)] text-[var(--brand-primary)]',
        emerald: 'bg-emerald-50 text-emerald-700',
        violet: 'bg-violet-50 text-violet-700',
        indigo: 'bg-[var(--badge-other-bg)] text-[var(--badge-other-text)] font-semibold',
        types: 'bg-green-50 text-green-700',
        slate: 'bg-[var(--badge-slate-bg)] text-[var(--badge-slate-text)]',
        highlighted: 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border border-[var(--brand-border)] font-semibold',
        beta: '' // Will use inline styles
    };

    // Beta variant uses inline styles for CSS variables
    if (variant === 'beta') {
        return (
            <span
                className="inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs font-semibold break-words"
                style={{
                    backgroundColor: 'var(--badge-beta-bg)',
                    color: 'var(--badge-beta-text)'
                }}
            >
                {text}
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs font-medium break-words ${variants[variant]}`}>
            {text}
        </span>
    );
};

const CrisisDataDashboard = ({
    dashboardData,
    loading,
    error,
    combinedDonors,
    investmentTypes,
    investmentThemes,
    searchQuery,
    appliedSearchQuery,
    selectedOrgKey,
    selectedProjectKey,
    onDonorsChange,
    onTypesChange,
    onThemesChange,
    onSearchChange,
    onSearchSubmit,
    onResetFilters,
    onOpenOrganizationModal,
    onOpenProjectModal,
    onCloseOrganizationModal,
    onCloseProjectModal,
    onDonorClick,
    onViewChange,
    logoutButton,
    sortBy,
    sortDirection,
    onSortChange
}: CrisisDataDashboardProps) => {
    // UI state (not related to routing)
    const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
    const [expandedCountries, setExpandedCountries] = useState<Set<string>>(new Set());
    const [sortMenuOpen, setSortMenuOpen] = useState(false);
    const [activeView, setActiveView] = useState<'table' | 'network'>('table'); // Add view state

    // Enforce table-only on small screens (mobile). Hide view switcher on mobile via responsive classes.
    useEffect(() => {
        const handleResize = () => {
            if (typeof window !== 'undefined' && window.innerWidth < 640) {
                setActiveView('table');
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Notify parent when view changes
    useEffect(() => {
        if (onViewChange) {
            onViewChange(activeView);
        }
    }, [activeView, onViewChange]);

    // Modal and UI states
    const [shareSuccess, setShareSuccess] = useState(false);
    const [csvExportLoading, setCSVExportLoading] = useState(false);
    const [xlsxExportLoading, setXLSXExportLoading] = useState(false);
    const [pdfExportLoading, setPDFExportLoading] = useState(false);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);
    
    // Load static organizations table for modals
    const organizationsTable: Array<{ id: string; createdTime?: string; fields: Record<string, unknown> }> = organizationsTableRaw as Array<{ id: string; createdTime?: string; fields: Record<string, unknown> }>;

    // Get all investment themes from dashboardData (must be before early returns)
    const allKnownInvestmentThemes = useMemo(() => 
        dashboardData?.investmentThemes || [],
        [dashboardData?.investmentThemes]
    );

    // Get grouped themes by investment type
    const investmentThemesByType = useMemo(() => 
        dashboardData?.investmentThemesByType || {},
        [dashboardData?.investmentThemesByType]
    );

    // Calculate project counts for each investment type based on current donors, query, and themes
    // (but not filtered by types themselves)
    const projectCountsByType = useMemo(() => {
        const projectsByType: Record<string, Set<string>> = {};
        const allOrgs = dashboardData?.allOrganizations || [];
        
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
                if (appliedSearchQuery) {
                    const searchLower = appliedSearchQuery.toLowerCase();
                    const matchesSearch = 
                        project.projectName?.toLowerCase().includes(searchLower) ||
                        project.description?.toLowerCase().includes(searchLower) ||
                        org.organizationName?.toLowerCase().includes(searchLower);
                    if (!matchesSearch) return;
                }
                
                // Filter by themes
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
    }, [dashboardData?.allOrganizations, combinedDonors, appliedSearchQuery, investmentThemes]);

    // Calculate project counts for each theme based on current donors, query, and types
    // (but not filtered by themes themselves)
    const projectCountsByTheme = useMemo(() => {
        const projectsByTheme: Record<string, Set<string>> = {};
        const allOrgs = dashboardData?.allOrganizations || [];
        
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
                if (appliedSearchQuery) {
                    const searchLower = appliedSearchQuery.toLowerCase();
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
    }, [dashboardData?.allOrganizations, combinedDonors, appliedSearchQuery, investmentTypes]);

    // Load nested data for modals
    const [nestedOrganizations, setNestedOrganizations] = useState<any[]>([]);

    // Centralized data maps for modals
    const [projectNameMap, setProjectNameMap] = useState<Record<string, string>>({});
    const [projectIdToKeyMap, setProjectIdToKeyMap] = useState<Record<string, string>>({});
    const [orgProjectsMap, setOrgProjectsMap] = useState<Record<string, Array<{ investmentTypes: string[] }>>>({});
    const [orgDonorCountriesMap, setOrgDonorCountriesMap] = useState<Record<string, string[]>>({});

    // Load nested organization data for modal maps
    useEffect(() => {
        const loadModalData = async () => {
            try {
                const nestedOrgs = await getNestedOrganizationsForModals();
                setNestedOrganizations(nestedOrgs);
                setProjectNameMap(buildProjectNameMap(nestedOrgs));
                setProjectIdToKeyMap(buildProjectIdToKeyMap(nestedOrgs));
                setOrgProjectsMap(buildOrgProjectsMap(nestedOrgs));
                setOrgDonorCountriesMap(buildOrgDonorCountriesMap(nestedOrgs));
            } catch (error) {
                console.error('Error loading modal data:', error);
            }
        };
        loadModalData();
    }, []);

    // Listen for modal close events dispatched from client modal components (now using URL-based handlers)
    useEffect(() => {
        // Event handlers for modal close events dispatched from within modals
        window.addEventListener('closeProjectModal', onCloseProjectModal as EventListener);
        window.addEventListener('closeOrganizationModal', onCloseOrganizationModal as EventListener);

        return () => {
            window.removeEventListener('closeProjectModal', onCloseProjectModal as EventListener);
            window.removeEventListener('closeOrganizationModal', onCloseOrganizationModal as EventListener);
        };
    }, [onCloseProjectModal, onCloseOrganizationModal]);

    // Find selected items based on URL parameters
    const selectedProject = useMemo(() => {
        if (!selectedProjectKey || !nestedOrganizations.length) return null;
        
        for (const org of nestedOrganizations) {
            for (const project of org.projects || []) {
                if (project.fields?.product_key === selectedProjectKey) {
                    // Extract donor countries from project's own agencies
                    const projectAgencies = project.agencies || [];
                    const projectDonorCountriesSet = new Set<string>();
                    if (Array.isArray(projectAgencies) && projectAgencies.length > 0) {
                        projectAgencies.forEach((a: any) => {
                            const aFields = (a && a.fields) || {};
                            const c = aFields['Country Name'] || aFields['Country'] || aFields['Agency Associated Country'];
                            if (Array.isArray(c)) {
                                c.forEach((cc: unknown) => { 
                                    if (typeof cc === 'string' && cc.trim()) projectDonorCountriesSet.add(cc.trim()); 
                                });
                            } else if (typeof c === 'string' && c.trim()) {
                                projectDonorCountriesSet.add(c.trim());
                            }
                        });
                    }
                    const projectDonorCountries = Array.from(projectDonorCountriesSet);
                    
                    return {
                        project: {
                            id: project.id,
                            productKey: project.fields?.['product_key'] || '',
                            projectName: project.fields?.['Project/Product Name'] || project.fields?.['Project Name'] || project.name || 'Unnamed Project',
                            projectDescription: project.fields?.['Project Description'] || '',
                            projectWebsite: project.fields?.['Project Website'] || '',
                            investmentTypes: project.fields?.['Investment Type(s)'] || [],
                            investmentThemes: project.fields?.['Investment Theme(s)'] || [],
                            donorCountries: projectDonorCountries,
                            provider: org.name || 'Unknown Provider',
                            hdxSohd: project.fields?.['HDX_SOHD'] || undefined
                        } as ProjectData,
                        organizationName: org.name || 'Unknown Organization'
                    };
                }
            }
        }
        return null;
    }, [selectedProjectKey, nestedOrganizations]);

    const selectedOrganization = useMemo(() => {
        if (!selectedOrgKey || !nestedOrganizations.length) return null;
        
        // Look up by Org Short Name (which is what the NetworkGraph passes)
        const nestedOrg = nestedOrganizations.find((org: any) => {
            const orgShortName = org.fields?.['Org Short Name'];
            return orgShortName && orgShortName.toLowerCase() === selectedOrgKey.toLowerCase();
        });
        
        if (!nestedOrg) return null;

        // Convert nested organization to OrganizationWithProjects format
        const projectsData = (nestedOrg.projects || []).map((project: any) => ({
            id: project.id,
            projectName: project.fields?.['Project/Product Name'] || project.fields?.['Project Name'] || project.name || 'Unnamed Project',
            projectDescription: project.fields?.['Project Description'] || '',
            projectWebsite: project.fields?.['Project Website'] || '',
            investmentTypes: project.fields?.['Investment Type(s)'] || [],
            donorCountries: project.donor_countries || [],
            provider: nestedOrg.name || 'Unknown Provider'
        }));

        return {
            id: nestedOrg.id,
            organizationName: nestedOrg.name || 'Unnamed Organization',
            type: Array.isArray(nestedOrg.fields?.['Org Type']) 
                ? nestedOrg.fields['Org Type'][0] 
                : (nestedOrg.fields?.['Org Type'] || 'Unknown'),
            donorCountries: nestedOrg.donor_countries || [],
            projects: projectsData,
            projectCount: projectsData.length
        } as OrganizationWithProjects;
    }, [selectedOrgKey, nestedOrganizations]);

    // Share functionality
    const handleShare = async () => {
        try {
            const currentUrl = window.location.href;
            await navigator.clipboard.writeText(currentUrl);
            setShareSuccess(true);
            setTimeout(() => setShareSuccess(false), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = window.location.href;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setShareSuccess(true);
            setTimeout(() => setShareSuccess(false), 2000);
        }
    };

    // Export to PDF functionality
    const handleExportPDF = async () => {
        try {
            setPDFExportLoading(true);
            await exportDashboardToPDF({
                stats: {
                    dataProjects: stats.dataProjects,
                    dataProviders: stats.dataProviders,
                    donorCountries: stats.donorCountries,
                },
                projectTypes: projectTypes,
                organizationTypes: organizationTypes,
                organizationsWithProjects: organizationsWithProjects,
                getFilterDescription: () => {
                    if (combinedDonors.length === 0 && investmentTypes.length === 0 && !appliedSearchQuery) {
                        return 'Showing all projects';
                    }
                    const parts: string[] = [];
                    if (combinedDonors.length > 0) {
                        parts.push(`${combinedDonors.length} donor ${combinedDonors.length === 1 ? 'country' : 'countries'}`);
                    }
                    if (investmentTypes.length > 0) {
                        parts.push(`${investmentTypes.length} investment ${investmentTypes.length === 1 ? 'type' : 'types'}`);
                    }
                    if (appliedSearchQuery) {
                        parts.push(`search: "${appliedSearchQuery}"`);
                    }
                    return parts.length > 0 ? `Showing ${parts.join(', ')}` : 'Showing all projects';
                }
            });
        } catch (error) {
            console.error('Failed to export PDF:', error);
            alert('Failed to export PDF. Please try again.');
        } finally {
            setPDFExportLoading(false);
        }
    };

    // Export to CSV functionality
    const handleExportCSV = async () => {
        try {
            setCSVExportLoading(true);
            await exportViewAsCSV(organizationsWithProjects, {
                searchQuery: appliedSearchQuery || undefined,
                donorCountries: combinedDonors,
                investmentTypes: investmentTypes,
                investmentThemes: investmentThemes
            });
        } catch (error) {
            console.error('Failed to export CSV:', error);
            alert('Failed to export CSV. Please try again.');
        } finally {
            setCSVExportLoading(false);
        }
    };

    // Export to XLSX functionality
    const handleExportXLSX = async () => {
        try {
            setXLSXExportLoading(true);
            await exportViewAsXLSX(organizationsWithProjects, {
                searchQuery: appliedSearchQuery || undefined,
                donorCountries: combinedDonors,
                investmentTypes: investmentTypes,
                investmentThemes: investmentThemes
            });
        } catch (error) {
            console.error('Failed to export XLSX:', error);
            alert('Failed to export XLSX. Please try again.');
        } finally {
            setXLSXExportLoading(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">{labels.loading.message}</p>
                </div>
            </div>
        );
    }


    // Extract data for use in component
    const { stats, projectTypes, organizationsWithProjects, allOrganizations, donorCountries: availableDonorCountries, investmentTypes: availableInvestmentTypes, topDonors } = dashboardData;

    // Add a 6th bar to the co-financing donor chart for 'n other donors'
    let donorChartData = topDonors;
    if (availableDonorCountries && topDonors && topDonors.length > 0) {
        const shownDonors = topDonors.map(d => d.name);
        const otherDonors = availableDonorCountries.filter(donor => !shownDonors.includes(donor));
        donorChartData = [
            ...topDonors,
            { name: `+ ${otherDonors.length} other donor${otherDonors.length === 1 ? '' : 's'}`, value: 0}
        ];
    }

    // Always show all investment types in the type filter
    const allKnownInvestmentTypes = Object.values(labels.investmentTypes);
    // Get all types from the pre-generated organizations-with-types.json dictionary
    // and combine with any types inferred from the current organizations list.
    // Get all organization types from organizations-table.json and organizationsWithProjects
    const typesFromTable = Array.from(
        new Set(
            organizationsTable
                .map(rec => {
                    const orgType = rec.fields['Org Type'];
                    if (typeof orgType === 'string') {
                        return orgType.trim();
                    } else if (Array.isArray(orgType) && orgType.length > 0) {
                        // Handle array case - take first element if it's a string
                        return typeof orgType[0] === 'string' ? orgType[0].trim() : undefined;
                    }
                    return undefined;
                })
                .filter((v): v is string => typeof v === 'string' && v.length > 0)
        )
    );
    const inferredTypes = Array.from(new Set(organizationsWithProjects.map(org => org.type).filter(Boolean)));
    const allOrgTypes = Array.from(new Set([...typesFromTable, ...inferredTypes]));

    // Calculate organization types using both organizationsWithProjects and organizationsTable
    const organizationTypes: OrganizationTypeData[] = calculateOrganizationTypesFromOrganizationsWithProjects(
        organizationsWithProjects,
        allOrgTypes
    );

    // Convert data for ChartCard components (they expect 'value' instead of 'count')
    const organizationTypesChartData = organizationTypes.map(item => ({ name: item.name, value: item.count }));
    const projectTypesChartData = projectTypes.map(item => ({ name: item.name, value: item.count }));

    // Generate dynamic filter description for Organizations & Projects section
    const getFilterDescription = () => {
        const hasFilters = combinedDonors.length > 0 || investmentTypes.length > 0 || investmentThemes.length > 0 || appliedSearchQuery;

        if (!hasFilters) {
            const template = labels.filterDescription.showingAll;
            const parts = template.split(/(\{[^}]+\})/);
            
            return (
                <>
                    {parts.map((part, index) => {
                        if (part === '{projects}') {
                            return <strong key={index}>{stats.dataProjects}</strong>;
                        } else if (part === '{organizations}') {
                            return <strong key={index}>{stats.dataProviders}</strong>;
                        }
                        return part;
                    })}
                </>
            );
        }

        const elements: React.ReactNode[] = [];

        // Start with donor countries
        if (combinedDonors.length > 0) {
            let donorString: string;
            if (combinedDonors.length === 1) {
                donorString = combinedDonors[0];
            } else if (combinedDonors.length === 2) {
                donorString = `${combinedDonors[0]} & ${combinedDonors[1]}`;
            } else {
                donorString = `${combinedDonors.slice(0, -1).join(', ')} & ${combinedDonors[combinedDonors.length - 1]}`;
            }

            // Get all donors from the currently filtered organizations
            const currentDonors = new Set<string>();
            organizationsWithProjects.forEach(org => {
                org.donorCountries.forEach(country => currentDonors.add(country));
            });

            // Calculate other donors (current donors minus the selected ones)
            const otherDonorsCount = currentDonors.size - combinedDonors.length;

            if (otherDonorsCount > 0) {
                const otherDonorLabel = otherDonorsCount !== 1 ? labels.filterDescription.donors : labels.filterDescription.donor;
                const verb = combinedDonors.length === 1 ? 'co-finances' : 'co-finance';
                elements.push(
                    <React.Fragment key="donors">
                        <strong>{donorString}</strong>, together with <strong>{otherDonorsCount}</strong> other {otherDonorLabel}, {verb}
                    </React.Fragment>
                );
            } else {
                const verb = combinedDonors.length === 1 ? 'funds' : 'co-finance';
                elements.push(
                    <React.Fragment key="donors">
                        <strong>{donorString}</strong> {verb}
                    </React.Fragment>
                );
            }
        } else {
            elements.push('Showing');
        }

        // Add organization count
        const organizationLabel = stats.dataProviders !== 1 ? 'organizations' : 'organization';
        elements.push(
            <React.Fragment key="orgs">
                {elements.length > 0 ? ' ' : ''}<strong>{stats.dataProviders}</strong> {organizationLabel}, providing
            </React.Fragment>
        );

        // Add project count
        const projectLabel = stats.dataProjects !== 1 ? 'assets' : 'asset';
        elements.push(
            <React.Fragment key="projects">
                {' '}<strong>{stats.dataProjects}</strong> {projectLabel}
            </React.Fragment>
        );

        // Add investment types
        if (investmentTypes.length > 0) {
            // Map selected type keys to display names where possible
            const displayTypes = investmentTypes.map(type => {
                const typeKey = Object.keys(labels.investmentTypes).find(key =>
                    labels.investmentTypes[key as keyof typeof labels.investmentTypes].toLowerCase().includes(type.toLowerCase()) ||
                    type.toLowerCase().includes(key.toLowerCase())
                );
                return typeKey ? labels.investmentTypes[typeKey as keyof typeof labels.investmentTypes] : type;
            });

            elements.push(
                <React.Fragment key="types">
                    {' '}in <strong>{displayTypes.join(' & ')}</strong>
                </React.Fragment>
            );
        }

        // Add investment themes
        if (investmentThemes.length > 0) {
            elements.push(
                <React.Fragment key="themes">
                    {' '}with themes <strong>{investmentThemes.join(' & ')}</strong>
                </React.Fragment>
            );
        }

        // Add search query (only if it's been applied)
        if (appliedSearchQuery) {
            elements.push(
                <React.Fragment key="search">
                    {' '}relating to <strong>"{appliedSearchQuery}"</strong>
                </React.Fragment>
            );
        }

        return <>{elements}</>;
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header Section - Fixed */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-[82rem] mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4">
                    <div className="flex items-center justify-between gap-2 sm:gap-0 mb-0">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                            <h1 className="text-lg sm:text-3xl bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent truncate">
                                <span className="qanelas-title">{labels.header.title}</span> <span className="font-roboto">{labels.header.subtitle}</span>
                            </h1>
                            <TooltipProvider>
                                <TooltipUI>
                                    <TooltipTrigger asChild>
                                        <div
                                            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border cursor-help bg-slate-100 border-slate-200 text-slate-600"
                                        >
                                            <span className="text-xs font-semibold">
                                                {labels.header.betaBadge}
                                            </span>
                                            <Info className="w-3.5 h-3.5 ml-2 text-slate-400" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent
                                        side="bottom"
                                        align="center"
                                        className="max-w-105 p-3 bg-white text-slate-800 text-sm rounded-lg border border-slate-200"
                                        sideOffset={6}
                                        avoidCollisions={true}
                                        style={{ ...STYLES.chartTooltip }}
                                    >
                                        <p className="leading-relaxed">{labels.header.betaTooltip}</p>
                                    </TooltipContent>
                                </TooltipUI>
                            </TooltipProvider>
                        </div>
                        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => window.open('https://airtable.com/apprObB2AsvMwfAAl/pagcre1SPjT0nJxa4/form', '_blank')}
                                className="bg-slate-50/50 border-slate-200 hover:var(--brand-bg-light) hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] text-xs sm:text-sm"
                                title={labels.header.feedbackTooltip}
                            >
                                <MessageCircle className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">{labels.header.feedbackButton}</span>
                            </Button>
                            
                            {/* Export Dropdown */}
                            <DropdownMenu onOpenChange={(open) => setExportMenuOpen(open)}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={csvExportLoading || xlsxExportLoading || pdfExportLoading}
                                        className="hidden sm:flex bg-slate-50/50 border-slate-200 hover:var(--brand-bg-light) hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] text-xs sm:text-sm"
                                        title="Export current view"
                                    >
                                        <FileDown className="w-4 h-4 sm:mr-2" />
                                        <span className="hidden sm:inline">
                                            {csvExportLoading ? 'Exporting CSV...' : xlsxExportLoading ? 'Exporting Excel...' : pdfExportLoading ? 'Exporting PDF...' : 'Export View'}
                                        </span>
                                        <ChevronDown className={`ml-1.5 h-3 w-3 opacity-50 shrink-0 transform transition-transform ${
                                            exportMenuOpen ? 'rotate-180' : ''
                                        }`} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent 
                                    align="end" 
                                    side="bottom"
                                    sideOffset={4}
                                    className="w-auto min-w-[200px] bg-white border border-slate-200 shadow-lg"
                                >
                                    <DropdownMenuItem
                                        onClick={handleExportCSV}
                                        disabled={csvExportLoading || xlsxExportLoading || pdfExportLoading}
                                        className="cursor-pointer text-[11px] py-2"
                                    >
                                        <FileDown className="w-3 h-3 mr-2" />
                                        Export as CSV (ZIP)
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={handleExportXLSX}
                                        disabled={csvExportLoading || xlsxExportLoading || pdfExportLoading}
                                        className="cursor-pointer text-[11px] py-2"
                                    >
                                        <FileDown className="w-3 h-3 mr-2" />
                                        Export as Excel (XLSX)
                                    </DropdownMenuItem>
                                    {/* PDF Export temporarily hidden
                                    <DropdownMenuItem
                                        onClick={handleExportPDF}
                                        disabled={csvExportLoading || xlsxExportLoading || pdfExportLoading}
                                        className="cursor-pointer text-[11px] py-2"
                                    >
                                        <FileDown className="w-3 h-3 mr-2" />
                                        Export as PDF
                                    </DropdownMenuItem>
                                    */}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleShare}
                                className={`bg-slate-50/50 border-slate-200 hover:var(--brand-bg-light) hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] text-xs sm:text-sm ${shareSuccess
                                    ? 'text-white border-[var(--color-success)] bg-[var(--color-success)] hover:bg-[var(--color-success-hover)] hover:text-slate-100 hover:border-[var(--color-success-hover)]'
                                    : 'hover:var(--brand-bg-light)'
                                    }`}
                                style={shareSuccess ? { backgroundColor: 'var(--color-success)' } : {}}
                                title={labels.ui.copyToClipboard}
                            >
                                <Share2 className="w-4 h-4 sm:mr-2" />
                                <span className="hidden sm:inline">{shareSuccess ? labels.header.shareButtonSuccess : labels.header.shareButton}</span>
                            </Button>
                            {logoutButton}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Add top padding to account for fixed header */}
            <div className="max-w-[82rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pt-20 sm:pt-24">
                <div className="space-y-4 sm:space-y-[var(--spacing-section)]">

                    {/* Survey Banner */}
                    <SurveyBanner />

                    {/* Statistics Cards */}
                    <div className="sm:hidden">
                        {/* Mobile Carousel */}
                        <div className="relative overflow-hidden">
                            <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 px-1">
                                <div className="flex-shrink-0 w-[280px] snap-center">
                                    <StatCard
                                        icon={<Globe style={{ color: 'var(--brand-primary)' }} />}
                                        title={labels.stats.donorCountries.title}
                                        value={stats.donorCountries}
                                        label={labels.stats.donorCountries.label}
                                        colorScheme="amber"
                                        tooltip={labels.stats.donorCountries.tooltip}
                                    />
                                </div>
                                <div className="flex-shrink-0 w-[290px] snap-center">
                                    <StatCard
                                        icon={<Building2 style={{ color: 'var(--brand-primary)' }} />}
                                        title={labels.stats.dataProviders.title}
                                        value={stats.dataProviders}
                                        label={labels.stats.dataProviders.label}
                                        colorScheme="amber"
                                        tooltip={labels.stats.dataProviders.tooltip}
                                    />
                                </div>
                                <div className="flex-shrink-0 w-[280px] snap-center">
                                    <StatCard
                                        icon={<Database style={{ color: 'var(--brand-primary)' }} />}
                                        title={labels.stats.dataProjects.title}
                                        value={stats.dataProjects}
                                        label={labels.stats.dataProjects.label}
                                        colorScheme="amber"
                                        tooltip={labels.stats.dataProjects.tooltip}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Desktop Grid */}
                    <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-[var(--spacing-section)]">

                        <StatCard
                            icon={<Globe style={{ color: 'var(--brand-primary)' }} />}
                            title={labels.stats.donorCountries.title}
                            value={stats.donorCountries}
                            label={labels.stats.donorCountries.label}
                            colorScheme="amber"
                            tooltip={labels.stats.donorCountries.tooltip}
                        />
                        
                        <StatCard
                            icon={<Building2 style={{ color: 'var(--brand-primary)' }} />}
                            title={labels.stats.dataProviders.title}
                            value={stats.dataProviders}
                            label={labels.stats.dataProviders.label}
                            colorScheme="amber"
                            tooltip={labels.stats.dataProviders.tooltip}
                        />

                        <StatCard
                            icon={<Database style={{ color: 'var(--brand-primary)' }} />}
                            title={labels.stats.dataProjects.title}
                            value={stats.dataProjects}
                            label={labels.stats.dataProjects.label}
                            colorScheme="amber"
                            tooltip={labels.stats.dataProjects.tooltip}
                        />

                    </div>

                    {/* Main Layout - Two Columns */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-[var(--spacing-section)]">

                        {/* Left Column - Filters and Table */}
                        <div className="xl:col-span-2 space-y-4 sm:space-y-[var(--spacing-section)]">
                            {/* Organizations Table Section */}
                            <div>
                                <Card className={STYLES.cardGlass}>
                    <CardHeader className="pb-0 h-0">
                        <CardTitle className="flex flex-row items-center justify-between gap-3 w-full mb-2">
                            <SectionHeader
                                icon={
                                    organizationsWithProjects && organizationsWithProjects.some(org => org.projects && org.projects.length > 0)
                                        ? <FolderOpenDot style={{ color: 'var(--brand-primary)' }}  />
                                        : <FolderDot style={{ color: 'var(--brand-primary)' }}  />
                                }
                                title={labels.sections.organizationsAndProjects}
                            />

                            <div className="flex items-center gap-2">
                                {/* Sort Dropdown only for Table view */}
                                {activeView === 'table' && (
                                    <div className="animate-in slide-in-from-right-5 fade-in duration-300">
                                        <DropdownMenu onOpenChange={(open) => setSortMenuOpen(open)}>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="hidden sm:flex h-7 w-auto px-2.5 justify-between font-medium transition-all bg-slate-50/50 border-slate-200 hover:bg-white hover:border-slate-300 text-[11px]"
                                            >
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    {sortBy === 'name' ? (
                                                        // For alphabetical: asc = A-Z (down), desc = Z-A (up)
                                                        sortDirection === 'asc' ? (
                                                            <ArrowDownWideNarrow className="w-3 h-3 shrink-0" />
                                                        ) : (
                                                            <ArrowUpWideNarrow className="w-3 h-3 shrink-0" />
                                                        )
                                                    ) : (
                                                        // For numbers: asc = low-to-high (up), desc = high-to-low (down)
                                                        sortDirection === 'asc' ? (
                                                            <ArrowUpWideNarrow className="w-3 h-3 shrink-0" />
                                                        ) : (
                                                            <ArrowDownWideNarrow className="w-3 h-3 shrink-0" />
                                                        )
                                                    )}
                                                    <span className="truncate">
                                                        {sortBy === 'name' 
                                                            ? 'Alphabetically' 
                                                            : sortBy === 'donors' 
                                                            ? 'Donors' 
                                                            : 'Assets'}
                                                    </span>
                                                </div>
                                                <ChevronDown className={`ml-1.5 h-3 w-3 opacity-50 shrink-0 transform transition-transform ${
                                                    sortMenuOpen ? 'rotate-180' : ''
                                                }`} />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent 
                                            align="end" 
                                            side="bottom"
                                            sideOffset={4}
                                            className="w-auto min-w-[180px] bg-white border border-slate-200 shadow-lg"
                                        >
                                            <DropdownMenuItem
                                                onClick={() => onSortChange('name', 'asc')}
                                                className="cursor-pointer text-[11px] py-1"
                                            >
                                                <ArrowDownWideNarrow className="w-3 h-3 mr-2" />
                                                Alphabetically (A-Z)
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onSortChange('name', 'desc')}
                                                className="cursor-pointer text-[11px] py-1"
                                            >
                                                <ArrowUpWideNarrow className="w-3 h-3 mr-2" />
                                                Alphabetically (Z-A)
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onSortChange('donors', 'desc')}
                                                className="cursor-pointer text-[11px] py-1"
                                            >
                                                <ArrowDownWideNarrow className="w-3 h-3 mr-2" />
                                                Number of Donors
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onSortChange('donors', 'asc')}
                                                className="cursor-pointer text-[11px] py-1"
                                            >
                                                <ArrowUpWideNarrow className="w-3 h-3 mr-2" />
                                                Number of Donors
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onSortChange('assets', 'desc')}
                                                className="cursor-pointer text-[11px] py-1"
                                            >
                                                <ArrowDownWideNarrow className="w-3 h-3 mr-2" />
                                                Number of Assets
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onSortChange('assets', 'asc')}
                                                className="cursor-pointer text-[11px] py-1"
                                            >
                                                <ArrowUpWideNarrow className="w-3 h-3 mr-2" />
                                                Number of Assets
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    </div>
                                )}
                                {/* View Toggle Switch Tabs */}
                                <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'table' | 'network')} className="w-auto hidden sm:flex">
                                    <TabsList className="h-7 p-0.5 bg-slate-50 border border-slate-200 rounded-md">
                                        <TabsTrigger
                                            value="table"
                                            className="h-6 px-2.5 text-[11px] font-medium rounded-md transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200 data-[state=active]:text-slate-800 text-slate-600 bg-slate-50 border-none"
                                        >
                                            <Table className="h-3 w-3 mr-1.5" />
                                            Table
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="network"
                                            className="h-6 px-2.5 text-[11px] font-medium rounded-md transition-all data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-slate-200 data-[state=active]:text-slate-800 text-slate-600 bg-slate-50 border-none"
                                        >
                                            <Network className="h-3 w-3 mr-1.5" />
                                            Network
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                                
                                
                            </div>
                        </CardTitle>
                        

                    </CardHeader>                                    {/* Filters */}
                                    <CardContent className="p-4 sm:p-6">
                                        <FilterBar
                                            searchQuery={searchQuery}
                                            appliedSearchQuery={appliedSearchQuery}
                                            onSearchChange={onSearchChange}
                                            onSearchSubmit={onSearchSubmit}
                                            combinedDonors={combinedDonors}
                                            availableDonorCountries={availableDonorCountries}
                                            onDonorsChange={onDonorsChange}
                                            investmentTypes={investmentTypes}
                                            allKnownInvestmentTypes={allKnownInvestmentTypes}
                                            onTypesChange={onTypesChange}
                                            investmentThemes={investmentThemes}
                                            allKnownInvestmentThemes={allKnownInvestmentThemes}
                                            investmentThemesByType={investmentThemesByType}
                                            onThemesChange={onThemesChange}
                                            onResetFilters={onResetFilters}
                                            projectCountsByType={projectCountsByType}
                                            projectCountsByTheme={projectCountsByTheme}
                                            filterDescription={getFilterDescription()}
                                            className="-mb-6 sm:-mb-7"
                                        />
                                    </CardContent>

                                    {/* Tabs for Table and Network View */}
                                    <CardContent className="px-4 sm:px-6 pt-2 sm:pt-0">
                                        <Tabs value={activeView} className="w-full">
                                            <TabsContent value="table" className="mt-0">
                                        <div className="space-y-2 transition-all duration-500">
                                            {organizationsWithProjects
                                                .sort((a, b) => {
                                                    let comparison = 0;
                                                    
                                                    if (sortBy === 'name') {
                                                        comparison = a.organizationName.localeCompare(b.organizationName);
                                                    } else if (sortBy === 'donors') {
                                                        // Sort by number of unique donors
                                                        comparison = a.donorCountries.length - b.donorCountries.length;
                                                    } else if (sortBy === 'assets') {
                                                        // Sort by number of projects/assets
                                                        comparison = a.projects.length - b.projects.length;
                                                    }
                                                    
                                                    // Apply sort direction
                                                    return sortDirection === 'asc' ? comparison : -comparison;
                                                })
                                                .map((org) => {
                                                    const isExpanded = expandedOrgs.has(org.id);
                                                    const hasProjects = org.projects.length > 0;

                                                    return (
                                                        <Collapsible
                                                            key={org.id}
                                                            open={isExpanded}
                                                            onOpenChange={() => {
                                                                const newExpanded = new Set(expandedOrgs);
                                                                if (isExpanded) {
                                                                    newExpanded.delete(org.id);
                                                                } else {
                                                                    newExpanded.add(org.id);
                                                                }
                                                                setExpandedOrgs(newExpanded);
                                                            }}
                                                            className="transition-all duration-500 ease-out"
                                                        >
                                                            <CollapsibleTrigger
                                                                className="w-full"
                                                            >
                                                                <div className="flex flex-col sm:flex-row sm:justify-between p-3 sm:p-4 hover:bg-slate-50/70 rounded-lg border border-slate-200 bg-slate-50/30 animate-in fade-in gap-3 sm:gap-0 cursor-pointer min-h-[80px]">
                                                                    <div className="flex items-center space-x-3 flex-1">
                                                                        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center"> {/* Fixed size container with centering */}
                                                                            {hasProjects ? (
                                                                                isExpanded ? (
                                                                                    <ChevronDown className="h-4 w-4 text-slate-500" />
                                                                                ) : (
                                                                                    <ChevronRight className="h-4 w-4 text-slate-500" />
                                                                                )
                                                                            ) : (
                                                                                // Keep the same space but make the placeholder invisible when there are no projects
                                                                                <div className="h-4 w-4 invisible" aria-hidden="true" />
                                                                            )}
                                                                        </div>
                                                                        <div className="text-left flex-1 min-w-0">
                                                                            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-baseline gap-1 sm:gap-2">
                                                                                <h3
                                                                                    className="font-medium text-slate-900 cursor-pointer transition-colors hover:text-[var(--brand-primary)] text-sm sm:text-base"
                                                                                    onClick={e => {
                                                                                        e.stopPropagation();
                                                                                        // Get Org Short Name from nested organizations data (used for lookup in selectedOrganization)
                                                                                        const nestedOrg = nestedOrganizations.find(n => n.id === org.id);
                                                                                        const orgShortName = nestedOrg?.fields?.['Org Short Name'];
                                                                                        if (orgShortName) {
                                                                                            onOpenOrganizationModal(orgShortName.toLowerCase());
                                                                                        }
                                                                                    }}
                                                                                >
                                                                                    {org.organizationName}
                                                                                </h3>
                                                                                {(() => {
                                                                                    // Find matching record in organizations-table.json
                                                                                    const orgTableMatch = organizationsTable.find(rec => {
                                                                                        const full = (rec.fields['Org Full Name'] as string) || '';
                                                                                        const short = (rec.fields['Org Short Name'] as string) || '';
                                                                                        const altFull = (rec.fields['Org Fullname'] as string) || '';
                                                                                        const normalized = (name: string) => name.replace(/\s+/g, ' ').trim().toLowerCase();
                                                                                        const target = normalized(org.organizationName || org.id);
                                                                                        return [full, short, altFull].some(s => normalized(String(s || '')) === target);
                                                                                    });
                                                                                    const orgType = orgTableMatch?.fields['Org Type'] as string | undefined;
                                                                                    return orgType ? (
                                                                                        <div className="sm:inline-flex items-center px-1.5 py-px rounded text-[11px] font-medium text-slate-500 bg-transparent border border-slate-200 whitespace-nowrap flex-shrink-0">
                                                                                            {orgType}
                                                                                        </div>
                                                                                    ) : null;
                                                                                })()}
                                                                            </div>
                                                                            <div className="flex flex-wrap gap-1 mt-2 max-w-full">
                                                                                {(() => {
                                                                                    const isCountriesExpanded = expandedCountries.has(org.id);

                                                                                    // Deduplicate countries first
                                                                                    const uniqueCountries = Array.from(new Set(org.donorCountries)) as string[];
                                                                                    // Sort countries: selected donors first, then others alphabetically
                                                                                    let sortedCountries = [...uniqueCountries];
                                                                                    if (combinedDonors.length > 0) {
                                                                                        sortedCountries = [
                                                                                            ...uniqueCountries.filter((c: string) => combinedDonors.includes(c)),
                                                                                            ...uniqueCountries.filter((c: string) => !combinedDonors.includes(c)).sort()
                                                                                        ];
                                                                                    }
                                                                                    // Dynamic country limit based on available space
                                                                                    const calculateCollapsedLimit = () => {
                                                                                        // Estimate available space (characters) - mobile vs desktop
                                                                                        const maxCharsMobile = 50;  // Approximate characters that fit on mobile
                                                                                        const maxCharsDesktop = 100; // More space on desktop
                                                                                        const maxChars = window.innerWidth < 640 ? maxCharsMobile : maxCharsDesktop;
                                                                                        
                                                                                        let totalChars = 0;
                                                                                        let countriesToShow = [];
                                                                                        
                                                                                        for (const country of sortedCountries) {
                                                                                            // Estimate badge size: country name + padding/margins (roughly +8 chars)
                                                                                            const estimatedSize = country.length + 8;
                                                                                            
                                                                                            if (totalChars + estimatedSize <= maxChars) {
                                                                                                countriesToShow.push(country);
                                                                                                totalChars += estimatedSize;
                                                                                            } else {
                                                                                                break;
                                                                                            }
                                                                                        }
                                                                                        
                                                                                        // Ensure at least 1 country is shown, max 5 total
                                                                                        return countriesToShow.length === 0 ? 1 : Math.min(countriesToShow.length, 5);
                                                                                    };
                                                                                    
                                                                                    const maxCountriesToShowCollapsed = calculateCollapsedLimit();
                                                                                    const countriesToShow = isCountriesExpanded ? sortedCountries : sortedCountries.slice(0, maxCountriesToShowCollapsed);

                                                                                    return (
                                                                                        <>
                                                                                            {countriesToShow.map((country: string, idx: number) => (
                                                                                                <Badge
                                                                                                    key={idx}
                                                                                                    text={country}
                                                                                                    variant={combinedDonors.includes(country) ? 'blue' : 'slate'}
                                                                                                />
                                                                                            ))}
                                                                                            {sortedCountries.length > maxCountriesToShowCollapsed && !isCountriesExpanded && (
                                                                                                <div
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        const newExpanded = new Set(expandedCountries);
                                                                                                        newExpanded.add(org.id);
                                                                                                        setExpandedCountries(newExpanded);
                                                                                                    }}
                                                                                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-000 text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                                                                                >
                                                                                                    +{sortedCountries.length - maxCountriesToShowCollapsed} {labels.filters.showMore}
                                                                                                </div>
                                                                                            )}
                                                                                            {isCountriesExpanded && sortedCountries.length > maxCountriesToShowCollapsed && (
                                                                                                <div
                                                                                                    onClick={(e) => {
                                                                                                        e.stopPropagation();
                                                                                                        const newExpanded = new Set(expandedCountries);
                                                                                                        newExpanded.delete(org.id);
                                                                                                        setExpandedCountries(newExpanded);
                                                                                                    }}
                                                                                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-000 text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                                                                                >
                                                                                                    {labels.filters.showLess}
                                                                                                </div>
                                                                                            )}
                                                                                        </>
                                                                                    );
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex flex-col justify-between items-end self-stretch flex-shrink-0 min-w-[100px]">
                                                                        <Button
                                                                            asChild
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const nestedOrg = nestedOrganizations.find((n) => n.id === org.id);
                                                                                const orgShortName = nestedOrg?.fields?.['Org Short Name'];
                                                                                if (orgShortName) {
                                                                                    onOpenOrganizationModal(orgShortName.toLowerCase());
                                                                                }
                                                                            }}
                                                                                className="hidden sm:inline-flex items-center justify-center gap-1 text-[10px] h-6 px-2 rounded-md text-[var(--badge-slate-bg)] bg-[var(--badge-slate-text)] hover:bg-slate-400 duration-150"
                                                                            >
                                                                            <div className="hidden sm:inline-flex items-center justify-center gap-1">
                                                                                <Info className="w-3 h-3" />
                                                                                <span>Details</span>
                                                                            </div>
                                                                        </Button>
                                                                        <div className="text-xs sm:text-xs text-slate-600 whitespace-nowrap">
                                                                            {org.projects.length > 0 ? (
                                                                                isExpanded ?
                                                                                    `Showing ${org.projects.length} Asset${org.projects.length === 1 ? '' : 's'}` :
                                                                                    `Expand to see ${org.projects.length} Asset${org.projects.length === 1 ? '' : 's'}`
                                                                            ) : (
                                                                                `${org.projects.length} Asset${org.projects.length === 1 ? '' : 's'}`
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </CollapsibleTrigger>
                                                            <CollapsibleContent>
                                                                <div className="mt-2 ml-4 sm:ml-7 space-y-2">
                                                                    {org.projects.map((project: ProjectData) => (
                                                                        <div
                                                                            key={project.id}
                                                                            className="p-3 bg-slate-50 rounded-lg border border-slate-100 hover:bg-slate-100 cursor-pointer transition-colors duration-200 animate-in fade-in group"
                                                                            onClick={() => {
                                                                                // Get product_key from nested data
                                                                                const nestedOrg = nestedOrganizations.find((n: any) => n.id === org.id);
                                                                                const nestedProject = nestedOrg?.projects?.find((p: any) => p.id === project.id);
                                                                                const projectKey = nestedProject?.fields?.product_key;
                                                                                if (projectKey) {
                                                                                    onOpenProjectModal(projectKey);
                                                                                }
                                                                            }}
                                                                        >
                                                                            <div className="mb-2">
                                                                                <div className="flex flex-wrap items-center gap-2 gap-y-1">
                                                                                    <span className="font-medium text-slate-900 group-hover:text-[var(--brand-primary)] transition-colors">
                                                                                        {project.projectName}
                                                                                    </span>
                                                                                    {project.investmentTypes.length > 0 && (
                                                                                        <div className="flex flex-wrap gap-1 items-center">
                                                                                            {project.investmentTypes.map((type, idx) => {
                                                                                                const IconComponent = getIconForInvestmentType(type);
                                                                                                return (
                                                                                                    <span 
                                                                                                        key={idx} 
                                                                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold"
                                                                                                        style={{
                                                                                                            backgroundColor: 'var(--badge-other-bg)',
                                                                                                            color: 'var(--badge-other-text)'
                                                                                                        }}
                                                                                                    >
                                                                                                        <IconComponent className="w-3.5 h-3.5" />
                                                                                                        {type}
                                                                                                    </span>
                                                                                                );
                                                                                            })}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                            <div>
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {project.donorCountries.length > 0 ? (
                                                                                        project.donorCountries.map((country, idx) => (
                                                                                            <Badge key={idx} text={country} variant={combinedDonors.includes(country) ? 'blue' : 'slate'} />
                                                                                        ))
                                                                                    ) : (
                                                                                        <span className="text-xs text-slate-500">Asset donors not specified</span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </CollapsibleContent>
                                                        </Collapsible>
                                                    );
                                                })}
                                        </div>
                                            </TabsContent>

                                            <TabsContent value="network" className="mt-0">
                                                <div className="w-full" style={{ height: '600px' }}>
                                                    <NetworkGraph
                                                        organizationsWithProjects={organizationsWithProjects}
                                                        allOrganizations={allOrganizations}
                                                        onOpenOrganizationModal={onOpenOrganizationModal}
                                                        onOpenProjectModal={onOpenProjectModal}
                                                        selectedOrgKey={selectedOrgKey}
                                                        selectedProjectKey={selectedProjectKey}
                                                        searchQuery={searchQuery}
                                                        appliedSearchQuery={appliedSearchQuery}
                                                        onSearchChange={onSearchChange}
                                                        onSearchSubmit={onSearchSubmit}
                                                        combinedDonors={combinedDonors}
                                                        availableDonorCountries={availableDonorCountries}
                                                        onDonorsChange={onDonorsChange}
                                                        investmentTypes={investmentTypes}
                                                        allKnownInvestmentTypes={allKnownInvestmentTypes}
                                                        onTypesChange={onTypesChange}
                                                        investmentThemes={investmentThemes}
                                                        allKnownInvestmentThemes={allKnownInvestmentThemes}
                                                        investmentThemesByType={investmentThemesByType}
                                                        onThemesChange={onThemesChange}
                                                        onResetFilters={onResetFilters}
                                                        filterDescription={getFilterDescription()}
                                                    />
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Right Column - Charts */}
                        <div className="space-y-4 sm:space-y-[var(--spacing-section)]">

                            {/* Co-financing donors chart - only show when donors are selected */}
                            <div
                                className={`transition-all duration-1200 ease-in-out ${
                                    combinedDonors.length > 0
                                        ? 'max-h-[1000px] mb-6'
                                        : 'max-h-0 overflow-hidden mb-0'
                                }`}
                            >
                                <ChartCard
                                    title={labels.sections.donorCount}
                                    icon={<Globe style={{ color: 'var(--brand-primary)' }}  />}
                                    data={donorChartData}
                                    barColor="var(--brand-primary-lighter)"
                                    footnote={
                                        combinedDonors.length > 0
                                            ? `Showing ${topDonors.length} donor${topDonors.length === 1 ? '' : 's'} co-financing the most organizations together with ${
                                                combinedDonors.length === 1
                                                    ? combinedDonors[0]
                                                    : combinedDonors.length === 2
                                                    ? `${combinedDonors[0]} & ${combinedDonors[1]}`
                                                    : `${combinedDonors.slice(0, -1).join(', ')} & ${combinedDonors[combinedDonors.length - 1]}`
                                            }`
                                            : `Showing ${topDonors.length} donor${topDonors.length === 1 ? '' : 's'} funding the most organizations in the current view`
                                    }
                                />
                            </div>

                            <ChartCard
                                title={labels.sections.organizationTypes}
                                icon={<Building2 style={{ color: 'var(--brand-primary)' }}  />}
                                data={organizationTypesChartData}
                                barColor="var(--brand-primary-lighter)"
                            />
                            <ChartCard
                                title={labels.sections.projectCategories}
                                icon={<Database style={{ color: 'var(--brand-primary)' }}  />}
                                data={projectTypesChartData}
                                barColor="var(--brand-primary-lighter)"
                                footnote={labels.ui.chartFootnote}
                            />
                           
                        </div>
                    </div>
                </div>
            </div>

            {/* Impressum Footer */}
            <footer className="bg-white border-t border-slate-200 mt-8 sm:mt-16">
                <div className="max-w-[82rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 sm:gap-0">

                        <div className="text-center flex-1">
                            <p className="text-xs sm:text-sm text-slate-600">
                                {labels.footer.dataGatheredBy}{' '}
                                <a
                                    href="https://crafd.io"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium hover:underline"
                                    style={{ color: 'var(--brand-primary)' }}
                                >
                                    {labels.footer.organization}
                                </a>
                                {' '}

                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {labels.footer.copyright.replace('{year}', new Date().getFullYear().toString())}
                            </p>
                        </div>

                    </div>
                </div>
            </footer>

            {/* Project Modal */}
            {selectedProject && (
                <ProjectModal
                    project={selectedProject.project}
                    organizationName={selectedProject.organizationName}
                    allOrganizations={allOrganizations}
                    loading={false}
                    onOpenOrganizationModal={onOpenOrganizationModal}
                    onDonorClick={onDonorClick}
                />
            )}
            {/* Organization Modal */}
            {selectedOrganization && (
                (() => {
                    // Find matching record in organizations table using clean field names
                    const match = organizationsTable.find(rec => {
                        const full = (rec.fields['Org Full Name'] as string) || '';
                        const short = (rec.fields['Org Short Name'] as string) || '';
                        const normalized = (name: string) => name.replace(/\s+/g, ' ').trim().toLowerCase();
                        const target = normalized(selectedOrganization.organizationName || selectedOrganization.id);
                        return [full, short].some(s => normalized(String(s || '')) === target);
                    });

                    // Use the matched record directly, or create a minimal fallback
                    const orgRecord = match || {
                        id: selectedOrganization.id,
                        fields: {
                            'Org Full Name': selectedOrganization.organizationName,
                        }
                    };

                    return (
                        <OrganizationModal
                            organization={orgRecord}
                            projectNameMap={projectNameMap}
                            orgProjectsMap={orgProjectsMap}
                            orgDonorCountriesMap={orgDonorCountriesMap}
                            loading={false}
                            onOpenProjectModal={onOpenProjectModal}
                            projectIdToKeyMap={projectIdToKeyMap}
                            onDonorClick={onDonorClick}
                        />
                    );
                })()
            )}
        </div>
    );
};

export default CrisisDataDashboard;