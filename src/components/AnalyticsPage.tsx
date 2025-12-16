'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import ChartCard from '@/components/ChartCard';
import FilterBar from '@/components/FilterBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip as TooltipUI, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Globe, Search, Filter, ChevronDown, Building2, Database, BarChart3, Network, GitBranch, Users, Target, SearchCheck, LayoutGrid, Columns, Radar as RadarIcon, AlertCircle } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Label } from 'recharts';
import { getIconForInvestmentType } from '@/config/investmentTypeIcons';
import { SectionHeader } from './SectionHeader';
import { useTips } from '@/contexts/TipsContext';
import { useGeneralContributions } from '@/contexts/GeneralContributionsContext';
import { toUrlSlug, matchesUrlSlug } from '@/lib/urlShortcuts';
import labels from '@/config/labels.json';

interface AnalyticsPageProps {
    logoutButton?: React.ReactNode;
}

interface OrganizationData {
    id: string;
    name: string;
    fields: {
        'Provided Data Ecosystem Projects'?: string[];
        'Organization Type'?: string;
        [key: string]: any;
    };
    agencies?: Array<{
        id: string;
        fields: {
            'Country Name'?: string;
            [key: string]: any;
        };
    }>;
    projects?: Array<{
        id: string;
        name?: string;
        fields: {
            'Investment Type'?: string;
            'Project Name'?: string;
            [key: string]: any;
        };
        agencies?: Array<{
            id: string;
            fields: {
                'Country Name'?: string;
                [key: string]: any;
            };
        }>;
    }>;
}

