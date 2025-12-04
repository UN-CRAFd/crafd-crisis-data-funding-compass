'use client';

import { Building2, ChevronDown, ChevronRight, ExternalLink, Package, PackageOpen } from 'lucide-react';
import { useState, useMemo } from 'react';
import BaseModal, { ModalHeader, ModalTooltip } from './BaseModal';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { CountryFlag } from './CountryFlag';
import labels from '@/config/labels.json';

interface Agency {
    id: string;
    name: string;
    dataPortal?: string;
}

interface Project {
    id: string;
    name: string;
    description?: string;
    productKey: string;
}

interface Organization {
    id: string;
    name: string;
    shortName: string;
}

interface AgencyData {
    agency: Agency;
    organizations: Organization[];
    projects: Project[];
}

interface DonorModalProps {
    donorCountry: string | null;
    // Nested organizations for agency data
    nestedOrganizations?: Array<{
        id: string;
        name: string;
        fields: Record<string, any>;
        agencies?: Array<{
            id: string;
            fields: Record<string, any>;
        }>;
        projects?: Array<{
            id: string;
            fields: Record<string, any>;
            agencies?: Array<{
                id: string;
                fields: Record<string, any>;
            }>;
        }>;
    }>;
    loading: boolean;
    onOpenOrganizationModal?: (orgKey: string) => void;
    onOpenProjectModal?: (productKey: string) => void;
}

