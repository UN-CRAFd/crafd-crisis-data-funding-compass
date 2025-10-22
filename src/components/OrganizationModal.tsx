'use client';

import { ExternalLink, Folder, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ModalOrganizationFocus from './ModalOrganizationFocus';

interface OrganizationModalProps {
    // Accept the full organization record coming from `public/data/organizations-table.json`
    // Structure: { id: string; createdTime?: string; fields: Record<string, unknown> }
    organization: {
        id: string;
        createdTime?: string;
        fields: Record<string, unknown>;
    } | null;
    // onClose removed for serializability; modal will dispatch a CustomEvent 'closeOrganizationModal'
    loading: boolean;
}

// Import HeadquartersCountry component - comment out import to disable HQ display
// import HeadquartersCountry from './HeadquartersCountry';
// Load nested organizations so we can resolve project IDs to names when needed
import organizationsNestedRaw from '../../public/data/organizations-nested.json';

// Build a map from project id -> project name for quick lookup
const PROJECT_NAME_BY_ID: Record<string, string> = ((): Record<string, string> => {
    try {
        const map: Record<string, string> = {};
        const orgs: any[] = organizationsNestedRaw as any;
        orgs.forEach(org => {
            (org.projects || []).forEach((p: any) => {
                if (p && p.id) {
                    const name = (p.fields && (p.fields['Project/Product Name'] || p.fields['Project Name'])) || p.name || '';
                    map[p.id] = String(name || '').trim() || p.id;
                }
            });
        });
        return map;
    } catch (e) {
        return {};
    }
})();

// Build a map from organization id -> projects with investment types
const ORG_PROJECTS_MAP: Record<string, Array<{ investmentTypes: string[] }>> = ((): Record<string, Array<{ investmentTypes: string[] }>> => {
    try {
        const map: Record<string, Array<{ investmentTypes: string[] }>> = {};
        const orgs: any[] = organizationsNestedRaw as any;
        orgs.forEach(org => {
            if (org && org.id) {
                const projects = (org.projects || []).map((p: any) => {
                    const fields = p?.fields || {};
                    const investmentTypes = fields['Investment Type(s)'] || fields['Investment Types'] || [];
                    return {
                        investmentTypes: Array.isArray(investmentTypes) ? investmentTypes : []
                    };
                });
                map[org.id] = projects;
            }
        });
        return map;
    } catch (e) {
        return {};
    }
})();

export default function OrganizationModal({ organization, loading }: OrganizationModalProps): React.ReactElement {
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
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

    // Reusable close button component
    const CloseButton = () => (
        <button
            onClick={handleClose}
            className="
        flex items-center justify-center h-8 w-8 rounded-full
        transition-all duration-200 ease-out touch-manipulation
        text-gray-600 bg-gray-200 hover:bg-gray-400 hover:text-gray-100 cursor-pointer
        focus:outline-none focus:bg-gray-400 focus:text-gray-100 shrink-0 ml-4
      "
            aria-label="Close modal"
            title="Close modal"
        >
            <X className="h-3 w-3" />
        </button>
    );
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
                <div className="flex items-center justify-between">
                    <div className="h-6 bg-gray-200 rounded w-48 animate-pulse flex-1 mr-4"></div>
                    <CloseButton />
                </div>
            );
        }

        if (!organization) {
            return (
                <div className="flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex-1 pr-4">Organization Not Found</h2>
                    <CloseButton />
                </div>
            );
        }

        const fields = organization.fields || {};
        const displayName = (typeof fields['Org Full Name'] === 'string' && fields['Org Full Name'])
            || (typeof fields['Org Short Name'] === 'string' && fields['Org Short Name'])
            || organization.id;

        return (
            <div className="flex items-start justify-between gap-8">
                {/* Main title - Largest element in modal */}
                <h2 className="text-3xl font-bold text-[#333333] leading-tight font-roboto">
                    {displayName}
                </h2>
                <CloseButton />
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
                } catch (e) {
                    return <span className="text-gray-700">{String(val)}</span>;
                }
            }
            if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
                const s = String(val);
                if (s === '') return <span className="text-gray-500">—</span>;
                // If looks like a URL, render as link
                if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('mailto:') || s.startsWith('<http')) {
                    const cleaned = s.replace(/^<|>$/g, '');
                    return (
                        <a href={cleaned} target="_blank" rel="noopener noreferrer" className="text-[var(--brand-primary)] hover:underline">
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
        const orgShortName = (typeof fields['Org Short Name'] === 'string' && fields['Org Short Name'])
            || (typeof fields['Org Full Name'] === 'string' && fields['Org Full Name'])
            || '';

        // Extract organization type, handling both string and array formats
        const orgTypeRaw = fields['Org Type'];
        let orgType = '';
        if (typeof orgTypeRaw === 'string') {
            orgType = orgTypeRaw;
        } else if (Array.isArray(orgTypeRaw) && orgTypeRaw.length > 0) {
            orgType = orgTypeRaw[0];
        }

        return (
            <div className="px-6 sm:px-8 pt-4 sm:pt-5 pb-6 sm:pb-8 space-y-5 font-roboto flex flex-col h-full">
                {/* Description - Roboto Default (18px, Regular) for readable body text */}
                {typeof fields['Org Description'] === 'string' && String(fields['Org Description']).length > 0 && (
                    <p className="text-base font-normal text-[#333333] leading-relaxed font-roboto">
                        {renderValue(String(fields['Org Description']))}
                    </p>
                )}

                {/* Organization Type */}
                {orgType && (
                    <div>
                        {/* Field label - smaller than SubHeader, bigger than badge */}
                        <h4 className="text-base font-qanelas font-black text-[#333333] mb-2 uppercase tracking-wide leading-normal">
                            Organization Type
                        </h4>
                        {/* Badge - matching dashboard style but larger */}
                        <div className="inline-flex items-center px-2.5 py-1 rounded text-sm font-medium text-slate-500 bg-transparent border border-slate-200 font-roboto">
                            {orgType}
                        </div>
                    </div>
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
                                className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[var(--brand-primary)] text-white text-sm font-medium shadow hover:bg-[var(--brand-primary-dark)] transition-colors"
                            >
                                <ExternalLink className="w-4 h-4" />
                                <span className="flex items-center">Open Website</span>
                            </button>
                        </Field>
                    </div>
                )}

                {/* Metadata */}

                {/* Organization Focus - Investment Types from Projects */}
                {(() => {
                    const orgProjects = ORG_PROJECTS_MAP[organization.id];
                    if (!orgProjects || orgProjects.length === 0) return null;

                    return <ModalOrganizationFocus projects={orgProjects} SubHeader={SubHeader} />;
                })()}

                {/* Projects funded (as chips) */}
                {(() => {
                    const projectFieldCandidates = [
                        // Prefer a pre-resolved names field injected by the dashboard
                        'Provided Data Ecosystem Projects (Names)',
                        'Provided Data Ecosystem Projects',
                        'Provided Data Ecosystem Projects (Linked)',
                        'Linked Project(s)',
                        'From field: Linked Project(s)'
                    ];
                    const raw = projectFieldCandidates.map(k => fields[k]).find(Boolean) as unknown | undefined;
                    let projectsList: string[] = [];
                    // safe split that doesn't split commas inside quotes or parentheses
                    const splitSafe = (s: string) => {
                        const out: string[] = [];
                        let cur = '';
                        let depth = 0;
                        let inQuotes = false;
                        let quoteChar = '';
                        for (let i = 0; i < s.length; i++) {
                            const ch = s[i];
                            if ((ch === '"' || ch === "'") && !inQuotes) { inQuotes = true; quoteChar = ch; cur += ch; continue; }
                            if (ch === quoteChar && inQuotes) { inQuotes = false; quoteChar = ''; cur += ch; continue; }
                            if (ch === '(' && !inQuotes) { depth++; cur += ch; continue; }
                            if (ch === ')' && !inQuotes) { depth--; cur += ch; continue; }
                            if (ch === ',' && !inQuotes && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ''; continue; }
                            cur += ch;
                        }
                        if (cur.trim()) out.push(cur.trim());
                        return out.map(x => x.replace(/^"|"$/g, '').replace(/^'|'$/g, '').trim()).filter(Boolean);
                    };

                    if (Array.isArray(raw)) {
                        // If it's already an array of project names or IDs, map IDs to names when possible
                        projectsList = (raw as unknown[])
                            .map(r => String(r).trim())
                            .map(s => (PROJECT_NAME_BY_ID[s] ? PROJECT_NAME_BY_ID[s] : s))
                            .filter(Boolean)
                            .sort((a, b) => a.localeCompare(b)); // Sort alphabetically
                    } else if (typeof raw === 'string') {
                        // Split string into items; items might be IDs or names
                        projectsList = splitSafe(raw as string)
                            .map(s => (PROJECT_NAME_BY_ID[s] ? PROJECT_NAME_BY_ID[s] : s))
                            .sort((a, b) => a.localeCompare(b)); // Sort alphabetically
                    }

                    if (projectsList.length === 0) return null;

                    return (
                        <div className="mt-4">
                            <SubHeader>Provided Assets</SubHeader>
                            <div className="flex flex-col gap-2">
                                {projectsList.map((p, i) => (
                                    <span key={i} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-slate-100 text-slate-600">
                                        <Folder className="w-4 h-4 text-slate-500" />
                                        <span className="truncate max-w-xs">{p}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                {/* Organization Donors - Show all unique country badges */}
                {(() => {
                    // Get donor countries from the field - try multiple possible field names
                    const donorCountries = fields['Org Donor Countries (based on Agency)']
                        || fields['donor_countries']
                        || fields['Org Donor Countries']
                        || fields['Donor Countries'];

                    // Convert to array and ensure uniqueness
                    let donors: string[] = [];
                    if (Array.isArray(donorCountries)) {
                        // Use Set to ensure uniqueness, then sort alphabetically
                        const uniqueDonors = new Set(donorCountries.map(d => String(d).trim()).filter(Boolean));
                        donors = Array.from(uniqueDonors).sort();
                    }

                    if (donors.length === 0) return null;

                    return (
                        <div className="mt-4">
                            <SubHeader>Organization Donors</SubHeader>
                            <div className="flex flex-wrap gap-2">
                                {donors.map((country) => (
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

                {/* Flexible spacer to push notes to bottom */}
                <div className="flex-grow"></div>

                <div className="border-t border-gray-100 pt-4 mt-auto">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">NOTES</div>
                    <div className="text-xs text-gray-500 leading-snug space-y-1">
                        <div className="flex items-start">
                            <span className="text-gray-400 mr-2 flex-shrink-0">•</span>
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
                className={`w-full sm:w-2/3 md:w-1/2 lg:w-1/3 sm:min-w-[400px] lg:min-w-[500px] h-full bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${isVisible && !isClosing ? 'translate-x-0' : 'translate-x-full'}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Header */}
                <div className={`px-6 sm:px-8 pt-4 sm:pt-6 pb-2 sm:pb-3 border-b border-gray-300 shrink-0 ${organization ? 'bg-white' : ''}`}>
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
