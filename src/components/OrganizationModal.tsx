'use client';

import { Building2, ChevronDown, ChevronUp, ExternalLink, Package } from 'lucide-react';
import { useState } from 'react';
import ModalOrganizationFocus from './ModalOrganizationFocus';
import BaseModal, { ModalHeader, CountryBadge } from './BaseModal';

interface OrganizationModalProps {
    // Accept the full organization record coming from `public/data/organizations-table.json`
    // Structure: { id: string; createdTime?: string; fields: Record<string, unknown> }
    organization: {
        id: string;
        createdTime?: string;
        fields: Record<string, unknown>;
    } | null;
    // Centralized data maps from data.ts for consistent data access
    projectNameMap?: Record<string, string>;
    orgProjectsMap?: Record<string, Array<{ investmentTypes: string[] }>>;
    orgDonorCountriesMap?: Record<string, string[]>;
    // onClose removed for serializability; modal will dispatch a CustomEvent 'closeOrganizationModal'
    loading: boolean;
    // Callback to open project modal
    onOpenProjectModal?: (projectKey: string) => void;
    // Map from project ID to product_key for navigation
    projectIdToKeyMap?: Record<string, string>;
    // Callback when a donor is clicked
    onDonorClick?: (country: string) => void;
}

// Import HeadquartersCountry component - comment out import to disable HQ display
// import HeadquartersCountry from './HeadquartersCountry';

