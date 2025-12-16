import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { getIconForInvestmentType } from '@/config/investmentTypeIcons';
import { useTips } from '@/contexts/TipsContext';
import { TooltipContent, TooltipProvider, TooltipTrigger, Tooltip as TooltipUI } from '@/components/ui/tooltip';
import labels from '@/config/labels.json';
import { matchesUrlSlug } from '@/lib/urlShortcuts';
import type { OrganizationWithProjects, ProjectData } from '@/types/airtable';

interface DonorTableProps {
    organizationsWithProjects: OrganizationWithProjects[];
    nestedOrganizations: any[];
    organizationsTable: Array<{ id: string; createdTime?: string; fields: Record<string, unknown> }>;
    onOpenOrganizationModal: (orgKey: string) => void;
    onOpenProjectModal: (projectKey: string) => void;
    onOpenDonorModal?: (donorCountry: string) => void;
    combinedDonors: string[];
    sortBy: 'name' | 'orgs' | 'assets';
    sortDirection: 'asc' | 'desc';
}

// Investment type descriptions for tooltips
const INVESTMENT_TYPE_DESCRIPTIONS: Record<string, string> = {
    'Data Sets & Commons': 'Shared data repositories and standardized datasets that enable analysis and decision-making across the humanitarian sector.',
    'Infrastructure & Platforms': 'Technical systems, tools, and platforms that support data collection, storage, processing, and sharing.',
    'Crisis Analytics & Insights': 'Analysis, modeling, and insights derived from data to inform humanitarian response and preparedness.',
    'Human Capital & Know-how': 'Training, capacity building, and expertise development for humanitarian data practitioners.',
    'Standards & Coordination': 'Common standards, protocols, and coordination mechanisms for humanitarian data management.',
    'Learning & Exchange': 'Knowledge sharing, communities of practice, and collaborative learning initiatives.'
};

// Badge component (reused from CrisisDataDashboard)
interface BadgeProps {
    text: string;
    variant: 'blue' | 'emerald' | 'violet' | 'slate' | 'highlighted' | 'beta' | 'types' | 'indigo';
    className?: string;
    title?: string;
}

