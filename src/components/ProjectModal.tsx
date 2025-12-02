'use client';

import { Building2, ExternalLink, Package } from 'lucide-react';
import type { OrganizationWithProjects, ProjectData } from '../lib/data';
import { getIconForInvestmentType } from '@/config/investmentTypeIcons';
import { INVESTMENT_TYPE_DESCRIPTIONS } from '@/config/tooltipDescriptions';
import BaseModal, { ModalHeader, CountryBadge, ModalTooltip } from './BaseModal';
import { useEffect, useState } from 'react';

interface ProjectModalProps {
    project: ProjectData | null;
    organizationName?: string;
    allOrganizations: OrganizationWithProjects[];
    loading: boolean;
    projectAgenciesMap?: Record<string, Record<string, string[]>>;
    onOpenOrganizationModal?: (orgKey: string) => void;
    onDonorClick?: (country: string) => void;
    onTypeClick?: (type: string) => void;
}

export default function ProjectModal({ project, allOrganizations, loading, projectAgenciesMap = {}, onOpenOrganizationModal, onDonorClick, onTypeClick }: ProjectModalProps) {

    const [themeToTypeMapping, setThemeToTypeMapping] = useState<Record<string, string>>({});
    const [themeDescriptions, setThemeDescriptions] = useState<Record<string, string>>({});

    // Load theme mapping and descriptions from themes-table.json on mount
    useEffect(() => {
        fetch('/data/themes-table.json')
            .then(response => response.json())
            .then(data => {
                const mapping: Record<string, string> = {};
                const descriptions: Record<string, string> = {};
                
                // Build mapping from themes JSON
                data.forEach((record: any) => {
                    const theme = record.fields?.['Investment Themes [Text Key]'];
                    const type = record.fields?.['Investment Type']?.[0]; // First item from array
                    const description = record.fields?.['theme_description'];
                    
                    if (theme && type) {
                        mapping[theme] = type;
                    }
                    if (theme && description) {
                        descriptions[theme] = description;
                    }
                });
                
                setThemeToTypeMapping(mapping);
                setThemeDescriptions(descriptions);
            })
            .catch(error => console.error('Error loading theme mapping:', error));
    }, []);

    const SubHeader = ({ children }: { children: React.ReactNode }) => (
        <h3 className="text-xl font-roboto font-black text-[#333333] mb-3 uppercase tracking-wide leading-normal">
            {children}
        </h3>
    );

    const renderHeader = ({ showCopied, onShare, onClose }: { showCopied: boolean; onShare: () => void; onClose: () => void }) => {
        if (!project) {
            return (
                <ModalHeader
                    icon={<Package className="h-6 w-6 sm:h-7 sm:w-7 text-[#333333] shrink-0" />}
                    title="Project Not Found"
                    showCopied={showCopied}
                    onShare={onShare}
                    onClose={onClose}
                    loading={loading}
                />
            );
        }

        return (
            <ModalHeader
                icon={<Package className="h-6 w-6 sm:h-7 sm:w-7 text-[#333333] shrink-0" />}
                title={project.projectName}
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

        if (!project) {
            return (
                <div className="p-4 sm:p-6">
                    <p className="text-gray-600">The requested project could not be found.</p>
                </div>
            );
        }

        const supportingOrganizations = allOrganizations.filter(org =>
            org.projects.some(p => p.id === project.id)
        );

        const projectWebsite = project.projectWebsite || project.website || '';
        
        // Check if project is part of HDX Data Grid
        const isHdxDataGrid = project.hdxSohd && project.hdxSohd !== 'None';

        return (
            <div className="px-6 sm:px-8 pt-4 sm:pt-5 pb-6 sm:pb-8 font-roboto flex flex-col h-full">
                {/* HDX Data Grid Badge */}
                {isHdxDataGrid && (
                    <div className="mb-4">
                        <a
                            href="https://data.humdata.org/dashboards/overview-of-data-grids"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-slate-100 text-slate-600 border border-slate-200"
                        >
                            <img src="/hdx_logo.png" alt="HDX logo" className="w-4 h-4 rounded-none" />
                            <span>HDX Data Grid</span>
                            <ExternalLink className="w-3 h-3 text-slate-600" />
                        </a>
                    </div>
                )}
                
                {project.projectDescription && (
                    <p className="text-base font-normal text-gray-700 leading-snug font-roboto mb-1">
                        {project.projectDescription}
                        {projectWebsite && projectWebsite.trim() !== '' && (
                            <>
                                {' '}
                                <a
                                    href={projectWebsite}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 font-medium hover:underline"
                                    style={{ color: 'var(--brand-primary)' }}
                                >
                                    Learn more
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </>
                        )}
                    </p>
                )}

                {!project.projectDescription && projectWebsite && projectWebsite.trim() !== '' && (
                    <div className="mb-6">
                        <a
                            href={projectWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium hover:opacity-80 transition-opacity"
                            style={{
                                backgroundColor: 'var(--brand-primary)',
                                color: 'white',
                            }}
                        >
                            Visit Project Website
                            <ExternalLink className="h-4 w-4" />
                        </a>
                    </div>
                )}

                <div className="border-t border-gray-200 mt-4 mb-6"></div>

                {supportingOrganizations.length > 0 && (
                    <div className="mb-6">
                        <div className="mb-3 flex items-center gap-2">
                        <h3 className="text-xl font-roboto font-black text-[#333333] uppercase tracking-wide leading-normal">
                                        Provider Organizations
                                    </h3>
                        <span className="text-lg font-normal text-gray-500 tabular-nums">({supportingOrganizations.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {supportingOrganizations.map(org => {
                                // Use orgShortName if available, otherwise use organizationName
                                const orgKey = org.orgShortName?.toLowerCase() || org.organizationName.toLowerCase();
                                
                                return (
                                    <button
                                        key={org.id}
                                        onClick={() => onOpenOrganizationModal?.(orgKey)}
                                        className="inline-flex items-center w-full gap-1.5 px-3 py-1.5 rounded-md text-base font-medium transition-colors cursor-pointer text-left hover:opacity-80"
                                        style={{
                                            backgroundColor: 'var(--brand-bg-light)',
                                            color: 'var(--brand-primary-dark)'
                                        }}
                                    >
                                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                                        {org.organizationName}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {project.investmentTypes && project.investmentTypes.length > 0 && (
                    <div className="mb-6">
                        <SubHeader>Asset Type & Theme</SubHeader>
                        <div className="space-y-3">
                            {project.investmentTypes.map((type, typeIndex) => {
                                const IconComponent = getIconForInvestmentType(type);
                                // Get themes that belong to this investment type
                                const relatedThemes = (project.investmentThemes || []).filter(
                                    theme => themeToTypeMapping[theme] === type
                                );
                                
                                return (
                                    <div key={typeIndex} className="flex flex-wrap gap-2 items-center">
                                        <ModalTooltip 
                                            content={INVESTMENT_TYPE_DESCRIPTIONS[type] || 'Click to filter by this investment type'}
                                            side="top"
                                            tooltipContainer={tooltipContainer}
                                        >
                                            <button
                                                onClick={() => onTypeClick?.(type)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold hover:opacity-80 transition-opacity cursor-pointer"
                                                style={{
                                                    backgroundColor: 'var(--badge-other-bg)',
                                                    color: 'var(--badge-other-text)'
                                                }}
                                            >
                                                <IconComponent className="w-4 h-4" />
                                                {type}
                                            </button>
                                        </ModalTooltip>
                                        {relatedThemes.length > 0 && (
                                            <>
                                                {/* Connecting arc */}
                                                <svg width="16" height="24" viewBox="0 0 16 24" className="shrink-0" style={{ marginLeft: '-4px', marginRight: '-4px' }}>
                                                    <path
                                                        d="M 2 12 Q 8 12, 14 12"
                                                        stroke="#6b6da8"
                                                        strokeWidth="1.5"
                                                        fill="none"
                                                        opacity="0.4"
                                                    />
                                                </svg>
                                                <div className="flex flex-wrap gap-2">
                                                    {relatedThemes.map((theme, themeIndex) => {
                                                        const description = themeDescriptions[theme];
                                                        
                                                        const themeBadge = (
                                                            <span
                                                                key={themeIndex}
                                                                className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium cursor-help"
                                                                style={{
                                                                    backgroundColor: '#e9eaf9',
                                                                    color: '#6b6da8'
                                                                }}
                                                            >
                                                                {theme}
                                                            </span>
                                                        );
                                                        
                                                        // Wrap in tooltip if description exists
                                                        if (description) {
                                                            return (
                                                                <ModalTooltip 
                                                                    key={themeIndex}
                                                                    content={description}
                                                                    side="top"
                                                                    tooltipContainer={tooltipContainer}
                                                                >
                                                                    {themeBadge}
                                                                </ModalTooltip>
                                                            );
                                                        }
                                                        
                                                        return themeBadge;
                                                    })}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="mb-6">
                    <div className="mb-3 flex items-center gap-2">
                        <h3 className="text-xl font-roboto font-black text-[#333333] uppercase tracking-wide leading-normal">
                            Asset Funding
                        </h3>
                        {project.donorCountries && project.donorCountries.length > 0 && (
                            <span className="text-lg font-normal text-gray-500 tabular-nums">({project.donorCountries.length})</span>
                        )}
                    </div>
                    {project.donorCountries && project.donorCountries.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {project.donorCountries.map((country, index) => {
                                const projAgencies = projectAgenciesMap[project.id] || {};
                                return (
                                    <CountryBadge 
                                        key={index} 
                                        country={country} 
                                        onClick={onDonorClick}
                                        agencies={projAgencies[country]}
                                        tooltipContainer={tooltipContainer}
                                    />
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-gray-500">
                            No asset donor information available
                        </div>
                    )}
                </div>

                <div className="grow min-h-8"></div>

                <div className="border-t border-gray-200 pt-4 pb-4 mt-auto">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">NOTES</div>
                    <div className="text-xs text-gray-500 leading-snug space-y-1">
                        <div className="flex items-start">
                            <span className="text-gray-400 mr-2 shrink-0"></span>
                            <span>All insights are based on publicly accessible information and data.</span>
                        </div>
                        <div className="flex items-start">
                            <span className="text-gray-400 mr-2 shrink-0"></span>
                            <span>Project donor countries may differ from organization-level donor countries.</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <BaseModal
            isOpen={!!project}
            closeEventName="closeProjectModal"
            loading={loading}
            renderHeader={renderHeader}
            renderBody={renderBody}
        />
    );
}
