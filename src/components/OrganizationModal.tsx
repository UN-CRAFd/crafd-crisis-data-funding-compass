'use client';

import { Building2, Check, ChevronDown, ChevronUp, ExternalLink, Package, Share2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ModalOrganizationFocus from './ModalOrganizationFocus';
import CloseButton from './CloseButton';

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
}

// Import HeadquartersCountry component - comment out import to disable HQ display
// import HeadquartersCountry from './HeadquartersCountry';

export default function OrganizationModal({
    organization,
    projectNameMap = {},
    orgProjectsMap = {},
    orgDonorCountriesMap = {},
    loading
}: OrganizationModalProps): React.ReactElement {
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [showCopied, setShowCopied] = useState(false);
    // (fields is read from `organization` inside renderHeader/renderBody)

    // Animation state management
    useEffect(() => {
        if (organization) {
            const timer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(timer);
        }
    }, [organization]);

    // Reset visibility when modal closes
    useEffect(() => {
        if (!organization) {
            setIsVisible(false);
            setIsClosing(false);
        }
    }, [organization]);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            try {
                window.dispatchEvent(new CustomEvent('closeOrganizationModal'));
            } catch (e) {
                console.error('Failed to dispatch closeOrganizationModal event', e);
            }
        }, 300);
    }, []);

    // Close modal on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [handleClose]);

    // Swipe handling
    const minSwipeDistance = 50;
    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };
    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };
    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isRightSwipe = distance < -minSwipeDistance;
        if (isRightSwipe) {
            handleClose();
        }
    };

    // Prevent body scroll when modal is open while maintaining scrollbar space
    useEffect(() => {
        const originalOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        return () => {
            document.documentElement.style.overflow = originalOverflow;
        };
    }, []);

    // Handle click outside to close
    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };


    // Reusable subheader component - Major sections (Assets, Funding) - smaller than main title
    const SubHeader = ({ children }: { children: React.ReactNode }) => (
        <h3 className="text-xl font-qanelas font-black text-[#333333] mb-3 uppercase tracking-wide leading-normal">
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
    const renderHeader = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-between gap-4">
                    <div className="h-6 bg-gray-200 rounded w-48 animate-pulse flex-1"></div>
                    <div className="flex items-center gap-2 shrink-0">
                        <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse"></div>
                    </div>
                </div>
            );
        }

        if (!organization) {
            return (
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex-1">Organization Not Found</h2>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                setShowCopied(true);
                                setTimeout(() => setShowCopied(false), 2000);
                            }}
                            className={`flex items-center justify-center h-12 w-12 sm:h-10 sm:w-10 rounded-full sm:rounded-lg transition-all duration-200 ease-out touch-manipulation cursor-pointer focus:outline-none shrink-0 shadow-lg sm:shadow-none ${
                                showCopied
                                    ? 'text-white'
                                    : 'text-white bg-slate-600 hover:bg-slate-700 sm:text-gray-600 sm:bg-gray-200 sm:hover:bg-gray-400 sm:hover:text-gray-100 focus:bg-slate-700 sm:focus:bg-gray-400 sm:focus:text-gray-100'
                            }`}
                            style={showCopied ? { backgroundColor: 'var(--color-success)' } : {}}
                            aria-label="Share"
                            title="Share"
                        >
                            {showCopied ? (
                                <Check className="h-5 w-5 sm:h-4 sm:w-4" />
                            ) : (
                                <Share2 className="h-5 w-5 sm:h-4 sm:w-4" />
                            )}
                        </button>
                        <CloseButton onClick={handleClose} absolute={false} />
                    </div>
                </div>
            );
        }

        const fields = organization.fields || {};
        const displayName = (typeof fields['Org Full Name'] === 'string' && fields['Org Full Name'])
            || (typeof fields['Org Short Name'] === 'string' && fields['Org Short Name'])
            || organization.id;

        return (
            <div className="flex items-center justify-between gap-4">
                {/* Main title with icon - Responsive sizing */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Building2 className="h-6 w-6 sm:h-7 sm:w-7 text-[#333333] shrink-0" />
                    <h2 className="text-lg sm:text-xl md:text-xl lg:text-2xl font-bold text-[#333333] leading-tight font-roboto">
                        {displayName}
                    </h2>
                </div>
                {/* Buttons container */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(window.location.href);
                            setShowCopied(true);
                            setTimeout(() => setShowCopied(false), 2000);
                        }}
                        className={`flex items-center justify-center h-12 w-12 sm:h-10 sm:w-10 rounded-full sm:rounded-lg transition-all duration-200 ease-out touch-manipulation cursor-pointer focus:outline-none shrink-0 shadow-lg sm:shadow-none ${
                            showCopied
                                ? 'text-white'
                                : 'text-white bg-slate-600 hover:bg-slate-700 sm:text-gray-600 sm:bg-gray-200 sm:hover:bg-gray-400 sm:hover:text-gray-100 focus:bg-slate-700 sm:focus:bg-gray-400 sm:focus:text-gray-100'
                        }`}
                        style={showCopied ? { backgroundColor: 'var(--color-success)' } : {}}
                        aria-label="Share"
                        title="Share"
                    >
                        {showCopied ? (
                            <Check className="h-5 w-5 sm:h-4 sm:w-4" />
                        ) : (
                            <Share2 className="h-5 w-5 sm:h-4 sm:w-4" />
                        )}
                    </button>
                    <CloseButton onClick={handleClose} absolute={false} />
                </div>
            </div>
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

                        // Convert to array if needed
                        let projectsList: string[] = [];
                        if (Array.isArray(providedProjects)) {
                            // Array of project IDs - resolve to names using projectNameMap
                            projectsList = providedProjects
                                .map(id => String(id).trim())
                                .map(id => projectNameMap[id] || id)
                                .filter(Boolean)
                                .sort((a, b) => a.localeCompare(b));
                        }

                        if (projectsList.length === 0) return null;

                        const showCollapsible = projectsList.length > 5;
                        const [isExpanded, setIsExpanded] = useState(false);
                        const displayedProjects = showCollapsible && !isExpanded ? projectsList.slice(0, 5) : projectsList;

                        return (
                            <div>
                                <div className="mb-3 flex items-center gap-2">
                                    <h3 className="text-xl font-qanelas font-black text-[#333333] uppercase tracking-wide leading-normal">
                                        Provided Assets
                                    </h3>
                                    <span className="text-lg font-normal text-gray-500 tabular-nums">({projectsList.length})</span>
                                </div>
                                <div className="flex flex-col gap-2">
                                    {displayedProjects.map((projectName, i) => (
                                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-base font-medium bg-slate-100 text-slate-600">
                                            <Package className="w-4 h-4 text-slate-500" />
                                            <span className="truncate max-w-xs">{projectName}</span>
                                        </span>
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
                                    <h3 className="text-xl font-qanelas font-black text-[#333333] uppercase tracking-wide leading-normal">
                                        Organization Donors
                                    </h3>
                                    <span className="text-lg font-normal text-gray-500 tabular-nums">({donorCountries.length})</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {donorCountries.map((country) => (
                                        <span
                                            key={country}
                                            className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-slate-100 text-slate-600"
                                        >
                                            {country}
                                        </span>
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

    // Single modal wrapper with dynamic content
    return (
        <div
            className={`fixed inset-0 bg-black/50 flex items-center justify-end z-50 transition-all duration-300 ease-out ${isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
                }`}
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className={`relative w-full sm:w-3/5 md:w-[45%] lg:w-[37%] xl:w-[29%] sm:min-w-[435px] lg:min-w-[500px] xl:min-w-[550px] h-full bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${isVisible && !isClosing ? 'translate-x-0' : 'translate-x-full'}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Header */}
                <div className={`px-6 sm:px-8 pt-4 sm:pt-6 pb-4 sm:pb-5 border-b border-gray-300 shrink-0 ${organization ? 'bg-white' : ''}`}>
                    {renderHeader()}
                </div>

                {/* Body Content - scrollable if content exceeds viewport */}
                <div className="overflow-y-auto flex-1">
                    {renderBody()}
                </div>
            </div>
        </div>
    );
}