const Badge = ({ text, variant, className = '', title }: BadgeProps) => {
    const variants = {
        blue: 'bg-[var(--brand-bg-light)] text-[var(--brand-primary)]',
        emerald: 'bg-emerald-50 text-emerald-700',
        violet: 'bg-violet-50 text-violet-700',
        indigo: 'bg-[var(--badge-other-bg)] text-[var(--badge-other-text)] font-semibold',
        agency: 'bg-[var(--badge-agency-bg)] text-[var(--badge-agency-text)]',
        types: 'bg-green-50 text-green-700',
        slate: 'bg-[var(--badge-slate-bg)] text-[var(--badge-slate-text)]',
        highlighted: 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] border border-[var(--brand-border)] font-semibold',
        beta: ''
    };

    if (variant === 'beta') {
        return (
            <span
                className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs font-semibold break-words ${className}`}
                style={{
                    backgroundColor: 'var(--badge-beta-bg)',
                    color: 'var(--badge-beta-text)'
                }}
                title={title}
            >
                {text}
            </span>
        );
    }

    return (
        <span 
            className={`inline-flex items-center px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-[10px] sm:text-xs font-medium break-words ${variants[variant]} ${className}`}
            title={title}
        >
            {text}
        </span>
    );
};

export const DonorTable: React.FC<DonorTableProps> = ({
    organizationsWithProjects,
    nestedOrganizations,
    organizationsTable,
    onOpenOrganizationModal,
    onOpenProjectModal,
    onOpenDonorModal,
    combinedDonors,
    sortBy,
    sortDirection
}) => {
    const [expandedDonors, setExpandedDonors] = useState<Set<string>>(new Set());
    const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
    const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());

    // Get tips enabled state
    let tipsEnabled = false;
    try {
        const tipsContext = useTips();
        tipsEnabled = tipsContext.tipsEnabled;
    } catch (e) {
        tipsEnabled = false;
    }

    // Group organizations and projects by donor
    const donorData = useMemo(() => {
        const donorMap = new Map<string, {
            organizations: Map<string, {
                org: OrganizationWithProjects;
                projects: ProjectData[];
                isOrgLevel: boolean;
            }>;
        }>();

        organizationsWithProjects.forEach(org => {
            // Get org-level donors
            const orgLevelDonors = org.donorCountries || [];
            
            // Add org to each org-level donor
            orgLevelDonors.forEach(donor => {
                if (!donorMap.has(donor)) {
                    donorMap.set(donor, { organizations: new Map() });
                }
                const donorEntry = donorMap.get(donor)!;
                
                if (!donorEntry.organizations.has(org.id)) {
                    donorEntry.organizations.set(org.id, {
                        org,
                        projects: [],
                        isOrgLevel: true
                    });
                }
                // Add all org projects to this donor
                donorEntry.organizations.get(org.id)!.projects = [...org.projects];
            });

            // Also check project-level donors
            org.projects.forEach(project => {
                const projectDonors = project.donorCountries || [];
                projectDonors.forEach(donor => {
                    if (!donorMap.has(donor)) {
                        donorMap.set(donor, { organizations: new Map() });
                    }
                    const donorEntry = donorMap.get(donor)!;
                    
                    if (!donorEntry.organizations.has(org.id)) {
                        // Org not yet added to this donor (project-only relationship)
                        donorEntry.organizations.set(org.id, {
                            org,
                            projects: [project],
                            isOrgLevel: false
                        });
                    } else {
                        // Org already exists, ensure this project is included
                        const orgEntry = donorEntry.organizations.get(org.id)!;
                        if (!orgEntry.projects.find(p => p.id === project.id)) {
                            orgEntry.projects.push(project);
                        }
                    }
                });
            });
        });

        // Convert to array and sort
        return Array.from(donorMap.entries())
            .map(([donor, data]) => {
                const orgsArray = Array.from(data.organizations.values());

                // Deduplicate projects across all organizations for this donor
                const projectIdSet = new Set<string>();
                orgsArray.forEach(orgData => {
                    (orgData.projects || []).forEach((p: any) => {
                        // Prefer `id` as canonical project id, fallback to other identifiers
                        const pid = p?.id ?? p?.projectId ?? p?.productKey ?? p?.name ?? null;
                        if (pid) projectIdSet.add(String(pid));
                    });
                });

                return {
                    donor,
                    organizations: orgsArray,
                    totalOrgs: data.organizations.size,
                    totalProjects: projectIdSet.size,
                };
            })
            .sort((a, b) => {
                // Always prefer selected/filtered donors (combinedDonors) to the top
                const aSelected = combinedDonors.includes(a.donor);
                const bSelected = combinedDonors.includes(b.donor);
                if (aSelected && !bSelected) return -1;
                if (!aSelected && bSelected) return 1;

                let comparison = 0;

                if (sortBy === 'name') {
                    comparison = b.donor.localeCompare(a.donor);
                } else if (sortBy === 'orgs') {
                    comparison = a.totalOrgs - b.totalOrgs;
                } else if (sortBy === 'assets') {
                    comparison = a.totalProjects - b.totalProjects;
                }

                // Apply sort direction
                return sortDirection === 'asc' ? comparison : -comparison;
            });
    }, [organizationsWithProjects, combinedDonors, sortBy, sortDirection]);

    return (
        <div className="space-y-2 transition-all duration-500">
            {donorData.map(({ donor, organizations, totalOrgs, totalProjects }) => {
                const isDonorExpanded = expandedDonors.has(donor);
                const isSelected = combinedDonors.includes(donor);

                return (
                    <Collapsible
                        key={donor}
                        open={isDonorExpanded}
                        onOpenChange={() => {
                            const newExpanded = new Set(expandedDonors);
                            if (isDonorExpanded) {
                                newExpanded.delete(donor);
                            } else {
                                newExpanded.add(donor);
                            }
                            setExpandedDonors(newExpanded);
                        }}
                        className="transition-all duration-500 ease-out"
                    >
                        <CollapsibleTrigger className="w-full">
                            <div 
                                className={`flex flex-col sm:flex-row sm:justify-between p-3 sm:p-4 hover:bg-slate-50/70 rounded-lg border ${
                                    isSelected 
                                        ? 'border-[var(--brand-primary)] bg-[var(--brand-bg-lighter)]' 
                                        : 'border-slate-200 bg-slate-50/30'
                                } animate-in fade-in gap-3 sm:gap-0 cursor-pointer min-h-[60px]`}
                            >
                                <div className="flex items-center space-x-3 flex-1">
                                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                                        {isDonorExpanded ? (
                                            <ChevronDown className="h-4 w-4 text-slate-500" />
                                        ) : (
                                            <ChevronRight className="h-4 w-4 text-slate-500" />
                                        )}
                                    </div>
                                    <div className="text-left space-y-0 mb-0 mt-0 flex-1 min-w-0">
                                        <h3 
                                            className={`font-medium text-sm sm:text-base cursor-pointer transition-colors hover:text-[var(--brand-primary)] ${
                                                isSelected ? 'text-[var(--brand-primary)]' : 'text-slate-900'
                                            }`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (onOpenDonorModal) {
                                                    onOpenDonorModal(donor);
                                                }
                                            }}
                                        >
                                            {donor}
                                        </h3>
                                        <div className="text-xs sm:text-sm text-slate-500 mt-0">
                                            {totalOrgs} organization{totalOrgs !== 1 ? 's' : ''} · {totalProjects} asset{totalProjects !== 1 ? 's' : ''}
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
                                            if (onOpenDonorModal) {
                                                onOpenDonorModal(donor);
                                            }
                                        }}
                                        className="hidden sm:inline-flex items-center justify-center gap-1 text-[10px] h-6 px-2 rounded-md text-[var(--badge-slate-bg)] bg-[var(--badge-slate-text)] hover:bg-slate-400 duration-150"
                                    >
                                        <div className="hidden sm:inline-flex items-center justify-center gap-1 border-none">
                                            <Info className="w-3 h-3" />
                                            <span>Details</span>
                                        </div>
                                    </Button>
                                    <div className="text-xs sm:text-xs text-slate-400 whitespace-nowrap">
                                        {isDonorExpanded
                                            ? `Showing ${totalOrgs} organization${totalOrgs === 1 ? '' : 's'}`
                                            : `Show ${totalOrgs} organization${totalOrgs === 1 ? '' : 's'}`}
                                    </div>
                                </div>
                            </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="mt-2 ml-4 sm:ml-7 space-y-2">
                                {organizations.map(({ org, projects, isOrgLevel }) => {
                                    const isOrgExpanded = expandedOrgs.has(org.id);
                                    const hasProjects = projects.length > 0;

                                    return (
                                        <Collapsible
                                            key={org.id}
                                            open={isOrgExpanded}
                                            onOpenChange={() => {
                                                const newExpanded = new Set(expandedOrgs);
                                                if (isOrgExpanded) {
                                                    newExpanded.delete(org.id);
                                                } else {
                                                    newExpanded.add(org.id);
                                                }
                                                setExpandedOrgs(newExpanded);
                                            }}
                                            className="transition-all duration-500 ease-out"
                                        >
                                            <CollapsibleTrigger className="w-full">
                                                <div className="flex flex-col sm:flex-row sm:justify-between p-4 sm:p-5 hover:bg-slate-100/70 rounded-lg border border-slate-100 bg-white/50 animate-in fade-in gap-3 sm:gap-0 cursor-pointer">
                                                    <div className="flex items-center space-x-3 flex-1">
                                                        <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                                                            {hasProjects ? (
                                                                isOrgExpanded ? (
                                                                    <ChevronDown className="h-4 w-4 text-slate-500" />
                                                                ) : (
                                                                    <ChevronRight className="h-4 w-4 text-slate-500" />
                                                                )
                                                            ) : (
                                                                <div className="h-4 w-4 invisible" aria-hidden="true" />
                                                            )}
                                                        </div>
                                                        <div className="text-left flex-1 min-w-0">
                                                            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-baseline gap-1 sm:gap-2">
                                                                <h4
                                                                    className="font-medium text-slate-900 cursor-pointer transition-colors hover:text-[var(--brand-primary)] text-base sm:text-md"
                                                                    onClick={e => {
                                                                        e.stopPropagation();
                                                                        const nestedOrg = nestedOrganizations.find(n => n.id === org.id);
                                                                        const orgKey = nestedOrg?.fields?.['org_key'];
                                                                        if (orgKey) {
                                                                            onOpenOrganizationModal(orgKey);
                                                                        }
                                                                    }}
                                                                >
                                                                    {org.organizationName}
                                                                </h4>
                                                                {(() => {
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
                                                                        <div className="sm:inline-flex items-center px-0.5 py-0 rounded text-[10px] font-sm text-slate-400 bg-transparent whitespace-nowrap flex-shrink-0">
                                                                            {orgType}
                                                                        </div>
                                                                    ) : null;
                                                                })()}
                                                                
                                                            </div>                                                            {/* Agency badges for organization */}
                                                            <div className="flex flex-wrap gap-1 mt-2 max-w-full">
                                                                {!isOrgLevel && (
                                                                    <Badge
                                                                        text="Project-Level Funding"
                                                                        variant="slate"
                                                                        className="opacity-70 text-xs text-[9px] sm:text-[10px]"
                                                                        title="This donor only funds specific projects, not the organization as a whole"
                                                                    />
                                                                )}
                                                                {(() => {
                                                                    const isAgenciesExpanded = expandedAgencies.has(`org-${org.id}`);
                                                                    
                                                                    // Get agencies for this org from nestedOrganizations
                                                                    const nestedOrg = nestedOrganizations.find(n => n.id === org.id);
                                                                    const agencies = nestedOrg?.agencies || [];
                                                                    
                                                                    // Extract unique agency names that belong to the current donor
                                                                    const agencyNames = new Set<string>();
                                                                    agencies.forEach((agency: any) => {
                                                                        // Get the country/donor from this agency
                                                                        const agencyCountry = agency.fields?.['Country Name'] ||
                                                                                            agency.fields?.['Country'] ||
                                                                                            agency.fields?.['Agency Associated Country'] ||
                                                                                            agency.fields?.['Agency/Department Country'];

                                                                        // Check if this agency's country matches the current donor we're iterating
                                                                        let belongsToDonor = false;
                                                                        if (agencyCountry) {
                                                                            const countryValues = Array.isArray(agencyCountry) ? agencyCountry : [agencyCountry];
                                                                            belongsToDonor = countryValues.some((c: any) => {
                                                                                try {
                                                                                    return matchesUrlSlug(donor, String(c));
                                                                                } catch {
                                                                                    return (typeof c === 'string' ? c.trim() : c?.toString() || '').toLowerCase() === donor.toLowerCase();
                                                                                }
                                                                            });
                                                                        }

                                                                        if (belongsToDonor) {
                                                                            const agencyName = agency.fields?.['Agency Name'] || agency.fields?.['Funding Agency'] || agency.fields?.['Agency/Department Name'];
                                                                            if (agencyName) {
                                                                                if (Array.isArray(agencyName)) {
                                                                                    agencyName.forEach(name => {
                                                                                        if (name && name.trim() !== 'Unspecified Agency') {
                                                                                            agencyNames.add(name);
                                                                                        }
                                                                                    });
                                                                                } else if (agencyName.trim() !== 'Unspecified Agency') {
                                                                                    agencyNames.add(agencyName);
                                                                                }
                                                                            }
                                                                        }
                                                                    });
                                                                    
                                                                    const agencyArray = Array.from(agencyNames).sort();
                                                                    const maxAgenciesToShow = 3;
                                                                    const agenciesToShow = isAgenciesExpanded ? agencyArray : agencyArray.slice(0, maxAgenciesToShow);
                                                                    
                                                                    
                                                                    if (agencyArray.length === 0) return null;
                                                                    
                                                                    return (
                                                                        <>
                                                                            {agenciesToShow.map((agency, idx) => (
                                                                                <Badge
                                                                                    key={idx}
                                                                                    text={agency}
                                                                                    variant="agency"
                                                                                    className="text-[9px] sm:text-[10px]"
                                                                                    title={`Funding Agency: ${agency}`}
                                                                                />
                                                                            ))}
                                                                            {agencyArray.length > maxAgenciesToShow && !isAgenciesExpanded && (
                                                                                <div
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        const newExpanded = new Set(expandedAgencies);
                                                                                        newExpanded.add(`org-${org.id}`);
                                                                                        setExpandedAgencies(newExpanded);
                                                                                    }}
                                                                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-000 text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                                                                >
                                                                                    +{agencyArray.length - maxAgenciesToShow} more
                                                                                </div>
                                                                            )}
                                                                            {isAgenciesExpanded && agencyArray.length > maxAgenciesToShow && (
                                                                                <div
                                                                                    onClick={(e) => {
                                                                                        e.stopPropagation();
                                                                                        const newExpanded = new Set(expandedAgencies);
                                                                                        newExpanded.delete(`org-${org.id}`);
                                                                                        setExpandedAgencies(newExpanded);
                                                                                    }}
                                                                                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-000 text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                                                                >
                                                                                    Show less
                                                                                </div>
                                                                            )}
                                                                        </>
                                                                    );
                                                                })()}
                                                            </div>                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col justify-between items-end self-stretch flex-shrink-0 min-w-[100px]">
                                                        
                                                        <div className="text-xs sm:text-xs text-slate-400 whitespace-nowrap">
                                                            {projects.length > 0 ? (
                                                                isOrgExpanded
                                                                    ? `Showing ${projects.length} asset${projects.length === 1 ? '' : 's'}`
                                                                    : `Show ${projects.length} asset${projects.length === 1 ? '' : 's'}`
                                                            ) : (
                                                                `${projects.length} asset${projects.length === 1 ? '' : 's'}`
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </CollapsibleTrigger>
                                            <CollapsibleContent>
                                                <div className="mt-2 ml-4 sm:ml-7 space-y-2">
                                                    {projects.map((project: ProjectData) => (
                                                        <div
                                                            key={project.id}
                                                            className="p-2 sm:p-2.5 bg-slate-50/50 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors duration-200 animate-in fade-in group"
                                                            onClick={() => {
                                                                const nestedOrg = nestedOrganizations.find((n: any) => n.id === org.id);
                                                                const nestedProject = nestedOrg?.projects?.find((p: any) => p.id === project.id);
                                                                const projectKey = nestedProject?.fields?.product_key;
                                                                if (projectKey) {
                                                                    onOpenProjectModal(projectKey);
                                                                }
                                                            }}
                                                        >
                                                            <div className="mb-1">
                                                                <div className="flex flex-wrap items-center gap-1.5 gap-y-0.5">
                                                                    <span className="font-medium text-slate-900 group-hover:text-[var(--badge-other-border)] transition-colors text-xs sm:text-sm">
                                                                        {project.projectName}
                                                                    </span>
                                                                    {project.investmentTypes && project.investmentTypes.length > 0 && (
                                                                        <div className="flex flex-wrap gap-1 items-center">
                                                                            {project.investmentTypes.map((type, idx) => {
                                                                                const IconComponent = getIconForInvestmentType(type);
                                                                                const description = INVESTMENT_TYPE_DESCRIPTIONS[type];
                                                                                const badge = (
                                                                                    <span 
                                                                                        key={idx} 
                                                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold cursor-help"
                                                                                        style={{
                                                                                            backgroundColor: 'var(--badge-other-bg)',
                                                                                            color: 'var(--badge-other-text)'
                                                                                        }}
                                                                                    >
                                                                                        <IconComponent className="w-3.5 h-3.5" />
                                                                                        {type}
                                                                                    </span>
                                                                                );
                                                                                
                                                                                if (description && tipsEnabled) {
                                                                                    return (
                                                                                        <TooltipProvider key={idx}>
                                                                                            <TooltipUI delayDuration={200}>
                                                                                                <TooltipTrigger asChild>
                                                                                                    {badge}
                                                                                                </TooltipTrigger>
                                                                                                <TooltipContent 
                                                                                                    side="top" 
                                                                                                    className="max-w-xs text-xs bg-white/70 backdrop-blur-md border border-gray-200 !z-[300]"
                                                                                                    sideOffset={5}
                                                                                                >
                                                                                                    {description}
                                                                                                </TooltipContent>
                                                                                            </TooltipUI>
                                                                                        </TooltipProvider>
                                                                                    );
                                                                                }
                                                                                
                                                                                return badge;
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="flex flex-wrap gap-0.5">
                                                                    
                                                                </div>
                                                                {/* Agency badges for project */}
                                                                <div className="flex flex-wrap gap-1 mt-1">
                                                                    {(() => {
                                                                        const isAgenciesExpanded = expandedAgencies.has(`project-${project.id}`);
                                                                        
                                                                        // Get agencies for this project from nestedOrganizations
                                                                        const nestedOrg = nestedOrganizations.find((n: any) => n.id === org.id);
                                                                        const nestedProject = nestedOrg?.projects?.find((p: any) => p.id === project.id);
                                                                        const agencies = nestedProject?.agencies || [];
                                                                        
                                                                        // Extract unique agency names that belong to the current donor
                                                                        const agencyNames = new Set<string>();
                                                                        agencies.forEach((agency: any) => {
                                                                            // Check if this agency belongs to the current donor
                                                                            // Look for donor field first, then fall back to country fields
                                                                            const donorField = agency.fields?.['Donor'] || agency.fields?.['Funding Country'] || agency.fields?.['Organization Donor'];
                                                                            const agencyCountry = agency.fields?.['Country Name'] ||
                                                                                                agency.fields?.['Country'] ||
                                                                                                agency.fields?.['Agency Associated Country'] ||
                                                                                                agency.fields?.['Agency/Department Country'];

                                                                            // Check if agency belongs to current donor
                                                                            let belongsToDonor = false;

                                                                            // Check donor field first
                                                                            if (donorField) {
                                                                                const donorValues = Array.isArray(donorField) ? donorField : [donorField];
                                                                                belongsToDonor = donorValues.some((d: any) => {
                                                                                    try {
                                                                                        return matchesUrlSlug(donor, String(d));
                                                                                    } catch {
                                                                                        return (typeof d === 'string' ? d.trim() : d?.toString() || '').toLowerCase() === donor.toLowerCase();
                                                                                    }
                                                                                });
                                                                            }

                                                                            // Fall back to country field if no donor field match
                                                                            if (!belongsToDonor && agencyCountry) {
                                                                                const countryValues = Array.isArray(agencyCountry) ? agencyCountry : [agencyCountry];
                                                                                belongsToDonor = countryValues.some((c: any) => {
                                                                                    try {
                                                                                        return matchesUrlSlug(donor, String(c));
                                                                                    } catch {
                                                                                        return (typeof c === 'string' ? c.trim() : c?.toString() || '').toLowerCase() === donor.toLowerCase();
                                                                                    }
                                                                                });
                                                                            }

                                                                            if (belongsToDonor) {
                                                                                const agencyName = agency.fields?.['Agency Name'] || agency.fields?.['Funding Agency'] || agency.fields?.['Agency/Department Name'];
                                                                                if (agencyName) {
                                                                                    if (Array.isArray(agencyName)) {
                                                                                        agencyName.forEach(name => {
                                                                                            if (name && name.trim() !== 'Unspecified Agency') {
                                                                                                agencyNames.add(name);
                                                                                            }
                                                                                        });
                                                                                    } else if (agencyName.trim() !== 'Unspecified Agency') {
                                                                                        agencyNames.add(agencyName);
                                                                                    }
                                                                                }
                                                                            }
                                                                        });
                                                                        
                                                                        const agencyArray = Array.from(agencyNames).sort();
                                                                        const maxAgenciesToShow = 3;
                                                                        const agenciesToShow = isAgenciesExpanded ? agencyArray : agencyArray.slice(0, maxAgenciesToShow);
                                                                        
                                                                        if (agencyArray.length === 0) return null;
                                                                        
                                                                        return (
                                                                            <>
                                                                                {agenciesToShow.map((agency, idx) => (
                                                                                    <Badge
                                                                                        key={idx}
                                                                                        text={agency}
                                                                                        variant="indigo"
                                                                                        className="text-[9px] sm:text-[10px]"
                                                                                        title={`Funding Agency: ${agency}`}
                                                                                    />
                                                                                ))}
                                                                                {agencyArray.length > maxAgenciesToShow && !isAgenciesExpanded && (
                                                                                    <div
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            const newExpanded = new Set(expandedAgencies);
                                                                                            newExpanded.add(`project-${project.id}`);
                                                                                            setExpandedAgencies(newExpanded);
                                                                                        }}
                                                                                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-000 text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                                                                    >
                                                                                        +{agencyArray.length - maxAgenciesToShow} more
                                                                                    </div>
                                                                                )}
                                                                                {isAgenciesExpanded && agencyArray.length > maxAgenciesToShow && (
                                                                                    <div
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            const newExpanded = new Set(expandedAgencies);
                                                                                            newExpanded.delete(`project-${project.id}`);
                                                                                            setExpandedAgencies(newExpanded);
                                                                                        }}
                                                                                        className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-000 text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                                                                                    >
                                                                                        Show less
                                                                                    </div>
                                                                                )}
                                                                            </>
                                                                        );
                                                                    })()}
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
                        </CollapsibleContent>
                    </Collapsible>
                );
            })}
        </div>
    );
};

export default DonorTable;
