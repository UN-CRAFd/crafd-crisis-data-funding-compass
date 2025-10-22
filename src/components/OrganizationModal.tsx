'use client';

import { Building2, ExternalLink, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

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

import { Database } from 'lucide-react';
// Use i18n-iso-countries for robust country name -> alpha-2 mapping
import * as countries from 'i18n-iso-countries';
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
// Load JSON locale using require to avoid needing `resolveJsonModule` in tsconfig
let enLocale: any = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    enLocale = require('i18n-iso-countries/langs/en.json');
    countries.registerLocale(enLocale as unknown as import('i18n-iso-countries').LocaleData);
} catch (_e) {
    // If registration fails, we'll still attempt simple fallbacks below
    console.warn('Failed to register i18n-iso-countries locale', _e);
}

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
        focus:outline-none focus:bg-gray-400 focus:text-gray-100 flex-shrink-0
      "
            aria-label="Close modal"
            title="Close modal"
        >
            <X className="h-3 w-3" />
        </button>
    );
    // Reusable subheader component
    const SubHeader = ({ children }: { children: React.ReactNode }) => (
        <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-3 font-['Roboto']">{children}</h3>
    );

    // Reusable field label component
    const FieldLabel = ({ children }: { children: React.ReactNode }) => (
        <span className="font-medium text-gray-600 text-sm font-['Roboto']">{children}</span>
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
            <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl sm:text-2xl lg:text-2xl font-bold text-gray-900 leading-tight flex-1 font-['Roboto']">
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
        // Precompute HQ country block with proper type narrowing
        let hqCountryBlock: React.ReactNode = null;
        if (typeof fields['Org HQ Country'] === 'string' && String(fields['Org HQ Country']).length > 0) {
            hqCountryBlock = (() => {
                // Use i18n-iso-countries to resolve a best-effort alpha-2 code
                const getCountryAlpha2 = (input: unknown): string | null => {
                    if (input === null || input === undefined) return null;
                    let s = String(input).trim();
                    if (!s) return null;
                    // If already a 2-letter code
                    if (/^[A-Za-z]{2}$/.test(s)) return s.toLowerCase();
                    // Try parentheses like "Country (GB)"
                    const paren = s.match(/\(([^)]+)\)/);
                    if (paren) {
                        const code = paren[1].trim();
                        if (/^[A-Za-z]{2}$/.test(code)) return code.toLowerCase();
                    }
                    // Normalize (remove diacritics) and try direct lookup by name
                    try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { /* ignore */ }
                    // The library expects exact English names; try direct and comma-first variant
                    const direct = countries.getAlpha2Code(s, 'en');
                    if (direct) return direct.toLowerCase();
                    const commaFirst = s.split(',')[0].trim();
                    const commaLookup = countries.getAlpha2Code(commaFirst, 'en');
                    if (commaLookup) return commaLookup.toLowerCase();
                    // Last-resort: try lowercased simple variants (e.g., 'usa' -> 'US')
                    const alias = s.toLowerCase();
                    const knownAliases: Record<string, string> = {
                        'usa': 'us', 'us': 'us', 'u.s.': 'us', 'u.s.a.': 'us', 'uk': 'gb', 'u.k.': 'gb'
                    };
                    if (knownAliases[alias]) return knownAliases[alias];
                    return null;
                };

                const iso = getCountryAlpha2(fields['Org HQ Country']);
                const label = String(fields['Org HQ Country']);
                const src = iso ? `https://flagcdn.com/${iso}.svg` : `https://flagcdn.com/${encodeURIComponent(label.toLowerCase())}.svg`;
                return (
                    <Field label="Headquarters Country">
                        <div className="flex items-center gap-2">
                            {/* Flag image */}
                            <img
                                src={src}
                                alt={`${label} flag`}
                                width={32}
                                height={24}
                                className="rounded shadow border border-gray-200"
                            />
                            <FieldValue>{renderValue(String(fields['Org HQ Country']))}</FieldValue>
                        </div>
                    </Field>
                );
            })();
        }

        return (
            <div className="px-6 sm:px-8 pt-4 sm:pt-5 pb-6 sm:pb-8 space-y-6 font-['Roboto']">
                {/* Description (if present) */}
                {typeof fields['Org Description'] === 'string' && String(fields['Org Description']).length > 0 && (
                    <p className="text-gray-700 leading-normal text-base">{renderValue(String(fields['Org Description']))}</p>
                )}

                {/* Organization Type Bar */}
                <div
                    className="px-4 py-3 rounded-full bg-gray-100 border border-gray-200 mb-8"
                >
                    <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium text-gray-700">
                            Organization Type:
                        </span>
                        <span className="text-sm text-gray-900">
                            {orgType ? (renderValue(String(orgType)) ?? '') : <span className="text-gray-400">—</span>}
                        </span>
                    </div>
                </div>

                {/* Org HQ Country */}
                {hqCountryBlock as React.ReactNode}


                {/* Donor countries (if present) */}
                {fields['Org Donor Countries (based on Agency)'] && Array.isArray(fields['Org Donor Countries (based on Agency)']) ? (
                    <div>
                        <SubHeader>Funding</SubHeader>
                        <Field label="Organization Donor Countries">
                            <div className="space-y-2">
                                {(fields['Org Donor Countries (based on Agency)'] as unknown[]).map((country, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-gray-700">{String(country)}</span>
                                    </div>
                                ))}
                            </div>
                        </Field>
                    </div>
                ) : null}

                {/* Funding donors (donor countries as badges) */}
                {(() => {
                    const donorFieldCandidates = [
                        'Org Donor Countries (based on Agency)',
                        'Org Donor Countries (based on Agency) (from Provider Org Full Name)',
                        'Combined Donor Countries (Linked)',
                        'Combined Donor Countries (Linked) (from Provider Org Full Name)'
                    ];
                    const raw = donorFieldCandidates.map(k => fields[k]).find(Boolean) as unknown | undefined;
                    if (!raw) return null;

                    // split by comma but avoid splitting within parentheses or quotes
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

                    let donors: string[] = [];
                    if (Array.isArray(raw)) donors = (raw as unknown[]).map(r => String(r).trim()).filter(Boolean);
                    else if (typeof raw === 'string') donors = splitSafe(raw as string);

                    if (donors.length === 0) return null;

                    return (
                        <div>
                            <SubHeader>Funding donors</SubHeader>
                            <div className="flex flex-wrap gap-2">
                                {donors.map((d, i) => (
                                    <span key={i} className="inline-flex items-center px-3 py-1 rounded-full bg-[var(--brand-bg-light)] text-[var(--brand-primary-dark)] text-sm">
                                        {d}
                                    </span>
                                ))}
                            </div>
                        </div>
                    );
                })()}

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
                            .filter(Boolean);
                    } else if (typeof raw === 'string') {
                        // Split string into items; items might be IDs or names
                        projectsList = splitSafe(raw as string).map(s => (PROJECT_NAME_BY_ID[s] ? PROJECT_NAME_BY_ID[s] : s));
                    }

                    if (projectsList.length === 0) return null;

                    return (
                        <div className="mt-6">
                            <SubHeader>Projects funded</SubHeader>
                            <div className="flex flex-wrap gap-2">
                                {projectsList.map((p, i) => (
                                    <div key={i} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm">
                                        <Database className="w-4 h-4 text-gray-500" />
                                        <span className="truncate max-w-xs">{p}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })()}

                <div className="border-t border-gray-100 pt-4">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">NOTES</div>
                    <div className="text-xs text-gray-500 leading-snug space-y-1">
                        <div className="flex items-start">
                            <span className="text-gray-400 mr-2 flex-shrink-0">•</span>
                            <span>Data collected by the Complex Risk Analytics Fund (CRAF'd)</span>
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
                className={`w-full sm:w-2/3 md:w-1/2 lg:w-1/3 sm:min-w-[400px] lg:min-w-[500px] h-full bg-white shadow-2xl transition-transform duration-300 ease-out ${organization ? 'overflow-y-auto' : ''
                    } ${isVisible && !isClosing ? 'translate-x-0' : 'translate-x-full'}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Header */}
                <div className={`px-6 sm:px-8 pt-4 sm:pt-6 pb-2 sm:pb-3 border-b border-gray-300 ${organization ? 'sticky top-0 bg-white' : ''}`}>
                    {renderHeader()}
                </div>

                {/* Body Content */}
                {renderBody()}
            </div>
        </div>
    );
}