// Consolidated style constants
const STYLES = {
    statCard: "!border-0 transition-all duration-300 hover:ring-2 hover:ring-slate-300/50",
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

// Reusable StatCard component
interface StatCardProps {
    icon: React.ReactNode;
    title: string;
    value: number | string;
    label: string;
    colorScheme: 'amber';
    tooltip?: React.ReactNode;
}

const MATRIX_BUTTON_CLASS =
  "px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5";

const MATRIX_MODES = [
    { value: 'split', label: 'Split Matrix', Icon: LayoutGrid },
  { value: 'unified', label: 'Overview', Icon: Columns },

] as const;

const StatCard = ({ icon, title, value, label, colorScheme, tooltip }: StatCardProps) => {
    const { tipsEnabled } = useTips();
    
    const gradients = {
        amber: {
            bg: 'from-[var(--brand-bg-lighter)] to-[var(--brand-bg-light)]',
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

    if (tooltip && tipsEnabled) {
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
                        <div className="leading-relaxed">{tooltip}</div>
                    </TooltipContent>
                </TooltipUI>
            </TooltipProvider>
        );
    }

    return cardContent;
};

// Helper to get color intensity for organizations (orange/amber)
const getOrgColorIntensity = (count: number, max: number): string => {
    if (count === 0) return 'bg-slate-50';
    const intensity = Math.min(Math.ceil((count / max) * 5), 5);
    const colorMap: Record<number, string> = {
        1: 'bg-amber-100',
        2: 'bg-amber-200',
        3: 'bg-amber-300',
        4: 'bg-amber-400',
        5: 'bg-amber-500'
    };
    return colorMap[intensity] || 'bg-slate-50';
};

// Helper to get color intensity for projects (purple/indigo)
const getProjectColorIntensity = (count: number, max: number): string => {
    if (count === 0) return 'bg-slate-50';
    const ratio = count / max;
    if (ratio <= 0.2) return 'bg-indigo-100';
    if (ratio <= 0.4) return 'bg-indigo-200';
    if (ratio <= 0.6) return 'bg-indigo-300';
    if (ratio <= 0.8) return 'bg-indigo-400';
    return 'bg-indigo-500';
};

export default function AnalyticsPage({ logoutButton }: AnalyticsPageProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [organizationsData, setOrganizationsData] = useState<OrganizationData[]>([]);
    const [shareSuccess, setShareSuccess] = useState(false);
    const [selectedDonors, setSelectedDonors] = useState<string[]>([]);
    const [investmentTypes, setInvestmentTypes] = useState<string[]>([]);
    const [investmentThemes, setInvestmentThemes] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedSearchQuery, setAppliedSearchQuery] = useState('');
    const [isInitialized, setIsInitialized] = useState(false);
    const [hoveredCell, setHoveredCell] = useState<{ donor1: string; donor2: string } | null>(null);
    const [matrixViewMode, setMatrixViewMode] = useState<'unified' | 'split'>('split');
    
    // Load filter state from URL on mount — accept both long and short param keys
    useEffect(() => {
        const rawDonors = searchParams.get('d') ?? searchParams.get('donors') ?? '';
        const urlDonorSlugs = rawDonors.split(',').filter(Boolean);

        const rawTypes = searchParams.get('types') ?? searchParams.get('t') ?? '';
        const urlTypes = rawTypes.split(',').map(s => decodeURIComponent(s)).filter(Boolean);

        const rawThemes = searchParams.get('themes') ?? searchParams.get('th') ?? '';
        const urlThemes = rawThemes.split(',').map(s => decodeURIComponent(s)).filter(Boolean);

        const urlQuery = searchParams.get('q') ?? searchParams.get('search') ?? '';

        // Apply decoded values to state
        setInvestmentTypes(urlTypes);
        setInvestmentThemes(urlThemes);
        setAppliedSearchQuery(urlQuery);
        setSearchQuery(urlQuery);

        // Store URL donor slugs temporarily to decode them later
        (window as any).__urlDonorSlugs = urlDonorSlugs;

        setIsInitialized(true);
    }, [searchParams]);
    
    // Extract all available donor countries from data
    const availableDonorCountries = useMemo(() => {
        const donorSet = new Set<string>();
        organizationsData.forEach(org => {
            if (org.agencies && Array.isArray(org.agencies)) {
                org.agencies.forEach((agency: any) => {
                    const countryName = agency.fields?.['Country Name'];
                    if (countryName && typeof countryName === 'string') {
                        donorSet.add(countryName);
                    }
                });
            }
        });
        return Array.from(donorSet).sort();
    }, [organizationsData]);

    // Extract all available investment types
    const allKnownInvestmentTypes = useMemo(() => {
        return Object.values(labels.investmentTypes);
    }, []);

    // Extract all available investment themes
    const allKnownInvestmentThemes = useMemo(() => {
        const themesSet = new Set<string>();
        organizationsData.forEach(org => {
            if (org.projects && Array.isArray(org.projects)) {
                org.projects.forEach(project => {
                    const themes = project.fields?.['Investment Theme(s)'];
                    if (Array.isArray(themes)) {
                        themes.forEach(theme => {
                            if (typeof theme === 'string' && theme.trim()) {
                                themesSet.add(theme.trim());
                            }
                        });
                    }
                });
            }
        });
        return Array.from(themesSet).sort();
    }, [organizationsData]);

    useEffect(() => {
        fetch('/data/organizations-nested.json')
            .then(res => res.json())
            .then(data => {
                setOrganizationsData(data);
                // Start with no donors selected
            })
            .catch(err => console.error('Failed to load organizations:', err));
    }, []);

    // Decode URL donor slugs to actual names once available donors are loaded
    useEffect(() => {
        if (availableDonorCountries.length === 0 || selectedDonors.length > 0) return;
        
        const urlDonorSlugs = (window as any).__urlDonorSlugs;
        if (urlDonorSlugs && urlDonorSlugs.length > 0) {
            const decodedDonors = urlDonorSlugs
                .map((slug: string) => availableDonorCountries.find(d => matchesUrlSlug(slug, d)))
                .filter(Boolean);
            
            if (decodedDonors.length > 0) {
                setSelectedDonors(decodedDonors);
            }
            
            delete (window as any).__urlDonorSlugs;
        }
    }, [availableDonorCountries]);

    // Update URL when filters change (but only after initialization to avoid overwriting URL params)
    useEffect(() => {
        if (!isInitialized) return;

        const params = new URLSearchParams();
        
        if (selectedDonors.length > 0) {
            params.set('d', selectedDonors.map(d => toUrlSlug(d)).join(','));
        }
        
        if (investmentTypes.length > 0) {
            params.set('types', investmentTypes.join(','));
        }
        
        if (investmentThemes.length > 0) {
            params.set('themes', investmentThemes.join(','));
        }
        
        if (appliedSearchQuery) {
            params.set('q', appliedSearchQuery);
        }
        
        const newUrl = params.toString() ? `/analytics?${params.toString()}` : '/analytics';
        router.push(newUrl);
    }, [selectedDonors, investmentTypes, investmentThemes, appliedSearchQuery, isInitialized, router]);

    // Filter organizations using the SAME logic as the dashboard (including project-level donors)
    const filteredOrganizationsData = useMemo(() => {
        if (selectedDonors.length === 0) return [];

        return organizationsData.filter(org => {
            // Get all donor countries from BOTH org-level and project-level
            const allDonorsSet = new Set<string>();
            
            // Add org-level donors
            if (org.agencies && Array.isArray(org.agencies)) {
                org.agencies.forEach(agency => {
                    const countryName = agency.fields?.['Country Name'];
                    if (countryName && typeof countryName === 'string') {
                        allDonorsSet.add(countryName);
                    }
                });
            }
            
            // Add project-level donors
            if (org.projects && Array.isArray(org.projects)) {
                org.projects.forEach(project => {
                    if (project.agencies && Array.isArray(project.agencies)) {
                        project.agencies.forEach((agency: any) => {
                            const countryName = agency.fields?.['Country Name'];
                            if (countryName && typeof countryName === 'string') {
                                allDonorsSet.add(countryName);
                            }
                        });
                    }
                });
            }
            
            const allDonors = Array.from(allDonorsSet);
            
            // Check donor filter
            const matchesDonors = selectedDonors.every(selectedDonor => 
                allDonors.includes(selectedDonor)
            );
            if (!matchesDonors) return false;

            // Check search filter
            if (appliedSearchQuery) {
                const query = appliedSearchQuery.toLowerCase().trim();
                const orgName = (org.name || org.fields?.['Organization Name'] || '').toLowerCase();
                const orgType = (org.fields?.['Org Type'] || '').toString().toLowerCase();
                const matchesSearch = orgName.includes(query) || orgType.includes(query);
                if (!matchesSearch) return false;
            }

            // Check investment type filter (project must match)
            if (investmentTypes.length > 0) {
                const hasMatchingProject = org.projects?.some(project => {
                    const projectTypes = project.fields?.['Investment Type(s)'] || [];
                    return Array.isArray(projectTypes) && projectTypes.some(type =>
                        investmentTypes.some(filterType =>
                            type.toLowerCase().includes(filterType.toLowerCase()) ||
                            filterType.toLowerCase().includes(type.toLowerCase())
                        )
                    );
                });
                if (!hasMatchingProject) return false;
            }

            // Check investment theme filter (project must match)
            if (investmentThemes.length > 0) {
                const hasMatchingProject = org.projects?.some(project => {
                    const projectThemes = project.fields?.['Investment Theme(s)'] || [];
                    return Array.isArray(projectThemes) && projectThemes.some(theme =>
                        investmentThemes.some(filterTheme =>
                            typeof theme === 'string' &&
                            theme.toLowerCase().trim() === filterTheme.toLowerCase().trim()
                        )
                    );
                });
                if (!hasMatchingProject) return false;
            }

            return true;
        });
    }, [organizationsData, selectedDonors, appliedSearchQuery, investmentTypes, investmentThemes]);

    // Get all unique projects from filtered organizations (deduplicated by ID)
    const filteredProjectsData = useMemo(() => {
        if (selectedDonors.length === 0) return [];

        const projectsMap = new Map<string, any>();
        filteredOrganizationsData.forEach(org => {
            if (org.projects && Array.isArray(org.projects)) {
                org.projects.forEach(project => {
                    projectsMap.set(project.id, project);
                });
            }
        });
        return Array.from(projectsMap.values());
    }, [filteredOrganizationsData, selectedDonors]);

    // Calculate co-financing matrix using ALL organizations (not just filtered ones)
    // Each cell shows co-financing between ONLY those two donors, regardless of other selections
    const coFinancingMatrix = useMemo(() => {
        const matrix: Record<string, Record<string, { projects: Set<string>; orgs: Set<string> }>> = {};

        // Initialize matrix
        selectedDonors.forEach(donor1 => {
            matrix[donor1] = {};
            selectedDonors.forEach(donor2 => {
                matrix[donor1][donor2] = { projects: new Set(), orgs: new Set() };
            });
        });

        // Populate matrix using ALL organizations but apply type, theme, and search filters
        organizationsData.forEach(org => {
            // Check search filter
            if (appliedSearchQuery) {
                const query = appliedSearchQuery.toLowerCase().trim();
                const orgName = (org.name || org.fields?.['Organization Name'] || '').toLowerCase();
                const orgType = (org.fields?.['Org Type'] || '').toString().toLowerCase();
                const matchesSearch = orgName.includes(query) || orgType.includes(query);
                if (!matchesSearch) return;
            }

            // Get all donor countries from BOTH org-level and project-level
            const allDonorsSet = new Set<string>();
            
            // Add org-level donors
            if (org.agencies && Array.isArray(org.agencies)) {
                org.agencies.forEach(agency => {
                    const countryName = agency.fields?.['Country Name'];
                    if (countryName && typeof countryName === 'string') {
                        allDonorsSet.add(countryName);
                    }
                });
            }
            
            // Add project-level donors
            if (org.projects && Array.isArray(org.projects)) {
                org.projects.forEach(project => {
                    if (project.agencies && Array.isArray(project.agencies)) {
                        project.agencies.forEach((agency: any) => {
                            const countryName = agency.fields?.['Country Name'];
                            if (countryName && typeof countryName === 'string') {
                                allDonorsSet.add(countryName);
                            }
                        });
                    }
                });
            }

            const allOrgDonors = Array.from(allDonorsSet);
            const orgName = org.name || org.fields?.['Organization Name'] || '';

            // For each pair of selected donors, check if this org has BOTH
            selectedDonors.forEach((donor1, i) => {
                selectedDonors.forEach((donor2, j) => {
                    if (i !== j) {
                        // Check if org has BOTH of these specific donors (at either level)
                        const hasBothDonors = allOrgDonors.includes(donor1) && allOrgDonors.includes(donor2);
                        
                        if (hasBothDonors) {
                            // Check if org has any projects that match type/theme filters
                            let hasMatchingProjects = true;
                            if ((investmentTypes.length > 0 || investmentThemes.length > 0) && org.projects && Array.isArray(org.projects)) {
                                hasMatchingProjects = org.projects.some(project => {
                                    // Check investment type filter
                                    if (investmentTypes.length > 0) {
                                        const projectTypes = project.fields?.['Investment Type(s)'] || [];
                                        const matchesType = Array.isArray(projectTypes) && projectTypes.some(type =>
                                            investmentTypes.some(filterType =>
                                                type.toLowerCase().includes(filterType.toLowerCase()) ||
                                                filterType.toLowerCase().includes(type.toLowerCase())
                                            )
                                        );
                                        if (!matchesType) return false;
                                    }

                                    // Check investment theme filter
                                    if (investmentThemes.length > 0) {
                                        const projectThemes = project.fields?.['Investment Theme(s)'] || [];
                                        const matchesTheme = Array.isArray(projectThemes) && projectThemes.some(theme =>
                                            investmentThemes.some(filterTheme =>
                                                typeof theme === 'string' &&
                                                theme.toLowerCase().trim() === filterTheme.toLowerCase().trim()
                                            )
                                        );
                                        if (!matchesTheme) return false;
                                    }

                                    return true;
                                });
                            }

                            // Only add org if it has matching projects (or no filters applied)
                            if (hasMatchingProjects) {
                                // Deduplicate org by name
                                const orgKey = `${org.id}-${orgName}`;
                                matrix[donor1][donor2].orgs.add(orgKey);
                            }
                            
                            // Add actual project IDs deduplicated by id-name combo
                            // But only if they match the type and theme filters
                            if (org.projects && Array.isArray(org.projects)) {
                                org.projects.forEach(project => {
                                    // Check investment type filter
                                    if (investmentTypes.length > 0) {
                                        const projectTypes = project.fields?.['Investment Type(s)'] || [];
                                        const matchesType = Array.isArray(projectTypes) && projectTypes.some(type =>
                                            investmentTypes.some(filterType =>
                                                type.toLowerCase().includes(filterType.toLowerCase()) ||
                                                filterType.toLowerCase().includes(type.toLowerCase())
                                            )
                                        );
                                        if (!matchesType) return;
                                    }

                                    // Check investment theme filter
                                    if (investmentThemes.length > 0) {
                                        const projectThemes = project.fields?.['Investment Theme(s)'] || [];
                                        const matchesTheme = Array.isArray(projectThemes) && projectThemes.some(theme =>
                                            investmentThemes.some(filterTheme =>
                                                typeof theme === 'string' &&
                                                theme.toLowerCase().trim() === filterTheme.toLowerCase().trim()
                                            )
                                        );
                                        if (!matchesTheme) return;
                                    }

                                    const projectName = project.fields?.['Project Name'] || project.name || '';
                                    const projectKey = `${project.id}-${projectName}`;
                                    matrix[donor1][donor2].projects.add(projectKey);
                                });
                            }
                        }
                    }
                });
            });
        });

        return matrix;
    }, [organizationsData, selectedDonors, appliedSearchQuery, investmentTypes, investmentThemes]);

    // Calculate max values for color scaling
    const maxValues = useMemo(() => {
        let maxProjects = 0;
        let maxOrgs = 0;

        selectedDonors.forEach(donor1 => {
            selectedDonors.forEach(donor2 => {
                if (donor1 !== donor2) {
                    const projectCount = coFinancingMatrix[donor1]?.[donor2]?.projects.size || 0;
                    const orgCount = coFinancingMatrix[donor1]?.[donor2]?.orgs.size || 0;
                    maxProjects = Math.max(maxProjects, projectCount);
                    maxOrgs = Math.max(maxOrgs, orgCount);
                }
            });
        });

        return { maxProjects, maxOrgs };
    }, [coFinancingMatrix, selectedDonors]);

    // Calculate total orgs and projects per donor (for diagonal cells context)
    const donorTotals = useMemo(() => {
        const totals: Record<string, { orgs: Set<string>; projects: Set<string> }> = {};

        selectedDonors.forEach(donor => {
            totals[donor] = { orgs: new Set(), projects: new Set() };
        });

        // Process all organizations
        organizationsData.forEach(org => {
            // Check search filter
            if (appliedSearchQuery) {
                const query = appliedSearchQuery.toLowerCase().trim();
                const orgName = (org.name || org.fields?.['Organization Name'] || '').toLowerCase();
                const orgType = (org.fields?.['Org Type'] || '').toString().toLowerCase();
                const matchesSearch = orgName.includes(query) || orgType.includes(query);
                if (!matchesSearch) return;
            }

            // Get all donor countries from BOTH org-level and project-level
            const allDonorsSet = new Set<string>();
            
            // Add org-level donors
            if (org.agencies && Array.isArray(org.agencies)) {
                org.agencies.forEach(agency => {
                    const countryName = agency.fields?.['Country Name'];
                    if (countryName && typeof countryName === 'string') {
                        allDonorsSet.add(countryName);
                    }
                });
            }
            
            // Add project-level donors
            if (org.projects && Array.isArray(org.projects)) {
                org.projects.forEach(project => {
                    if (project.agencies && Array.isArray(project.agencies)) {
                        project.agencies.forEach((agency: any) => {
                            const countryName = agency.fields?.['Country Name'];
                            if (countryName && typeof countryName === 'string') {
                                allDonorsSet.add(countryName);
                            }
                        });
                    }
                });
            }

            const allOrgDonors = Array.from(allDonorsSet);
            const orgName = org.name || org.fields?.['Organization Name'] || '';
            const orgKey = `${org.id}-${orgName}`;

            // For each selected donor, add this org if they fund it
            selectedDonors.forEach(donor => {
                if (allOrgDonors.includes(donor)) {
                    // Check if org has any projects that match type/theme filters
                    let hasMatchingProjects = true;
                    if ((investmentTypes.length > 0 || investmentThemes.length > 0) && org.projects && Array.isArray(org.projects)) {
                        hasMatchingProjects = org.projects.some(project => {
                            // Check investment type filter
                            if (investmentTypes.length > 0) {
                                const projectTypes = project.fields?.['Investment Type(s)'] || [];
                                const matchesType = Array.isArray(projectTypes) && projectTypes.some(type =>
                                    investmentTypes.some(filterType =>
                                        type.toLowerCase().includes(filterType.toLowerCase()) ||
                                        filterType.toLowerCase().includes(type.toLowerCase())
                                    )
                                );
                                if (!matchesType) return false;
                            }

                            // Check investment theme filter
                            if (investmentThemes.length > 0) {
                                const projectThemes = project.fields?.['Investment Theme(s)'] || [];
                                const matchesTheme = Array.isArray(projectThemes) && projectThemes.some(theme =>
                                    investmentThemes.some(filterTheme =>
                                        typeof theme === 'string' &&
                                        theme.toLowerCase().trim() === filterTheme.toLowerCase().trim()
                                    )
                                );
                                if (!matchesTheme) return false;
                            }

                            return true;
                        });
                    }

                    // Only add org if it has matching projects (or no filters applied)
                    if (hasMatchingProjects) {
                        totals[donor].orgs.add(orgKey);
                    }

                    // Add projects that match type/theme filters
                    if (org.projects && Array.isArray(org.projects)) {
                        org.projects.forEach(project => {
                            // Check investment type filter
                            if (investmentTypes.length > 0) {
                                const projectTypes = project.fields?.['Investment Type(s)'] || [];
                                const matchesType = Array.isArray(projectTypes) && projectTypes.some(type =>
                                    investmentTypes.some(filterType =>
                                        type.toLowerCase().includes(filterType.toLowerCase()) ||
                                        filterType.toLowerCase().includes(type.toLowerCase())
                                    )
                                );
                                if (!matchesType) return;
                            }

                            // Check investment theme filter
                            if (investmentThemes.length > 0) {
                                const projectThemes = project.fields?.['Investment Theme(s)'] || [];
                                const matchesTheme = Array.isArray(projectThemes) && projectThemes.some(theme =>
                                    investmentThemes.some(filterTheme =>
                                        typeof theme === 'string' &&
                                        theme.toLowerCase().trim() === filterTheme.toLowerCase().trim()
                                    )
                                );
                                if (!matchesTheme) return;
                            }

                            const projectName = project.fields?.['Project Name'] || project.name || '';
                            const projectKey = `${project.id}-${projectName}`;
                            totals[donor].projects.add(projectKey);
                        });
                    }
                }
            });
        });

        return totals;
    }, [organizationsData, selectedDonors, appliedSearchQuery, investmentTypes, investmentThemes]);

    // Calculate organization types chart data using filtered data
    const organizationTypesData = useMemo(() => {
        if (selectedDonors.length === 0 || !filteredOrganizationsData) return [];
        
        const typeCount: Record<string, number> = {};
        
        // Use the filtered organizations
        filteredOrganizationsData.forEach(org => {
            const orgType = org.fields?.['Org Type'] || 'Unknown';
            typeCount[orgType] = (typeCount[orgType] || 0) + 1;
        });

        console.log('Organization types data:', typeCount, 'Total orgs:', filteredOrganizationsData.length);
        
        return Object.entries(typeCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [filteredOrganizationsData, selectedDonors]);

    // Calculate organizations list with donor counts sorted by number of donors
    const organizationsWithDonorCounts = useMemo(() => {
        if (selectedDonors.length === 0) return [];

        const orgDonorMap: Record<string, { name: string; donors: Set<string>; id: string }> = {};

        // Get all organizations funded by at least one selected donor
        organizationsData.forEach(org => {
            // Check search filter
            if (appliedSearchQuery) {
                const query = appliedSearchQuery.toLowerCase().trim();
                const orgName = (org.name || org.fields?.['Organization Name'] || '').toLowerCase();
                const orgType = (org.fields?.['Org Type'] || '').toString().toLowerCase();
                const matchesSearch = orgName.includes(query) || orgType.includes(query);
                if (!matchesSearch) return;
            }

            // Get all donor countries from BOTH org-level and project-level
            const allDonorsSet = new Set<string>();
            
            // Add org-level donors
            if (org.agencies && Array.isArray(org.agencies)) {
                org.agencies.forEach(agency => {
                    const countryName = agency.fields?.['Country Name'];
                    if (countryName && typeof countryName === 'string' && selectedDonors.includes(countryName)) {
                        allDonorsSet.add(countryName);
                    }
                });
            }
            
            // Add project-level donors
            if (org.projects && Array.isArray(org.projects)) {
                org.projects.forEach(project => {
                    if (project.agencies && Array.isArray(project.agencies)) {
                        project.agencies.forEach((agency: any) => {
                            const countryName = agency.fields?.['Country Name'];
                            if (countryName && typeof countryName === 'string' && selectedDonors.includes(countryName)) {
                                allDonorsSet.add(countryName);
                            }
                        });
                    }
                });
            }

            const orgName = org.name || org.fields?.['Organization Name'] || '';
            
            // Only include if funded by at least one selected donor
            if (allDonorsSet.size > 0) {
                // Check if org has any projects that match type/theme filters
                let hasMatchingProjects = true;
                if ((investmentTypes.length > 0 || investmentThemes.length > 0) && org.projects && Array.isArray(org.projects)) {
                    hasMatchingProjects = org.projects.some(project => {
                        // Check investment type filter
                        if (investmentTypes.length > 0) {
                            const projectTypes = project.fields?.['Investment Type(s)'] || [];
                            const matchesType = Array.isArray(projectTypes) && projectTypes.some(type =>
                                investmentTypes.some(filterType =>
                                    type.toLowerCase().includes(filterType.toLowerCase()) ||
                                    filterType.toLowerCase().includes(type.toLowerCase())
                                )
                            );
                            if (!matchesType) return false;
                        }

                        // Check investment theme filter
                        if (investmentThemes.length > 0) {
                            const projectThemes = project.fields?.['Investment Theme(s)'] || [];
                            const matchesTheme = Array.isArray(projectThemes) && projectThemes.some(theme =>
                                investmentThemes.some(filterTheme =>
                                    typeof theme === 'string' &&
                                    theme.toLowerCase().trim() === filterTheme.toLowerCase().trim()
                                )
                            );
                            if (!matchesTheme) return false;
                        }

                        return true;
                    });
                }

                // Only add org if it has matching projects (or no filters applied)
                if (hasMatchingProjects) {
                    const orgKey = `${org.id}-${orgName}`;
                    orgDonorMap[orgKey] = {
                        name: orgName,
                        donors: allDonorsSet,
                        id: org.id
                    };
                }
            }
        });

        // Convert to array and sort by donor count (descending), then alphabetically
        return Object.values(orgDonorMap)
            .sort((a, b) => {
                if (b.donors.size !== a.donors.size) {
                    return b.donors.size - a.donors.size;
                }
                return a.name.localeCompare(b.name);
            });
    }, [organizationsData, selectedDonors, appliedSearchQuery, investmentTypes, investmentThemes]);

    // Calculate project types chart data using filtered data
    const projectTypesData = useMemo(() => {
        if (selectedDonors.length === 0 || !filteredProjectsData) return [];
        
        const typeCount: Record<string, number> = {};
        
        // Use the filtered projects
        filteredProjectsData.forEach(project => {
            const investmentTypes = project.fields?.['Investment Type(s)'];
            if (Array.isArray(investmentTypes)) {
                investmentTypes.forEach(type => {
                    typeCount[type] = (typeCount[type] || 0) + 1;
                });
            }
        });

        console.log('Project types data:', typeCount, 'Total projects:', filteredProjectsData.length);
        
        return Object.entries(typeCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [filteredProjectsData, selectedDonors]);

    // Calculate per-donor investment focus (projects per investment type)
    const donorProfiles = useMemo(() => {
        if (selectedDonors.length === 0) return [];

        // Helper to check if a project matches current type/theme/search filters
        const projectMatchesFilters = (project: any) => {
            // Search filter applies to project name or organization handled elsewhere; keep simple: allow all
            // Investment type filter - if set, only count projects matching selected investmentTypes
            if (investmentTypes.length > 0) {
                const projectTypes = project.fields?.['Investment Type(s)'] || [];
                if (!Array.isArray(projectTypes) || !projectTypes.some((pt: string) =>
                    investmentTypes.some(it => it.toLowerCase().trim() === (pt || '').toLowerCase().trim())
                )) {
                    return false;
                }
            }

            // Investment themes filter
            if (investmentThemes.length > 0) {
                const projectThemes = project.fields?.['Investment Theme(s)'] || [];
                if (!Array.isArray(projectThemes) || !projectThemes.some((th: string) =>
                    investmentThemes.some(it => it.toLowerCase().trim() === (th || '').toLowerCase().trim())
                )) {
                    return false;
                }
            }

            return true;
        };

        return selectedDonors.map(donor => {
            // Initialize counts for all known investment types
            const counts: Record<string, number> = {};
            allKnownInvestmentTypes.forEach(t => counts[t] = 0);

            // Iterate all organizations and accumulate projects for which this donor appears
            organizationsData.forEach(org => {
                // Determine if donor funds this org (org-level) or its projects (project-level)
                const orgDonors = new Set<string>();
                if (org.agencies && Array.isArray(org.agencies)) {
                    org.agencies.forEach((a: any) => {
                        const countryName = a.fields?.['Country Name'];
                        if (countryName) orgDonors.add(countryName);
                    });
                }

                // For each project, check project-level agencies
                if (org.projects && Array.isArray(org.projects)) {
                    org.projects.forEach(project => {
                        const projectDonors = new Set<string>(orgDonors);
                        if (project.agencies && Array.isArray(project.agencies)) {
                            project.agencies.forEach((pa: any) => {
                                const countryName = pa.fields?.['Country Name'];
                                if (countryName) projectDonors.add(countryName);
                            });
                        }

                        if (projectDonors.has(donor) && projectMatchesFilters(project)) {
                            const projectTypes = project.fields?.['Investment Type(s)'] || [];
                            if (Array.isArray(projectTypes) && projectTypes.length > 0) {
                                projectTypes.forEach((pt: string) => {
                                    const match = allKnownInvestmentTypes.find(k =>
                                        k.toLowerCase().trim() === (pt || '').toLowerCase().trim()
                                    );
                                    if (match) counts[match] = (counts[match] || 0) + 1;
                                });
                            } else {
                                // If no explicit project types, increment 'Other' bucket if exists
                                if (counts['Other'] !== undefined) counts['Other']++;
                            }
                        }
                    });
                }
            });

            const data = allKnownInvestmentTypes.map(t => ({ type: t, value: counts[t] || 0 }));
            return { donor, data };
        });
    }, [selectedDonors, organizationsData, investmentTypes, investmentThemes, allKnownInvestmentTypes]);

    // Calculate donor co-financing chart data using coFinancingMatrix (ensures same deduplication)
    const donorCoFinancingData = useMemo(() => {
        const pairCounts: Array<{ name: string; value: number }> = [];

        // Extract pair data from the matrix
        selectedDonors.forEach((donor1, i) => {
            selectedDonors.forEach((donor2, j) => {
                if (i < j) { // Only count each pair once
                    const orgCount = coFinancingMatrix[donor1]?.[donor2]?.orgs.size || 0;
                    
                    if (orgCount > 0) {
                        pairCounts.push({
                            name: `${donor1} & ${donor2}`,
                            value: orgCount
                        });
                    }
                }
            });
        });

        return pairCounts
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [coFinancingMatrix, selectedDonors]);

    // Calculate analytics stats
    const analyticsStats = useMemo(() => {
        if (selectedDonors.length === 0) {
            return {
                totalFundingStreams: 0,
                avgDonorsPerOrg: 0,
                avgFundingOverlap: 0,
                sharedFundingTargets: 0
            };
        }

        // 1. Total funding streams = sum of direct funding from each selected country individually
        // For each selected country: count orgs it funds directly + count projects it funds directly
        let totalFundingStreams = 0;

        selectedDonors.forEach(country => {
            // Count organizations directly funded by this country
            const orgsDirectlyFunded = new Set<string>();
            organizationsData.forEach(org => {
                // Check if this country is an org-level donor
                const hasCountryAsOrgDonor = org.agencies?.some(agency => 
                    agency.fields?.['Country Name'] === country
                );
                
                if (hasCountryAsOrgDonor) {
                    // Check if org has matching projects (apply filters)
                    let orgHasMatchingProject = true;
                    
                    if (investmentTypes.length > 0 || investmentThemes.length > 0 || appliedSearchQuery) {
                        // Check org-level filters
                        if (appliedSearchQuery) {
                            const query = appliedSearchQuery.toLowerCase().trim();
                            const orgName = (org.name || org.fields?.['Organization Name'] || '').toLowerCase();
                            const orgType = (org.fields?.['Org Type'] || '').toString().toLowerCase();
                            if (!orgName.includes(query) && !orgType.includes(query)) {
                                orgHasMatchingProject = false;
                            }
                        }
                        
                        // Check if org has matching projects
                        if (orgHasMatchingProject && (investmentTypes.length > 0 || investmentThemes.length > 0)) {
                            const hasMatchingProject = org.projects?.some(project => {
                                // Check investment type filter
                                if (investmentTypes.length > 0) {
                                    const projectTypes = project.fields?.['Investment Type(s)'] || [];
                                    const matchesType = Array.isArray(projectTypes) && projectTypes.some(type =>
                                        investmentTypes.some(filterType =>
                                            type.toLowerCase().includes(filterType.toLowerCase()) ||
                                            filterType.toLowerCase().includes(type.toLowerCase())
                                        )
                                    );
                                    if (!matchesType) return false;
                                }
                                
                                // Check investment theme filter
                                if (investmentThemes.length > 0) {
                                    const projectThemes = project.fields?.['Investment Theme(s)'] || [];
                                    const matchesTheme = Array.isArray(projectThemes) && projectThemes.some(theme =>
                                        investmentThemes.some(filterTheme =>
                                            typeof theme === 'string' &&
                                            theme.toLowerCase().trim() === filterTheme.toLowerCase().trim()
                                        )
                                    );
                                    if (!matchesTheme) return false;
                                }
                                
                                return true;
                            });
                            
                            orgHasMatchingProject = hasMatchingProject || false;
                        }
                    }
                    
                    if (orgHasMatchingProject) {
                        const orgKey = `${org.id}-${org.name || org.fields?.['Organization Name'] || ''}`;
                        orgsDirectlyFunded.add(orgKey);
                    }
                }
            });
            
            totalFundingStreams += orgsDirectlyFunded.size;
            
            // Count projects directly funded by this country
            const projectsDirectlyFunded = new Set<string>();
            organizationsData.forEach(org => {
                if (org.projects && Array.isArray(org.projects)) {
                    org.projects.forEach(project => {
                        // Check if this country is a project-level donor
                        const hasCountryAsProjectDonor = project.agencies?.some((agency: any) =>
                            agency.fields?.['Country Name'] === country
                        );
                        
                        if (hasCountryAsProjectDonor) {
                            // Apply filters to project
                            let projectMatches = true;
                            
                            // Check search filter
                            if (appliedSearchQuery) {
                                const query = appliedSearchQuery.toLowerCase().trim();
                                const projectName = (project.fields?.['Project Name'] || project.name || '').toLowerCase();
                                const orgName = (org.name || org.fields?.['Organization Name'] || '').toLowerCase();
                                if (!projectName.includes(query) && !orgName.includes(query)) {
                                    projectMatches = false;
                                }
                            }
                            
                            // Check investment type filter
                            if (projectMatches && investmentTypes.length > 0) {
                                const projectTypes = project.fields?.['Investment Type(s)'] || [];
                                const matchesType = Array.isArray(projectTypes) && projectTypes.some(type =>
                                    investmentTypes.some(filterType =>
                                        type.toLowerCase().includes(filterType.toLowerCase()) ||
                                        filterType.toLowerCase().includes(type.toLowerCase())
                                    )
                                );
                                if (!matchesType) projectMatches = false;
                            }
                            
                            // Check investment theme filter
                            if (projectMatches && investmentThemes.length > 0) {
                                const projectThemes = project.fields?.['Investment Theme(s)'] || [];
                                const matchesTheme = Array.isArray(projectThemes) && projectThemes.some(theme =>
                                    investmentThemes.some(filterTheme =>
                                        typeof theme === 'string' &&
                                        theme.toLowerCase().trim() === filterTheme.toLowerCase().trim()
                                    )
                                );
                                if (!matchesTheme) projectMatches = false;
                            }
                            
                            if (projectMatches) {
                                const projectKey = `${project.id}-${project.fields?.['Project Name'] || project.name || ''}`;
                                projectsDirectlyFunded.add(projectKey);
                            }
                        }
                    });
                }
            });
            
            totalFundingStreams += projectsDirectlyFunded.size;
        });

        // 2. Average number of donors per organization
        // Find all organizations funded by at least one selected donor, then count all their donors
        const orgsWithTotalDonorCounts: Array<{ orgId: string; totalDonors: Set<string> }> = [];
        
        organizationsData.forEach(org => {
            const selectedDonorsFunding = new Set<string>();
            const allDonors = new Set<string>();
            
            // Collect all donors and track if any are selected
            if (org.agencies && Array.isArray(org.agencies)) {
                org.agencies.forEach(agency => {
                    const countryName = agency.fields?.['Country Name'];
                    if (countryName) {
                        allDonors.add(countryName);
                        if (selectedDonors.includes(countryName)) {
                            selectedDonorsFunding.add(countryName);
                        }
                    }
                });
            }
            
            if (org.projects && Array.isArray(org.projects)) {
                org.projects.forEach(project => {
                    if (project.agencies && Array.isArray(project.agencies)) {
                        project.agencies.forEach((agency: any) => {
                            const countryName = agency.fields?.['Country Name'];
                            if (countryName) {
                                allDonors.add(countryName);
                                if (selectedDonors.includes(countryName)) {
                                    selectedDonorsFunding.add(countryName);
                                }
                            }
                        });
                    }
                });
            }
            
            // Only include orgs that are funded by at least one selected donor
            // AND passes the filters
            if (selectedDonorsFunding.size > 0) {
                let passesFilters = true;
                
                // Check search filter
                if (appliedSearchQuery) {
                    const query = appliedSearchQuery.toLowerCase().trim();
                    const orgName = (org.name || org.fields?.['Organization Name'] || '').toLowerCase();
                    const orgType = (org.fields?.['Org Type'] || '').toString().toLowerCase();
                    if (!orgName.includes(query) && !orgType.includes(query)) {
                        passesFilters = false;
                    }
                }
                
                // Check if org has matching projects based on type/theme filters
                if (passesFilters && (investmentTypes.length > 0 || investmentThemes.length > 0)) {
                    const hasMatchingProject = org.projects?.some(project => {
                        // Check investment type filter
                        if (investmentTypes.length > 0) {
                            const projectTypes = project.fields?.['Investment Type(s)'] || [];
                            const matchesType = Array.isArray(projectTypes) && projectTypes.some(type =>
                                investmentTypes.some(filterType =>
                                    type.toLowerCase().includes(filterType.toLowerCase()) ||
                                    filterType.toLowerCase().includes(type.toLowerCase())
                                )
                            );
                            if (!matchesType) return false;
                        }
                        
                        // Check investment theme filter
                        if (investmentThemes.length > 0) {
                            const projectThemes = project.fields?.['Investment Theme(s)'] || [];
                            const matchesTheme = Array.isArray(projectThemes) && projectThemes.some(theme =>
                                investmentThemes.some(filterTheme =>
                                    typeof theme === 'string' &&
                                    theme.toLowerCase().trim() === filterTheme.toLowerCase().trim()
                                )
                            );
                            if (!matchesTheme) return false;
                        }
                        
                        return true;
                    });
                    
                    if (!hasMatchingProject) {
                        passesFilters = false;
                    }
                }
                
                if (passesFilters) {
                    orgsWithTotalDonorCounts.push({
                        orgId: org.id,
                        totalDonors: allDonors
                    });
                }
            }
        });
        
        const avgDonorsPerOrg = orgsWithTotalDonorCounts.length > 0
            ? Number((orgsWithTotalDonorCounts.reduce((sum, org) => sum + org.totalDonors.size, 0) / orgsWithTotalDonorCounts.length).toFixed(1))
            : 0;

        // 3. Funding overlap (organizations only)
        // Create set of all orgs funded by at least one selected donor
        const fundingTargets = new Map<string, Set<string>>(); // target -> set of donors

        organizationsData.forEach(org => {
            const orgName = org.name || org.fields?.['Organization Name'] || '';
            const orgKey = `org-${org.id}-${orgName}`;
            
            // Check if org passes filters
            let orgPassesFilters = true;
            if (appliedSearchQuery) {
                const query = appliedSearchQuery.toLowerCase().trim();
                const orgNameLower = orgName.toLowerCase();
                const orgType = (org.fields?.['Org Type'] || '').toString().toLowerCase();
                if (!orgNameLower.includes(query) && !orgType.includes(query)) {
                    orgPassesFilters = false;
                }
            }
            
            // Check if org has matching projects based on type/theme filters
            if (orgPassesFilters && (investmentTypes.length > 0 || investmentThemes.length > 0)) {
                const hasMatchingProject = org.projects?.some(project => {
                    if (investmentTypes.length > 0) {
                        const projectTypes = project.fields?.['Investment Type(s)'] || [];
                        const matchesType = Array.isArray(projectTypes) && projectTypes.some(type =>
                            investmentTypes.some(filterType =>
                                type.toLowerCase().includes(filterType.toLowerCase()) ||
                                filterType.toLowerCase().includes(type.toLowerCase())
                            )
                        );
                        if (!matchesType) return false;
                    }
                    
                    if (investmentThemes.length > 0) {
                        const projectThemes = project.fields?.['Investment Theme(s)'] || [];
                        const matchesTheme = Array.isArray(projectThemes) && projectThemes.some(theme =>
                            investmentThemes.some(filterTheme =>
                                typeof theme === 'string' &&
                                theme.toLowerCase().trim() === filterTheme.toLowerCase().trim()
                            )
                        );
                        if (!matchesTheme) return false;
                    }
                    
                    return true;
                });
                
                orgPassesFilters = hasMatchingProject || false;
            }
            
            // Track which selected donors fund this org (organization-level only)
            if (orgPassesFilters) {
                const orgDonors = new Set<string>();
                
                // Check org-level agencies
                if (org.agencies && Array.isArray(org.agencies)) {
                    org.agencies.forEach(agency => {
                        const countryName = agency.fields?.['Country Name'];
                        if (countryName && selectedDonors.includes(countryName)) {
                            orgDonors.add(countryName);
                        }
                    });
                }
                
                // Check project-level agencies for this organization
                if (org.projects && Array.isArray(org.projects)) {
                    org.projects.forEach(project => {
                        if (project.agencies && Array.isArray(project.agencies)) {
                            project.agencies.forEach((agency: any) => {
                                const countryName = agency.fields?.['Country Name'];
                                if (countryName && selectedDonors.includes(countryName)) {
                                    orgDonors.add(countryName);
                                }
                            });
                        }
                    });
                }
                
                // Only add org if it has at least one selected donor
                if (orgDonors.size > 0) {
                    fundingTargets.set(orgKey, orgDonors);
                }
            }
        });

        // Count orgs funded by exactly one donor
        let uniqueFundingTargets = 0;
        fundingTargets.forEach((donors) => {
            if (donors.size === 1) {
                uniqueFundingTargets++;
            }
        });

        const totalTargets = fundingTargets.size;
        const sharedFundingTargets = totalTargets - uniqueFundingTargets;
        const avgFundingOverlap = totalTargets > 0 
            ? 100 - Math.round((uniqueFundingTargets / totalTargets) * 100)
            : 0;

        return {
            totalFundingStreams,
            avgDonorsPerOrg,
            sharedFundingTargets,
            avgFundingOverlap,
            fundingOverlapDetails: {
                totalTargets,
                uniqueFundingTargets,
                sharedFundingTargets
            }
        };
    }, [filteredOrganizationsData, selectedDonors, investmentTypes, investmentThemes, appliedSearchQuery, organizationsData]);

    // Calculate investment focus by donor using computed donorProfiles (normalize per-donor)
    const donorInvestmentFocus = useMemo(() => {
        if (selectedDonors.length === 0) return [];

        const canonicalTypes = Object.values(labels.investmentTypes);

        // Build a map donor -> type -> count from donorProfiles
        const countsByDonor: Record<string, Record<string, number>> = {};
        donorProfiles.forEach((p: any) => {
            const map: Record<string, number> = {};
            p.data.forEach((d: any) => {
                map[d.type] = d.value || 0;
            });
            countsByDonor[p.donor] = map;
        });

        // Ensure zeros for missing types
        selectedDonors.forEach(donor => {
            if (!countsByDonor[donor]) countsByDonor[donor] = {};
            canonicalTypes.forEach(t => {
                if (!countsByDonor[donor][t]) countsByDonor[donor][t] = 0;
            });
        });

        // Compute max per donor to normalize
        const donorMax: Record<string, number> = {};
        selectedDonors.forEach(donor => {
            const vals = Object.values(countsByDonor[donor] || {});
            donorMax[donor] = vals.length > 0 ? Math.max(...vals) : 0;
        });

        // Build radar data: one entry per type with a value per donor (0-100 normalized)
        const radarData = canonicalTypes.map(type => {
            const entry: any = { name: type };
            selectedDonors.forEach(donor => {
                const count = countsByDonor[donor][type] || 0;
                const max = donorMax[donor] || 0;
                entry[donor] = max > 0 ? Math.round((count / max) * 100) : 0;
            });
            return entry;
        });

        return radarData;
    }, [selectedDonors, donorProfiles]);

    const handleCellClick = (donor1: string, donor2: string) => {
        // Navigate to dashboard with both donors as filters
        const donorSlugs = [toUrlSlug(donor1), toUrlSlug(donor2)].join(',');
        router.push(`/?d=${donorSlugs}`);
    };

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setShareSuccess(true);
            setTimeout(() => {
                setShareSuccess(false);
            }, 2000);
        });
    };

    // Get General Contributions state
    let showGeneralContributions = true;
    try {
        const genContContext = useGeneralContributions();
        showGeneralContributions = genContContext.showGeneralContributions;
    } catch (e) {
        // GeneralContributionsProvider not available
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                logoutButton={logoutButton}
                onShare={handleShare}
                shareSuccess={shareSuccess}
            />
            
            {/* Main Content */}
            <div className="max-w-[82rem] mx-auto px-4 sm:px-6 lg:px-8 py-0 sm:py-0 pt-20 sm:pt-24">
                <div className="space-y-4 sm:space-y-4">

                    {/* Hero Section - Title Box */}
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[var(--brand-bg-lighter)] to-[var(--brand-bg-light)] p-6 sm:p-8 border-none">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <BarChart3 className="w-8 h-8" style={{ color: 'var(--brand-primary)' }} />
                                <h1 className="text-3xl sm:text-4xl font-bold font-qanelas-subtitle" style={{ color: 'black' }}>
                                    Analytics
                                </h1>
                            </div>
                            <p className="text-base sm:text-lg text-slate-700 max-w-3xl leading-relaxed">
                                Explore co-financing relationships and funding patterns across the crisis data ecosystem
                            </p>
                            {/* Warning note if General Contributions enabled */}
                            {showGeneralContributions && (
                                <div className="mt-4 p-4 bg-white/60 backdrop-blur-sm border border-amber-200 rounded-lg flex gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                    <p className="text-sm text-amber-900">
                                        <span className="font-semibold">Note:</span> General Contributions beyond the highest voluntary donors are excluded from the analytics page. Therefore, numbers might deviate from the dashboard page if General Contributions are turned on.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    {selectedDonors.length > 0 && (
                        <>
                        
                            
                            {/* Desktop Grid */}
                            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-[var(--spacing-section)]">
                                <StatCard
                                    icon={<GitBranch style={{ color: 'var(--brand-primary)' }} />}
                                    title="Bilateral Funding"
                                    value={analyticsStats.totalFundingStreams}
                                    label="direct grants"
                                    colorScheme="amber"
                                    tooltip="Total number of connections from selected donors to organizations and projects. Each connection represents a direct funding relationship."
                                />
                                
                                <StatCard
                                    icon={<Users style={{ color: 'var(--brand-primary)' }} />}
                                    title="Donors per Org"
                                    value={analyticsStats.avgDonorsPerOrg}
                                    label="donors"
                                    colorScheme="amber"
                                    tooltip="Average number of selected donors funding each organization (counting both organization-level and project-level funding)."
                                />

                                <StatCard
                                    icon={<Building2 style={{ color: 'var(--brand-primary)' }} />}
                                    title="Co-Funded Orgs"
                                    value={analyticsStats.sharedFundingTargets}
                                    label="orgs"
                                    colorScheme="amber"
                                    tooltip="Absolute number of organizations funded by at least 2 of the selected donors."
                                />

                                <StatCard
                                    icon={<Target style={{ color: 'var(--brand-primary)' }} />}
                                    title="Funding Overlap"
                                    value={`${analyticsStats.avgFundingOverlap}%`}
                                    label="shared"
                                    colorScheme="amber"
                                    tooltip={
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">Percentage of targets funded by exactly one selected donor:</p>
                                            <table className="w-full text-sm border-collapse">
                                                <tbody>
                                                    <tr>
                                                        <td className="text-left pr-3 py-1">Total organizations funded:</td>
                                                        <td className="text-right font-semibold">{analyticsStats.fundingOverlapDetails?.totalTargets || 0}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="text-left pr-3 py-1">Funded by exactly 1 donor:</td>
                                                        <td className="text-right font-semibold">{analyticsStats.fundingOverlapDetails?.uniqueFundingTargets || 0}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="text-left pr-3 py-1">Funded by 2+ donors:</td>
                                                        <td className="text-right font-semibold">{analyticsStats.fundingOverlapDetails?.sharedFundingTargets || 0}</td>
                                                    </tr>
                                                    <tr className="border-t border-gray-300 mt-1 pt-1">
                                                        <td className="text-left pr-3 py-1 font-medium">Calculation:</td>
                                                        <td className="text-right text-xs">({analyticsStats.fundingOverlapDetails?.sharedFundingTargets || 0} ÷ {analyticsStats.fundingOverlapDetails?.totalTargets || 0}) × 100</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    }
                                />
                            </div>
                        </>
                    )}

                    {/* Per-donor profiles removed — use `donorInvestmentFocus` chart below */}

                    {/* Filter Bar */}
                    <Card className="!border-0 bg-white">
                        <CardHeader className="pb-0 h-0">
                            <CardTitle className="flex flex-row items-center justify-between w-full mb-0">
                                <SectionHeader icon={<Filter style={{ color: 'var(--brand-primary)' }} />} title="SUBSET FILTER" />
                            </CardTitle>
                        </CardHeader>

                    
                        <CardContent className="p-4 mt-0 mb-0">
                            
                            <FilterBar
                                searchQuery={searchQuery}
                                appliedSearchQuery={appliedSearchQuery}
                                onSearchChange={setSearchQuery}
                                onSearchSubmit={() => setAppliedSearchQuery(searchQuery)}
                                combinedDonors={selectedDonors}
                                availableDonorCountries={availableDonorCountries}
                                onDonorsChange={setSelectedDonors}
                                investmentTypes={investmentTypes}
                                allKnownInvestmentTypes={allKnownInvestmentTypes}
                                onTypesChange={setInvestmentTypes}
                                investmentThemes={investmentThemes}
                                allKnownInvestmentThemes={allKnownInvestmentThemes}
                                onThemesChange={setInvestmentThemes}
                                onResetFilters={() => {
                                    setSelectedDonors([]);
                                    setInvestmentTypes([]);
                                    setInvestmentThemes([]);
                                    setSearchQuery('');
                                    setAppliedSearchQuery('');
                                }}
                            />
                        </CardContent>
                    </Card>
                    
                    {/* Co-Financing Matrix with View Toggle */}
                    { /* Hide entire card when no donors selected */ }
                    <Card className={`${selectedDonors.length === 0 ? 'hidden' : ''} !border-0 bg-white`}>
                        <CardHeader className="pb-0">
                            <div className="flex items-center justify-between gap-4">
                                <CardTitle>
                                    <SectionHeader icon={<Network style={{ color: 'var(--brand-primary)' }} />} title="Which donors are collaborating on Data Investment?" />
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                {MATRIX_MODES.map(({ value, label, Icon }) => {
                                    const active = matrixViewMode === value;

                                    return (
                                    <Button
                                        key={value}
                                        onClick={() => setMatrixViewMode(value)}
                                        className={`${MATRIX_BUTTON_CLASS} ${
                                        active
                                            ? 'bg-slate-200 text-slate-700'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                    >
                                        <Icon className="h-3 w-3" />
                                        {label}
                                    </Button>
                                    );
                                })}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            {matrixViewMode === 'unified' ? (
                                // Unified Matrix View
                                <>
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="flex items-center gap-3 ml-auto">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-4 h-4 bg-amber-300 border border-slate-300 rounded"></div>
                                                <span className="text-xs text-slate-600">Organizations</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-4 h-4 bg-indigo-300 border border-slate-300 rounded"></div>
                                                <span className="text-xs text-slate-600">Projects</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="w-full overflow-x-hidden">
                                        <table className="w-full">
                                            <thead>
                                                <tr>
                                                    <th className="p-2 text-left text-sm font-semibold text-slate-600 border-b-2 border-slate-200 min-w-[90px]">
                                                        Donor
                                                    </th>
                                                    {selectedDonors.map(donor => (
                                                        <th 
                                                            key={donor} 
                                                            className="p-2 text-left text-sm font-semibold text-slate-600 border-b-2 border-slate-200 w-16"
                                                            style={{ writingMode: 'vertical-rl', transform: 'rotate(225deg)' }}
                                                        >
                                                            {donor}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedDonors.map((donor1, i) => (
                                                    <tr key={donor1}>
                                                        <td className="p-2 text-sm font-semibold text-slate-600 border-r-2 border-slate-200">
                                                            {donor1}
                                                        </td>
                                                        {selectedDonors.map((donor2, j) => {
                                                            const isDiagonal = donor1 === donor2;
                                                            const isAboveDiagonal = i < j;
                                                            
                                                            const projectCount = coFinancingMatrix[donor1]?.[donor2]?.projects.size || 0;
                                                            const orgCount = coFinancingMatrix[donor1]?.[donor2]?.orgs.size || 0;
                                                            
                                                            const count = isAboveDiagonal ? projectCount : orgCount;
                                                            
                                                            const showDiagonalContext = isDiagonal && hoveredCell && (hoveredCell.donor1 === donor1 || hoveredCell.donor2 === donor1);
                                                            let diagonalCount = 0;
                                                            let diagonalColorClass = 'bg-slate-200 text-slate-400';
                                                            let diagonalTooltipText = '';
                                                            
                                                            if (showDiagonalContext) {
                                                                const hoveredOrgIndex = selectedDonors.indexOf(hoveredCell.donor1);
                                                                const hoveredColIndex = selectedDonors.indexOf(hoveredCell.donor2);
                                                                const isHoveredCellProject = hoveredOrgIndex < hoveredColIndex;
                                                                
                                                                if (isHoveredCellProject) {
                                                                    diagonalCount = donorTotals[donor1]?.projects.size || 0;
                                                                    diagonalTooltipText = `Total projects funded by ${donor1}`;
                                                                    diagonalColorClass = `${getProjectColorIntensity(diagonalCount, maxValues.maxProjects)} ${diagonalCount > 0 ? 'text-slate-800' : 'text-slate-400'}`;
                                                                } else {
                                                                    diagonalCount = donorTotals[donor1]?.orgs.size || 0;
                                                                    diagonalTooltipText = `Total organizations funded by ${donor1}`;
                                                                    diagonalColorClass = `${getOrgColorIntensity(diagonalCount, maxValues.maxOrgs)} ${diagonalCount > 0 ? 'text-slate-800' : 'text-slate-400'}`;
                                                                }
                                                            }
                                                            
                                                            const colorClass = isDiagonal && !showDiagonalContext
                                                                ? 'bg-slate-200 text-slate-400'
                                                                : isDiagonal && showDiagonalContext
                                                                    ? diagonalColorClass
                                                                    : isAboveDiagonal
                                                                        ? `${getProjectColorIntensity(projectCount, maxValues.maxProjects)} ${projectCount > 0 ? 'text-slate-800' : 'text-slate-400'}`
                                                                        : `${getOrgColorIntensity(orgCount, maxValues.maxOrgs)} ${orgCount > 0 ? 'text-slate-800' : 'text-slate-400'}`;
                                                            

                                                            const tooltipText = isDiagonal && showDiagonalContext
                                                                ? diagonalTooltipText
                                                                : isDiagonal
                                                                    ? null
                                                                    : isAboveDiagonal
                                                                        ? `${donor1} and ${donor2} are co-financing ${projectCount} project${projectCount !== 1 ? 's' : ''}`
                                                                        : `${donor1} and ${donor2} are co-financing ${orgCount} organization${orgCount !== 1 ? 's' : ''}`;
                                                            

                                                            const cellContent = (
                                                                <td 
                                                                    key={donor2}
                                                                    onMouseEnter={() => !isDiagonal && setHoveredCell({ donor1, donor2 })}
                                                                    onMouseLeave={() => setHoveredCell(null)}
                                                                    onClick={() => !isDiagonal && count > 0 && handleCellClick(donor1, donor2)}
                                                                    className={`p-3 text-center text-sm font-semibold border border-slate-200 transition-all ${colorClass} ${!isDiagonal && count > 0 ? 'cursor-pointer hover:opacity-75' : ''}`}
                                                                >
                                                                    {isDiagonal && showDiagonalContext ? diagonalCount : isDiagonal ? '—' : count}
                                                                </td>
                                                            );

                                                            if (!tooltipText) return cellContent;

                                                            return (
                                                                <TooltipProvider key={donor2} delayDuration={0}>
                                                                    <TooltipUI>
                                                                        <TooltipTrigger asChild>
                                                                            {cellContent}
                                                                        </TooltipTrigger>
                                                                        <TooltipContent
                                                                            side="bottom"
                                                                            align="center"
                                                                            className="bg-white text-slate-800 text-sm rounded-lg border border-slate-200 px-3 py-2"
                                                                            sideOffset={5}
                                                                            avoidCollisions={true}
                                                                            style={{ ...STYLES.chartTooltip }}
                                                                        >
                                                                            {tooltipText}
                                                                        </TooltipContent>
                                                                    </TooltipUI>
                                                                </TooltipProvider>
                                                            );
                                                        })}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            ) : (
                                // Split Matrices View (Organizations and Projects)
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Organizations Matrix */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <div className="w-4 h-4 bg-amber-300 border border-slate-300 rounded"></div>
                                            Organizations
                                        </h3>
                                        <div className="w-full overflow-x-hidden">
                                            <table className="w-full">
                                                <thead>
                                                    <tr>
                                                        <th className="p-2 text-left text-sm font-semibold text-slate-600 border-b-2 border-slate-200 min-w-[90px]">
                                                            Donor
                                                        </th>
                                                        {selectedDonors.map(donor => (
                                                            <th 
                                                                key={donor} 
                                                                className="p-2 text-left text-sm font-semibold text-slate-600 border-b-2 border-slate-200 w-16"
                                                                style={{ writingMode: 'vertical-rl', transform: 'rotate(225deg)' }}
                                                            >
                                                                {donor}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedDonors.map((donor1, i) => (
                                                        <tr key={donor1}>
                                                            <td className="p-2 text-sm font-semibold text-slate-600 border-r-2 border-slate-200">
                                                                {donor1}
                                                            </td>
                                                            {selectedDonors.map((donor2, j) => {
                                                                const isDiagonal = donor1 === donor2;
                                                                const orgCount = coFinancingMatrix[donor1]?.[donor2]?.orgs.size || 0;
                                                                const colorClass = isDiagonal
                                                                    ? 'bg-slate-200 text-slate-400'
                                                                    : `${getOrgColorIntensity(orgCount, maxValues.maxOrgs)} ${orgCount > 0 ? 'text-slate-800' : 'text-slate-400'}`;
                                                                
                                                                const tooltipText = !isDiagonal && orgCount > 0
                                                                    ? `${donor1} and ${donor2} are co-financing ${orgCount} organization${orgCount !== 1 ? 's' : ''}`
                                                                    : null;
                                                                
                                                                const cellContent = (
                                                                    <td 
                                                                        key={donor2}
                                                                        className={`p-3 text-center text-sm font-semibold border border-slate-200 transition-all ${colorClass} ${!isDiagonal && orgCount > 0 ? 'cursor-pointer hover:opacity-75' : ''}`}
                                                                        onClick={() => !isDiagonal && orgCount > 0 && handleCellClick(donor1, donor2)}
                                                                    >
                                                                        {isDiagonal ? '—' : orgCount}
                                                                    </td>
                                                                );

                                                                if (!tooltipText) return cellContent;

                                                                return (
                                                                    <TooltipProvider key={donor2} delayDuration={0}>
                                                                        <TooltipUI>
                                                                            <TooltipTrigger asChild>
                                                                                {cellContent}
                                                                            </TooltipTrigger>
                                                                            <TooltipContent
                                                                                side="bottom"
                                                                                align="center"
                                                                                className="bg-white text-slate-800 text-sm rounded-lg border border-slate-200 px-3 py-2"
                                                                                sideOffset={5}
                                                                                avoidCollisions={true}
                                                                                style={{ ...STYLES.chartTooltip }}
                                                                            >
                                                                                {tooltipText}
                                                                            </TooltipContent>
                                                                        </TooltipUI>
                                                                    </TooltipProvider>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Projects Matrix */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                            <div className="w-4 h-4 bg-indigo-300 border border-slate-300 rounded"></div>
                                            Projects
                                        </h3>
                                        <div className="w-full overflow-x-hidden">
                                            <table className="w-full">
                                                <thead>
                                                    <tr>
                                                        <th className="p-2 text-left text-sm font-semibold text-slate-600 border-b-2 border-slate-200 min-w-[90px]">
                                                            Donor
                                                        </th>
                                                        {selectedDonors.map(donor => (
                                                            <th 
                                                                key={donor} 
                                                                className="p-2 text-left text-sm font-semibold text-slate-600 border-b-2 border-slate-200 w-16"
                                                                style={{ writingMode: 'vertical-rl', transform: 'rotate(225deg)' }}
                                                            >
                                                                {donor}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {selectedDonors.map((donor1, i) => (
                                                        <tr key={donor1}>
                                                            <td className="p-2 text-sm font-semibold text-slate-600 border-r-2 border-slate-200">
                                                                {donor1}
                                                            </td>
                                                            {selectedDonors.map((donor2, j) => {
                                                                const isDiagonal = donor1 === donor2;
                                                                const projectCount = coFinancingMatrix[donor1]?.[donor2]?.projects.size || 0;
                                                                const colorClass = isDiagonal
                                                                    ? 'bg-slate-200 text-slate-400'
                                                                    : `${getProjectColorIntensity(projectCount, maxValues.maxProjects)} ${projectCount > 0 ? 'text-slate-800' : 'text-slate-400'}`;
                                                                
                                                                const tooltipText = !isDiagonal && projectCount > 0
                                                                    ? `${donor1} and ${donor2} are co-financing ${projectCount} project${projectCount !== 1 ? 's' : ''}`
                                                                    : null;
                                                                
                                                                const cellContent = (
                                                                    <td 
                                                                        key={donor2}
                                                                        className={`p-3 text-center text-sm font-semibold border border-slate-200 transition-all ${colorClass} ${!isDiagonal && projectCount > 0 ? 'cursor-pointer hover:opacity-75' : ''}`}
                                                                        onClick={() => !isDiagonal && projectCount > 0 && handleCellClick(donor1, donor2)}
                                                                    >
                                                                        {isDiagonal ? '—' : projectCount}
                                                                    </td>
                                                                );

                                                                if (!tooltipText) return cellContent;

                                                                return (
                                                                    <TooltipProvider key={donor2} delayDuration={0}>
                                                                        <TooltipUI>
                                                                            <TooltipTrigger asChild>
                                                                                {cellContent}
                                                                            </TooltipTrigger>
                                                                            <TooltipContent
                                                                                side="bottom"
                                                                                align="center"
                                                                                className="bg-white text-slate-800 text-sm rounded-lg border border-slate-200 px-3 py-2"
                                                                                sideOffset={5}
                                                                                avoidCollisions={true}
                                                                                style={{ ...STYLES.chartTooltip }}
                                                                            >
                                                                                {tooltipText}
                                                                            </TooltipContent>
                                                                        </TooltipUI>
                                                                    </TooltipProvider>
                                                                );
                                                            })}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Investment Focus Radar Chart */}
                    { /* Hide entire card when no donors selected */ }
                    {selectedDonors.length > 0 && donorInvestmentFocus.length > 0 && (
                    <Card className="!border-0 bg-white">
                        <CardHeader className="pb-2">
                        <div className="flex flex-col gap-1">
                            <SectionHeader
                            icon={<BarChart3 style={{ color: 'var(--badge-other-icon)' }} />}
                            title="Investment Focus by Donor"
                            />
                        </div>
                        </CardHeader>

                        <CardContent className="pt-2">
                        <div className="w-full h-[340px]">
                            {/* Type legend with icons */}
                            <div className="flex flex-wrap gap-3 items-center mb-3">
                                {Object.values(labels.investmentTypes).map((t) => {
                                    const Icon = getIconForInvestmentType(t);
                                    return (
                                        <div key={t} className="flex items-center gap-2 px-2 py-1 rounded text-sm bg-[var(--badge-other-bg)] border border-[var(--badge-other-border)] text-[var(--badge-other-text)]">
                                            <Icon className="w-4 h-4 text-[var(--badge-other-icon)]" />
                                            <span className="text-xs font-medium">{t}</span>
                                        </div>
                                    );
                                })}
                            </div>
                            <ResponsiveContainer width="100%" height="100%">
                           <RadarChart
  data={donorInvestmentFocus}
  outerRadius="62%"
  margin={{ top: 32, right: 32, bottom: 32, left: 32 }}
>
  <PolarGrid stroke="#e2e8f0" />

  <PolarAngleAxis
    dataKey="name"
    tick={{
      fontSize: 11,
      fill: '#475569',
      fontWeight: 500,
    }}
    tickLine={false}
  />

  <PolarRadiusAxis
    domain={[0, 100]}
    tickCount={3}
    tick={{ fontSize: 10, fill: '#94a3b8' }}
    axisLine={false}
    angle={90}
  />

    {selectedDonors.map((donor, index) => {
        const purplePalette = [
            'var(--badge-other-icon)',
            'var(--badge-other-border)',
            '#8b5cf6',
            '#7c3aed',
            '#6d28d9',
            '#5b21b6',
        ];

        const color = purplePalette[index % purplePalette.length];

        return (
            <Radar
                key={donor}
                name={donor}
                dataKey={donor}
                stroke={color}
                fill={color}
                fillOpacity={0.18}
                dot={false}
                isAnimationActive={false}
            />
        );
    })}

  <Legend
    verticalAlign="top"
    align="center"
    iconType="line"
    wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
  />
</RadarChart>
 
                            </ResponsiveContainer>
                        </div>

                        <p className="mt-2 text-xs text-slate-500">
                            Values are normalized per donor. Percentages represent relative focus, not absolute volume.
                        </p>
                        </CardContent>
                    </Card>
                    )}


                    
                    {/* Charts Row */}
                    <div className={`${selectedDonors.length === 0 ? 'hidden' : ''} grid grid-cols-1 lg:grid-cols-2 gap-4`}>
                        <div>
                            <ChartCard
                                title="Co-Financing Donors"
                                icon={<Globe style={{ color: 'var(--brand-primary)' }} />}
                                data={donorCoFinancingData}
                                barColor="var(--brand-primary-lighter)"
                                footnote={`Showing donors with co-financed organizations based on ${selectedDonors.length} selected donor${selectedDonors.length === 1 ? '' : 's'}`}
                            />

                            {/* Force labels visible under the chart so users always see pair names & values */}
                            
                        </div>
                        
                        {/* Organizations List */}
                        <Card className="!border-0 bg-white">
                            <CardHeader className="pb-3">
                                <CardTitle>
                                <SectionHeader icon={<Building2 style={{ color: 'var(--brand-primary)' }} />} title="Co-Financed Organizations" />
                            </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-1 max-h-70 overflow-y-auto">
                                    {organizationsWithDonorCounts.length === 0 ? (
                                        <p className="text-sm text-slate-500">No organizations found</p>
                                    ) : (
                                        organizationsWithDonorCounts.map((org, idx) => (
                                            <div 
                                                key={`${org.id}-${idx}`}
                                                className="flex items-start justify-between gap-2 py-1.5 px-2 rounded text-xs transition-colors hover:bg-slate-50"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-slate-800 truncate">
                                                        {org.name}
                                                    </p>
                                                    <p className="text-slate-500 text-xs truncate">
                                                        {Array.from(org.donors).join(', ')}
                                                    </p>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <span className="inline-block font-semibold px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: 'var(--brand-primary-lighter)', color: 'var(--brand-primary)' }}>
                                                        {org.donors.size}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
                                    {organizationsWithDonorCounts.length} org{organizationsWithDonorCounts.length !== 1 ? 's' : ''}
                                </p>
                            </CardContent>
                        </Card>
                        
                    
                    </div>


                    {/* Legend */}
                 
                </div>
            </div>

            {/* Footer */}
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
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {labels.footer.copyright.replace('{year}', new Date().getFullYear().toString())}
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
