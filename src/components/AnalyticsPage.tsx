'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import ChartCard from '@/components/ChartCard';
import FilterBar from '@/components/FilterBar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip as TooltipUI, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Globe, Search, Filter, ChevronDown, Building2, Database, BarChart3, Network, GitBranch, Users, Target } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { useTips } from '@/contexts/TipsContext';
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
    tooltip?: string;
}

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
                        <p className="leading-relaxed">{tooltip}</p>
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
    return `bg-amber-${intensity}00`;
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
    
    // Load filter state from URL on mount
    useEffect(() => {
        const urlDonors = searchParams.get('d')?.split(',').filter(Boolean) || [];
        const urlTypes = searchParams.get('types')?.split(',').filter(Boolean) || [];
        const urlThemes = searchParams.get('themes')?.split(',').filter(Boolean) || [];
        const urlQuery = searchParams.get('q') || '';
        
        setSelectedDonors(urlDonors);
        setInvestmentTypes(urlTypes);
        setInvestmentThemes(urlThemes);
        setAppliedSearchQuery(urlQuery);
        setSearchQuery(urlQuery);
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
                avgFundingOverlap: 0
            };
        }

        // 1. Total funding streams = total connections from donors to orgs/projects
        let totalFundingStreams = 0;
        const orgDonorConnections = new Set<string>();
        const projectDonorConnections = new Set<string>();

        filteredOrganizationsData.forEach(org => {
            const orgName = org.name || org.fields?.['Organization Name'] || '';
            
            // Count org-level donor connections
            if (org.agencies && Array.isArray(org.agencies)) {
                org.agencies.forEach(agency => {
                    const countryName = agency.fields?.['Country Name'];
                    if (countryName && selectedDonors.includes(countryName)) {
                        orgDonorConnections.add(`${org.id}-${orgName}-${countryName}`);
                    }
                });
            }
            
            // Count project-level donor connections
            if (org.projects && Array.isArray(org.projects)) {
                org.projects.forEach(project => {
                    const projectName = project.fields?.['Project Name'] || project.name || '';
                    if (project.agencies && Array.isArray(project.agencies)) {
                        project.agencies.forEach((agency: any) => {
                            const countryName = agency.fields?.['Country Name'];
                            if (countryName && selectedDonors.includes(countryName)) {
                                projectDonorConnections.add(`${project.id}-${projectName}-${countryName}`);
                            }
                        });
                    }
                });
            }
        });

        totalFundingStreams = orgDonorConnections.size + projectDonorConnections.size;

        // 2. Average number of donors per organization
        let totalDonorCount = 0;
        filteredOrganizationsData.forEach(org => {
            const orgDonors = new Set<string>();
            
            // Collect all donors (org + project level)
            if (org.agencies && Array.isArray(org.agencies)) {
                org.agencies.forEach(agency => {
                    const countryName = agency.fields?.['Country Name'];
                    if (countryName && selectedDonors.includes(countryName)) {
                        orgDonors.add(countryName);
                    }
                });
            }
            
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
            
            totalDonorCount += orgDonors.size;
        });

        const avgDonorsPerOrg = filteredOrganizationsData.length > 0 
            ? Number((totalDonorCount / filteredOrganizationsData.length).toFixed(1))
            : 0;

        // 3. Average funding overlap
        // Calculate unique funding targets (orgs/projects) funded by only one selected donor
        const fundingTargets = new Map<string, Set<string>>(); // target -> set of donors

        filteredOrganizationsData.forEach(org => {
            const orgName = org.name || org.fields?.['Organization Name'] || '';
            const orgKey = `org-${org.id}-${orgName}`;
            
            // Track which donors fund this org
            if (org.agencies && Array.isArray(org.agencies)) {
                org.agencies.forEach(agency => {
                    const countryName = agency.fields?.['Country Name'];
                    if (countryName && selectedDonors.includes(countryName)) {
                        if (!fundingTargets.has(orgKey)) {
                            fundingTargets.set(orgKey, new Set());
                        }
                        fundingTargets.get(orgKey)!.add(countryName);
                    }
                });
            }
            
            // Track project-level funding
            if (org.projects && Array.isArray(org.projects)) {
                org.projects.forEach(project => {
                    const projectName = project.fields?.['Project Name'] || project.name || '';
                    const projectKey = `project-${project.id}-${projectName}`;
                    
                    if (project.agencies && Array.isArray(project.agencies)) {
                        project.agencies.forEach((agency: any) => {
                            const countryName = agency.fields?.['Country Name'];
                            if (countryName && selectedDonors.includes(countryName)) {
                                if (!fundingTargets.has(projectKey)) {
                                    fundingTargets.set(projectKey, new Set());
                                }
                                fundingTargets.get(projectKey)!.add(countryName);
                            }
                        });
                    }
                });
            }
        });

        // Count targets funded by multiple donors (overlapping)
        let overlappingTargets = 0;
        fundingTargets.forEach((donors) => {
            if (donors.size > 1) {
                overlappingTargets++;
            }
        });

        const totalTargets = fundingTargets.size;
        const avgFundingOverlap = totalTargets > 0 
            ? Math.round((overlappingTargets / totalTargets) * 100)
            : 0;

        return {
            totalFundingStreams,
            avgDonorsPerOrg,
            avgFundingOverlap
        };
    }, [filteredOrganizationsData, selectedDonors]);

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setShareSuccess(true);
            setTimeout(() => {
                setShareSuccess(false);
            }, 2000);
        });
    };

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
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    {selectedDonors.length > 0 && (
                        <>
                            {/* Mobile Carousel */}
                            <div className="sm:hidden">
                                <div className="relative overflow-hidden">
                                    <div className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-2 px-1">
                                        <div className="flex-shrink-0 w-[280px] snap-center">
                                            <StatCard
                                                icon={<GitBranch style={{ color: 'var(--brand-primary)' }} />}
                                                title="Funding Streams"
                                                value={analyticsStats.totalFundingStreams}
                                                label="connections"
                                                colorScheme="amber"
                                                tooltip="Total number of connections from selected donors to organizations and projects. Each connection represents a direct funding relationship."
                                            />
                                        </div>
                                        <div className="flex-shrink-0 w-[290px] snap-center">
                                            <StatCard
                                                icon={<Users style={{ color: 'var(--brand-primary)' }} />}
                                                title="Avg Donors/Org"
                                                value={analyticsStats.avgDonorsPerOrg}
                                                label="donors"
                                                colorScheme="amber"
                                                tooltip="Average number of selected donors funding each organization (counting both organization-level and project-level funding)."
                                            />
                                        </div>
                                        <div className="flex-shrink-0 w-[280px] snap-center">
                                            <StatCard
                                                icon={<Target style={{ color: 'var(--brand-primary)' }} />}
                                                title="Funding Overlap"
                                                value={`${analyticsStats.avgFundingOverlap}%`}
                                                label="shared"
                                                colorScheme="amber"
                                                tooltip="Percentage of organizations and projects that are co-financed by multiple selected donors. Higher values indicate more collaboration between donors."
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Desktop Grid */}
                            <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-[var(--spacing-section)]">
                                <StatCard
                                    icon={<GitBranch style={{ color: 'var(--brand-primary)' }} />}
                                    title="Funding Streams"
                                    value={analyticsStats.totalFundingStreams}
                                    label="connections"
                                    colorScheme="amber"
                                    tooltip="Total number of connections from selected donors to organizations and projects. Each connection represents a direct funding relationship."
                                />
                                
                                <StatCard
                                    icon={<Users style={{ color: 'var(--brand-primary)' }} />}
                                    title="Avg Donors/Org"
                                    value={analyticsStats.avgDonorsPerOrg}
                                    label="donors"
                                    colorScheme="amber"
                                    tooltip="Average number of selected donors funding each organization (counting both organization-level and project-level funding)."
                                />

                                <StatCard
                                    icon={<Target style={{ color: 'var(--brand-primary)' }} />}
                                    title="Funding Overlap"
                                    value={`${analyticsStats.avgFundingOverlap}%`}
                                    label="shared"
                                    colorScheme="amber"
                                    tooltip="Percentage of organizations and projects that are co-financed by multiple selected donors. Higher values indicate more collaboration between donors."
                                />
                            </div>
                        </>
                    )}

                    {/* Filter Bar */}
                    <Card className="!border-0 bg-white">
                        <CardContent className="p-4 mt-0 mb-0">
                            <FilterBar className='mt-0 mb-0'
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

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <ChartCard
                            title="Co-Financing Donors"
                            icon={<Globe style={{ color: 'var(--brand-primary)' }} />}
                            data={donorCoFinancingData}
                            barColor="var(--brand-primary-lighter)"
                            footnote={`Showing donors with co-financed organizations based on ${selectedDonors.length} selected donor${selectedDonors.length === 1 ? '' : 's'}`}
                        />
                        <ChartCard
                            title={labels.sections.organizationTypes}
                            icon={<Building2 style={{ color: 'var(--brand-primary)' }} />}
                            data={organizationTypesData}
                            barColor="var(--brand-primary-lighter)"
                        />
                        <ChartCard
                            title={labels.sections.projectCategories}
                            icon={<Database style={{ color: 'var(--brand-primary)' }} />}
                            data={projectTypesData}
                            barColor="var(--brand-primary-lighter)"
                        />
                    </div>

                    {/* Unified Co-Financing Matrix */}
                    <Card className="!border-0 bg-white">
                        <CardHeader className="pb-0 h-6.5">
                            <CardTitle>
                                <SectionHeader icon={<Network style={{ color: 'var(--brand-primary)' }} />} title="Co-Financing Matrix" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="flex items-center gap-4 mb-3">
                                <p className="text-sm text-slate-600">
                                    Co-financing relationships between donor pairs
                                </p>
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
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-2 text-left text-xs font-semibold text-slate-600 border-b-2 border-slate-200 min-w-[120px]">
                                                Donor
                                            </th>
                                            {selectedDonors.map(donor => (
                                                <th 
                                                    key={donor} 
                                                    className="p-2 text-center text-xs font-semibold text-slate-600 border-b-2 border-slate-200 w-16"
                                                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                                >
                                                    {donor}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedDonors.map((donor1, i) => (
                                            <tr key={donor1}>
                                                <td className="p-2 text-xs font-semibold text-slate-600 border-r-2 border-slate-200">
                                                    {donor1}
                                                </td>
                                                {selectedDonors.map((donor2, j) => {
                                                    const isDiagonal = donor1 === donor2;
                                                    const isAboveDiagonal = i < j; // Above diagonal: projects (purple)
                                                    const isBelowDiagonal = i > j; // Below diagonal: organizations (orange)
                                                    
                                                    const projectCount = coFinancingMatrix[donor1]?.[donor2]?.projects.size || 0;
                                                    const orgCount = coFinancingMatrix[donor1]?.[donor2]?.orgs.size || 0;
                                                    
                                                    const count = isAboveDiagonal ? projectCount : orgCount;
                                                    const colorClass = isDiagonal 
                                                        ? 'bg-slate-200 text-slate-400'
                                                        : isAboveDiagonal
                                                            ? `${getProjectColorIntensity(projectCount, maxValues.maxProjects)} ${projectCount > 0 ? 'text-slate-800' : 'text-slate-400'}`
                                                            : `${getOrgColorIntensity(orgCount, maxValues.maxOrgs)} ${orgCount > 0 ? 'text-slate-800' : 'text-slate-400'}`;
                                                    
                                                    const tooltipText = isDiagonal 
                                                        ? null
                                                        : isAboveDiagonal
                                                            ? `${donor1} and ${donor2} are co-financing ${projectCount} project${projectCount !== 1 ? 's' : ''}`
                                                            : `${donor1} and ${donor2} are co-financing ${orgCount} organization${orgCount !== 1 ? 's' : ''}`;
                                                    
                                                    const handleCellClick = () => {
                                                        if (!isDiagonal && count > 0) {
                                                            // Navigate to dashboard with the two donors as filters using URL slugs
                                                            const donorSlugs = [donor1, donor2]
                                                                .map(d => toUrlSlug(d))
                                                                .join(',');
                                                            router.push(`/?d=${donorSlugs}`);
                                                        }
                                                    };
                                                    
                                                    const cellContent = (
                                                        <td 
                                                            key={donor2}
                                                            onClick={handleCellClick}
                                                            className={`p-3 text-center text-sm font-semibold border border-slate-200 ${colorClass} ${!isDiagonal && count > 0 ? 'cursor-pointer hover:opacity-75 transition-opacity' : ''}`}
                                                        >
                                                            {isDiagonal ? '—' : count}
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
                        </CardContent>
                    </Card>

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