export default function DonorModal({
    donorCountry,
    nestedOrganizations = [],
    loading,
    onOpenOrganizationModal,
    onOpenProjectModal,
}: DonorModalProps): React.ReactElement {
    // Hover state for project items
    const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
    // Track expanded agencies (all expanded by default)
    const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());

    // Reusable subheader component - Major sections - smaller than main title
    const SubHeader = ({ children }: { children: React.ReactNode }) => (
        <h3 className="text-lg font-roboto font-bold text-[#333333] leading-normal text-left">
            {children}
        </h3>
    );

    // Helper function to extract first sentence from text
    const getFirstSentence = (text: string): string => {
        if (!text || text.trim().length === 0) return '';
        const match = text.match(/^[^.!?]*[.!?]/);
        return match ? match[0].trim() : text.trim();
    };

    // Handle opening organization modal (close donor modal first)
    const handleOpenOrganization = (orgKey: string) => {
        window.dispatchEvent(new CustomEvent('closeDonorModal'));
        setTimeout(() => {
            onOpenOrganizationModal?.(orgKey);
        }, 50);
    };

    // Handle opening project modal (close donor modal first)
    const handleOpenProject = (productKey: string) => {
        window.dispatchEvent(new CustomEvent('closeDonorModal'));
        setTimeout(() => {
            onOpenProjectModal?.(productKey);
        }, 50);
    };

    // Build agency data structure from nested organizations
    // Only include directly financed organizations and projects (those with this agency at their level)
    const agencyData = useMemo(() => {
        if (!donorCountry || !nestedOrganizations) return [];

        const agencyMap = new Map<string, AgencyData>();

        nestedOrganizations.forEach(org => {
            const orgFields = org.fields || {};
            const orgName = orgFields['Org Full Name'] || orgFields['Org Short Name'] || org.name;
            const orgShortName = orgFields['org_key'] || orgFields['Org Short Name'] || '';

            // Check organization-level agencies - organization is directly funded by this agency
            (org.agencies || []).forEach(agency => {
                const agencyFields = agency.fields || {};
                const agencyCountry = agencyFields['Country Name'];
                
                if (agencyCountry === donorCountry) {
                    const agencyName = agencyFields['Agency/Department Name'] || 'Unspecified Agency';
                    const agencyId = agency.id;
                    const agencyPortal = agencyFields['Agency Data Portal'];

                    if (!agencyMap.has(agencyId)) {
                        agencyMap.set(agencyId, {
                            agency: {
                                id: agencyId,
                                name: agencyName,
                                dataPortal: agencyPortal,
                            },
                            organizations: [],
                            projects: [],
                        });
                    }

                    const agencyEntry = agencyMap.get(agencyId)!;
                    
                    // Add organization if not already added
                    if (!agencyEntry.organizations.some(o => o.id === org.id)) {
                        agencyEntry.organizations.push({
                            id: org.id,
                            name: orgName,
                            shortName: orgShortName,
                        });
                    }
                }
            });

            // Check project-level agencies - project is directly funded by this agency
            (org.projects || []).forEach(project => {
                const projectAgencies = project.agencies || [];
                
                projectAgencies.forEach(agency => {
                    const agencyFields = agency.fields || {};
                    const agencyCountry = agencyFields['Country Name'];
                    
                    if (agencyCountry === donorCountry) {
                        const agencyName = agencyFields['Agency/Department Name'] || 'Unspecified Agency';
                        const agencyId = agency.id;
                        const agencyPortal = agencyFields['Agency Data Portal'];

                        if (!agencyMap.has(agencyId)) {
                            agencyMap.set(agencyId, {
                                agency: {
                                    id: agencyId,
                                    name: agencyName,
                                    dataPortal: agencyPortal,
                                },
                                organizations: [],
                                projects: [],
                            });
                        }

                        const agencyEntry = agencyMap.get(agencyId)!;
                        
                        // Add project if not already added
                        const projectFields = project.fields || {};
                        const projectName = projectFields['Project/Product Name'] || 'Unnamed Project';
                        const projectDescription = projectFields['Project Description'] || '';
                        const productKey = projectFields['product_key'] || '';

                        if (!agencyEntry.projects.some(p => p.id === project.id)) {
                            agencyEntry.projects.push({
                                id: project.id,
                                name: projectName,
                                description: projectDescription,
                                productKey: productKey,
                            });
                        }
                    }
                });
            });
        });

        // Convert to array and sort by agency name
        const result = Array.from(agencyMap.values());
        result.sort((a, b) => a.agency.name.localeCompare(b.agency.name));
        
        // Sort organizations and projects within each agency
        result.forEach(agencyData => {
            agencyData.organizations.sort((a, b) => a.name.localeCompare(b.name));
            agencyData.projects.sort((a, b) => a.name.localeCompare(b.name));
        });

        return result;
    }, [donorCountry, nestedOrganizations]);

    // Calculate totals
    const totalOrganizations = useMemo(() => {
        const orgIds = new Set<string>();
        agencyData.forEach(ad => {
            ad.organizations.forEach(org => orgIds.add(org.id));
        });
        return orgIds.size;
    }, [agencyData]);

    const totalProjects = useMemo(() => {
        const projectIds = new Set<string>();
        agencyData.forEach(ad => {
            ad.projects.forEach(p => projectIds.add(p.id));
        });
        return projectIds.size;
    }, [agencyData]);

    const renderHeader = ({ showCopied, onShare, onClose }: { showCopied: boolean; onShare: () => void; onClose: () => void }) => {
        if (!donorCountry) {
            return (
                <ModalHeader
                    icon={<Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-[#333333] shrink-0" />}
                    title="Donor not found"
                    showCopied={showCopied}
                    onShare={onShare}
                    onClose={onClose}
                    loading={loading}
                />
            );
        }

        return (
            <ModalHeader
                icon={
                    <CountryFlag 
                        country={donorCountry} 
                        className="h-6 w-6 sm:h-10 sm:w-10 shrink-0 rounded object-cover"
                    />
                }
                title={donorCountry}
                showCopied={showCopied}
                onShare={onShare}
                onClose={onClose}
                loading={loading}
            />
        );
    };

    const renderBody = ({ tooltipContainer }: { tooltipContainer?: Element | null }): React.ReactNode => {
        if (loading) {
            return (
                <div className="p-4 sm:p-6 space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
            );
        }

        if (!donorCountry) {
            return (
                <div className="p-4 sm:p-6">
                    <p className="text-gray-600">Donor information not available.</p>
                </div>
            );
        }

        return (
            <div className="p-4 sm:p-6 space-y-6">
                {/* Summary line */}
                <div className="text-sm text-slate-500">
                    {agencyData.length} {agencyData.length === 1 ? 'Agency' : 'Agencies'} • {totalOrganizations} {totalOrganizations === 1 ? 'Organization' : 'Organizations'} • {totalProjects} {totalProjects === 1 ? 'Asset' : 'Assets'}
                </div>

                {/* Agencies list */}
                {agencyData.length === 0 ? (
                    <p className="text-gray-600">No agencies found for this donor.</p>
                ) : (
                    <div className="space-y-4">
                        {agencyData.map(({ agency, organizations, projects }) => {
                            const isExpanded = expandedAgencies.has(agency.id);
                            const toggleExpanded = () => {
                                setExpandedAgencies(prev => {
                                    const next = new Set(prev);
                                    if (next.has(agency.id)) {
                                        next.delete(agency.id);
                                    } else {
                                        next.add(agency.id);
                                    }
                                    return next;
                                });
                            };

                            return (
                                <Collapsible key={agency.id} open={isExpanded} onOpenChange={toggleExpanded}>
                                    {/* Agency collapsible header box */}
                                    <div className="border border-slate-200 rounded-md p-3 bg-white hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-2 w-full justify-start">
                                            <CollapsibleTrigger className="flex gap-2 hover:opacity-80 transition-opacity cursor-pointer items-center">
                                                {isExpanded ? (
                                                    <ChevronDown className="h-5 w-5 text-slate-500 shrink-0" />
                                                ) : (
                                                    <ChevronRight className="h-5 w-5 text-slate-500 shrink-0" />
                                                )}
                                                <SubHeader>{agency.name}</SubHeader>
                                            </CollapsibleTrigger>
                                            {agency.dataPortal && (
                                                <a
                                                    href={agency.dataPortal}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-slate-400 hover:text-slate-600 transition-colors"
                                                    title="Agency Data Portal"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            )}
                                            <span className="text-sm text-slate-400 tabular-nums">
                                                ({organizations.length + projects.length})
                                            </span>
                                        </div>
                                    </div>

                                    <CollapsibleContent className="mt-2 ml-0">
                                        <div className="ml-7 mt-3">
                                            {/* Directly funded organizations */}
                                        {organizations.length > 0 && (
                                            <div className="mb-4">
                                                <div className="mb-2 flex items-center gap-2">
                                                    <span className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                                                        {labels.modals.financedOrgs || 'Organizations'}
                                                    </span>
                                                    <span className="text-sm font-normal text-slate-400 tabular-nums">({organizations.length})</span>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {organizations.map(org => (
                                                        <button
                                                            key={org.id}
                                                            onClick={() => org.shortName && handleOpenOrganization(org.shortName)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-base font-medium transition-colors cursor-pointer text-left hover:opacity-80"
                                                            style={{
                                                                backgroundColor: 'var(--brand-bg-light)',
                                                                color: 'var(--brand-primary-dark)'
                                                            }}
                                                        >
                                                            <Building2 className="h-3.5 w-3.5 shrink-0" />
                                                            {org.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Directly funded projects */}
                                        {projects.length > 0 && (
                                            <div>
                                                <div className="mb-2 flex items-center gap-2">
                                                    <span className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                                                        {labels.modals.financedAssets || 'Assets'}
                                                    </span>
                                                    <span className="text-sm font-normal text-slate-400 tabular-nums">({projects.length})</span>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {projects.map(project => {
                                                        const firstSentence = getFirstSentence(project.description || '');
                                                        
                                                        const projectButton = (
                                                            <button
                                                                key={project.id}
                                                                onClick={() => project.productKey && handleOpenProject(project.productKey)}
                                                                onMouseEnter={() => setHoveredProjectId(project.id)}
                                                                onMouseLeave={() => setHoveredProjectId(null)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-base font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer text-left"
                                                            >
                                                                {hoveredProjectId === project.id ? (
                                                                    <PackageOpen className="w-4 h-4 text-slate-600 shrink-0" />
                                                                ) : (
                                                                    <Package className="w-4 h-4 text-slate-600 shrink-0" />
                                                                )}
                                                                <span className="truncate">{project.name}</span>
                                                            </button>
                                                        );

                                                        // Only wrap in tooltip if there's a description
                                                        if (firstSentence) {
                                                            return (
                                                                <ModalTooltip
                                                                    key={project.id}
                                                                    content={firstSentence}
                                                                    side="top"
                                                                    tooltipContainer={tooltipContainer}
                                                                >
                                                                    {projectButton}
                                                                </ModalTooltip>
                                                            );
                                                        }

                                                        return projectButton;
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        {/* Show message if agency has no direct funding */}
                                        {organizations.length === 0 && projects.length === 0 && (
                                            <p className="text-sm text-slate-400 italic">No directly funded organizations or assets.</p>
                                        )}
                                        </div>
                                    </CollapsibleContent>
                                </Collapsible>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    return (
        <BaseModal
            isOpen={!!donorCountry}
            closeEventName="closeDonorModal"
            loading={loading}
            renderHeader={renderHeader}
            renderBody={renderBody}
        />
    );
}