export default function OrganizationModal({
    organization,
    projectNameMap = {},
    orgProjectsMap = {},
    orgDonorCountriesMap = {},
    loading,
    onOpenProjectModal,
    projectIdToKeyMap = {},
    onDonorClick
}: OrganizationModalProps): React.ReactElement {

    // Reusable subheader component - Major sections (Assets, Funding) - smaller than main title
    const SubHeader = ({ children }: { children: React.ReactNode }) => (
        <h3 className="text-xl font-roboto font-black text-[#333333] mb-3 uppercase tracking-wide leading-normal">
            {children}
        </h3>
    );

    // Reusable field label component - Smallest text for labels
    const FieldLabel = ({ children }: { children: React.ReactNode }) => (
        <span className="font-medium text-[#333333] text-xs leading-5 font-roboto uppercase tracking-wide">{children}</span>
    );

    // Reusable field value wrapper component
    const FieldValue = ({ children }: { children: React.ReactNode }) => <div className="mt-0.5">{children}</div>;

    // Complete field component combining label and value
    const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <div>
            <FieldLabel>{label}</FieldLabel>
            <FieldValue>{children}</FieldValue>
        </div>
    );

    // Simple badge used for array values
    const Badge = ({ children }: { children: React.ReactNode }) => (
        <span
            className="inline-block px-3 py-1 rounded-full text-sm font-medium mr-1 mb-1"
            style={{
                backgroundColor: 'var(--brand-bg-light)',
                color: 'var(--brand-primary-dark)',
            }}
        >
            {children}
        </span>
    );

    const renderHeader = ({ showCopied, onShare, onClose }: { showCopied: boolean; onShare: () => void; onClose: () => void }) => {
        if (!organization) {
            return (
                <ModalHeader
                    icon={<Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-[#333333] shrink-0" />}
                    title="Organization Not Found"
                    showCopied={showCopied}
                    onShare={onShare}
                    onClose={onClose}
                    loading={loading}
                />
            );
        }

        const fields = organization.fields || {};
        const displayName = (typeof fields['Org Full Name'] === 'string' && fields['Org Full Name'])
            || (typeof fields['Org Short Name'] === 'string' && fields['Org Short Name'])
            || organization.id;

        // Get org_key for logo lookup
        const orgKey = typeof fields['org_key'] === 'string' ? fields['org_key'] : '';

        // Try to load organization logo (supports png, jpg, svg, webp)
        const [logoError, setLogoError] = useState(false);
        const logoExtensions = ['png', 'jpg', 'svg', 'webp'];
        
        // Determine icon to use
        let icon: React.ReactNode;
        if (orgKey && !logoError) {
            // Try to use organization logo - will fallback on error
            const logoSrc = `/logos/${orgKey}.png`; // Default to png, but onError will try others
            icon = (
                <img 
                    src={logoSrc} 
                    alt={`${displayName} logo`}
                    className="h-6 w-6 sm:h-10 sm:w-10 shrink-0 object-contain"
                    onError={(e) => {
                        // Try other extensions
                        const currentSrc = (e.target as HTMLImageElement).src;
                        const currentExt = currentSrc.split('.').pop()?.split('?')[0];
                        const currentIndex = logoExtensions.indexOf(currentExt || '');
                        
                        if (currentIndex !== -1 && currentIndex < logoExtensions.length - 1) {
                            // Try next extension
                            (e.target as HTMLImageElement).src = `/logos/${orgKey}.${logoExtensions[currentIndex + 1]}`;
                        } else {
                            // All extensions failed, use fallback
                            setLogoError(true);
                        }
                    }}
                />
            );
        } else {

            icon = (
                <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-[#333333] shrink-0" />
            );
        }

        return (
            <ModalHeader
                icon={icon}
                title={displayName}
                showCopied={showCopied}
                onShare={onShare}
                onClose={onClose}
                loading={loading}
            />
        );
    };

    // Render body content based on state
    const renderBody = (): React.ReactNode => {
        if (loading) {
            return (
                <div className="p-4 sm:p-6 space-y-4">
                    <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                </div>
            );
        }

        if (!organization) {
            return (
                <div className="p-4 sm:p-6">
                    <p className="text-gray-600">The requested organization could not be found.</p>
                </div>
            );
        }

        // If the caller provided a raw fields object (from organizations-table.json), render all keys
        const fields = organization.fields || {};

        // Helper to render a single field value nicely
        const renderValue = (val: unknown): React.ReactNode => {
            if (val === null || val === undefined) return <span className="text-gray-500">—</span>;
            if (Array.isArray(val)) {
                return (
                    <div className="flex flex-wrap gap-1">
                        {val.map((v, i) => (
                            <Badge key={i}>{String(v)}</Badge>
                        ))}
                    </div>
                );
            }
            if (typeof val === 'object') {
                try {
                    return <pre className="text-xs text-gray-700 whitespace-pre-wrap">{JSON.stringify(val, null, 2)}</pre>;
                } catch {
                    return <span className="text-gray-700">{String(val)}</span>;
                }
            }
            if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                const s = String(val);
                if (s === '') return <span className="text-gray-500">—</span>;
                // If looks like a URL, render as link
                if (s.startsWith('http://') || s.startsWith('https://')) {
                    const cleaned = s.replace(/^<|>$/g, '');
                    return (
                        <a href={cleaned} target="_blank" rel="noopener noreferrer" className="text-(--brand-primary) hover:underline">
                            {cleaned}
                        </a>
                    );
                }
                return <span className="text-gray-700 whitespace-pre-wrap">{s}</span>;
            }
            // Fallback for any other type
            return <span className="text-gray-700 whitespace-pre-wrap">{String(val)}</span>;
        };

        // Curated display: only show selected important fields
        const WEBSITE_KEYS = ['Org Website', 'Org Website (URL)', 'Org Website Url', 'Org Website URL'];
        const websiteKey = WEBSITE_KEYS.find((k) => typeof fields[k] === 'string' && fields[k]);
        const websiteValue: string | null = websiteKey ? String(fields[websiteKey]) : null;

        // Extract organization type, handling both string and array formats
        const orgTypeRaw = fields['Org Type'];
        let orgType = '';
        if (typeof orgTypeRaw === 'string') {
            orgType = orgTypeRaw;
        } else if (Array.isArray(orgTypeRaw) && orgTypeRaw.length > 0) {
            orgType = orgTypeRaw[0];
        }

        return (
            <div className="px-6 sm:px-8 pt-4 sm:pt-5 pb-6 sm:pb-8 font-roboto flex flex-col h-full">
                {/* Organization Type Badge */}
                {orgType && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-slate-100 text-slate-600 w-fit mb-4">
                        {orgType}
                    </span>
                )}

                {/* Description with inline Learn more link */}
                {typeof fields['Org Description'] === 'string' && String(fields['Org Description']).length > 0 && (
                    <p className="text-base font-normal text-gray-700 leading-relaxed font-roboto">
                        {String(fields['Org Description'])}
                        {websiteValue && websiteValue.trim() !== '' && (
                            <>
                                {' '}
                                <a
                                    href={websiteValue.replace(/^<|>$/g, '')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-semibold transition-colors underline underline-offset-2 whitespace-nowrap align-baseline"
                                    style={{ color: 'var(--brand-primary)' }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-primary-dark)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--brand-primary)'}
                                >
                                    Learn more
                                    <ExternalLink className="w-3.5 h-3.5 inline-block align-text-bottom ml-0.5" />
                                </a>
                            </>
                        )}
                    </p>
                )}

                {/* HDX Organization Link Button */}
                {(() => {
                    const hdxOrgKey = fields['HDX Org Key'];
                    if (typeof hdxOrgKey === 'string' && hdxOrgKey.trim() !== '') {
                        const hdxUrl = `https://data.humdata.org/organization/${hdxOrgKey.trim()}`;
                        return (
                            <div className="mt-3">
                                <a
                                    href={hdxUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-slate-100 text-slate-600 border border-slate-200 hover:border-slate-400 hover:bg-slate-200 transition-colors"
                                    aria-label="View on HDX (opens in new tab)"
                                >
                                    <img src="/hdx_logo.png" alt="HDX logo" className="w-5 h-5 rounded-none" />
                                    <span className="font-normal">View on <strong className="font-bold">HDX</strong></span>
                                    
                                </a>
                            </div>
                        );
                    }
                    return null;
                })()}

                {/* Org HQ Country - Uncomment import and this line to enable */}
                {/* {typeof fields['Org HQ Country'] === 'string' && (
                    <HeadquartersCountry 
                        countryValue={String(fields['Org HQ Country'])} 
                        Field={Field}
                        FieldValue={FieldValue}
                        renderValue={renderValue}
                    />
                )} */}

                {/* If website exists but description didn't show it, render a prominent Website button */}
                {!fields['Org Description'] && websiteValue && websiteValue.trim() !== '' && (
                    <div>
                        <Field label="Website">
                            <button
                                type="button"
                                onClick={() => {
                                    const cleaned = websiteValue.replace(/^<|>$/g, '');
                                    window.open(cleaned, '_blank', 'noopener,noreferrer');
                                }}
                                className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-(--brand-primary) text-white text-sm font-medium shadow hover:bg-(--brand-primary-dark) transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span className="flex items-center">Open Website</span>
                            </button>
                        </Field>
                    </div>
                )}

                {/* Separator line before metadata sections */}
                <div className="border-t border-gray-200 mt-8 mb-4"></div>

                {/* Metadata - Single column layout */}
                <div className="space-y-8">
                    {/* Organization Focus - Investment Types from Projects */}
                    {(() => {
                        const orgProjects = orgProjectsMap[organization.id];
                        if (!orgProjects || orgProjects.length === 0) return null;

                        return <ModalOrganizationFocus projects={orgProjects} SubHeader={SubHeader} />;
                    })()}

                    {/* Provided Assets - Simple field access matching FIELDS_ORGANIZATIONS */}
                    {(() => {
                        // Use the clean field name from FIELDS_ORGANIZATIONS: "Provided Data Ecosystem Projects"
                        const providedProjects = fields['Provided Data Ecosystem Projects'];

                        if (!providedProjects || (Array.isArray(providedProjects) && providedProjects.length === 0)) {
                            return null;
                        }

                        // Convert to array if needed - keep both IDs and names
                        let projectsList: Array<{ id: string; name: string; productKey: string }> = [];
                        if (Array.isArray(providedProjects)) {
                            // Array of project IDs - resolve to names and product keys
                            projectsList = providedProjects
                                .map(id => String(id).trim())
                                .map(id => ({
                                    id,
                                    name: projectNameMap[id] || id,
                                    productKey: projectIdToKeyMap[id] || id
                                }))
                                .filter(p => p.name)
                                .sort((a, b) => a.name.localeCompare(b.name));
                        }

                        if (projectsList.length === 0) return null;

                        const showCollapsible = projectsList.length > 5;
                        const [isExpanded, setIsExpanded] = useState(false);
                        const displayedProjects = showCollapsible && !isExpanded ? projectsList.slice(0, 5) : projectsList;

                        return (
                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <h3 className="text-xl font-roboto font-black text-[#333333] uppercase tracking-wide leading-normal">
                                        Provided Assets
                                    </h3>
                                    <span className="text-lg font-normal text-gray-500 tabular-nums">({projectsList.length})</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {displayedProjects.map((proj, i) => (
                                        <button
                                            key={i}
                                            onClick={() => onOpenProjectModal?.(proj.productKey)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-base font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer text-left"
                                        >
                                            <Package className="w-4 h-4 text-slate-500 shrink-0" />
                                            <span className="truncate max-w-xs">{proj.name}</span>
                                        </button>
                                    ))}
                                </div>
                                {showCollapsible && (
                                    <button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
                                    >
                                        {isExpanded ? (
                                            <>
                                                <ChevronUp className="w-4 h-4" />
                                                <span>Show less</span>
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="w-4 h-4" />
                                                <span>Show {projectsList.length - 5} more</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        );
                    })()}

                    {/* Organization Donors - Clean field access from centralized data */}
                    {(() => {
                        // Get donor countries from the centralized map (computed from nested data)
                        const donorCountries = orgDonorCountriesMap[organization.id] || [];

                        if (donorCountries.length === 0) return null;

                        return (
                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <h3 className="text-xl font-roboto font-black text-[#333333] uppercase tracking-wide leading-normal">
                                        Organization Donors
                                    </h3>
                                    <span className="text-lg font-normal text-gray-500 tabular-nums">({donorCountries.length})</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {donorCountries.map((country) => (
                                        <CountryBadge key={country} country={country} onClick={onDonorClick} />
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>

                {/* Flexible spacer to push notes to bottom */}
                <div className="grow min-h-8"></div>

                <div className="border-t border-gray-200 pt-4 pb-4 mt-auto">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">NOTES</div>
                    <div className="text-xs text-gray-500 leading-snug space-y-1">
                        <div className="flex items-start">
                            <span className="text-gray-400 mr-2 shrink-0">•</span>
                            <span>All insights are based on publicly accessible information and data.</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <BaseModal
            isOpen={!!organization}
            closeEventName="closeOrganizationModal"
            loading={loading}
            renderHeader={renderHeader}
            renderBody={renderBody}
        />
    );
}
