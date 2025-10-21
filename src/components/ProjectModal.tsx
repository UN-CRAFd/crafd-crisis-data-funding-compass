'use client';

import type { ProjectData, OrganizationWithProjects } from '../lib/data';
import { Building2, DollarSign, ExternalLink, MapPin, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface ProjectModalProps {
    project: ProjectData | null;
    organizationName: string;
    allOrganizations: OrganizationWithProjects[];
    // onClose removed because functions are non-serializable when passed through
    // Next.js client/server boundary. The modal will dispatch a CustomEvent when
    // it wants to close and the parent will listen for it.
    loading: boolean;
}

export default function ProjectModal({ project, organizationName, allOrganizations, loading }: ProjectModalProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    // Animation state management
    useEffect(() => {
        if (project) {
            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(timer);
        }
    }, [project]);

    // Reset visibility when modal closes
    useEffect(() => {
        if (!project) {
            setIsVisible(false);
            setIsClosing(false);
        }
    }, [project]);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        // Wait for exit animation before actually closing
        setTimeout(() => {
            // Dispatch a custom event to notify any parent that the modal should close.
            // Parent components should listen for "closeProjectModal" and clear selected state.
            try {
                window.dispatchEvent(new CustomEvent('closeProjectModal'));
            } catch (e) {
                // Fallback: if CustomEvent is not allowed for some reason, just noop
                console.error('Failed to dispatch closeProjectModal event', e);
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

        // Close on right swipe (swipe to dismiss)
        if (isRightSwipe) {
            handleClose();
        }
    };

    // Prevent body scroll when modal is open while maintaining scrollbar space
    useEffect(() => {
        // Store original values
        const originalOverflow = document.documentElement.style.overflow;

        // Prevent scrolling on the html element instead of body to preserve scrollbar
        document.documentElement.style.overflow = 'hidden';

        return () => {
            // Restore original values
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

    // Reusable badge/chip component
    const Badge = ({ children }: { children: React.ReactNode }) => (
        <span
            className="inline-block px-3 py-1 rounded-full text-sm font-medium mr-1 mb-1"
            style={{
                backgroundColor: 'var(--brand-bg-light)',
                color: 'var(--brand-primary-dark)'
            }}
        >
            {children}
        </span>
    );

    const BadgeIndigo = ({ children }: { children: React.ReactNode }) => (
        <span
            className="inline-block px-3 py-1 rounded-md text-sm font-medium mr-1 mb-1"
            style={{
                backgroundColor: 'var(--badge-other-bg)',
                color: 'var(--badge-other-text)'
            }}
        >
            {children}
        </span>
    );

    // Reusable field value wrapper component
    const FieldValue = ({ children }: { children: React.ReactNode }) => (
        <div className="mt-0.5">{children}</div>
    );

    // Complete field component combining label and value
    const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
        <div>
            <FieldLabel>{label}</FieldLabel>
            <FieldValue>{children}</FieldValue>
        </div>
    );

    // Render header content based on state
    const renderHeader = () => {
        if (loading) {
            return (
                <div className="flex items-center justify-between">
                    <div className="h-6 bg-gray-200 rounded w-48 animate-pulse flex-1 mr-4"></div>
                    <CloseButton />
                </div>
            );
        }

        if (!project) {
            return (
                <div className="flex items-center justify-between">
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 flex-1 pr-4">Project Not Found</h2>
                    <CloseButton />
                </div>
            );
        }

        return (
            <div className="flex items-start justify-between gap-4">
                <h2 className="text-xl sm:text-2xl lg:text-2xl font-bold text-gray-900 leading-tight flex-1 font-['Roboto']">
                    {project.projectName}
                </h2>
                <CloseButton />
            </div>
        );
    };

    // Render body content based on state
    const renderBody = () => {
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

        // Find all organizations that support this project
        const supportingOrganizations = allOrganizations.filter(org => 
            org.projects.some(p => p.id === project.id)
        );

        // Full project content
        return (
            <div className="px-6 sm:px-8 pt-4 sm:pt-5 pb-6 sm:pb-8 space-y-6 font-['Roboto']">
                {/* Supporting Organizations */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Building2 className="h-4 w-4" style={{ color: 'var(--brand-primary)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--brand-primary-dark)' }}>
                            Supporting Organizations ({supportingOrganizations.length})
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {supportingOrganizations.map((org) => (
                            <button
                                key={org.id}
                                onClick={() => {
                                    // Dispatch event to open organization modal
                                    window.dispatchEvent(new CustomEvent('openOrganizationModal', { 
                                        detail: { organization: org } 
                                    }));
                                }}
                                className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 transition-colors text-left"
                                style={{ borderColor: 'var(--brand-border)' }}
                            >
                                <div className="text-sm font-medium text-gray-900">{org.organizationName}</div>
                                <div className="text-xs text-gray-500">{org.type}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* CRAF&apos;d Funding Status */}
                {project.isCrafdFunded && (
                    <div className={`px-4 py-3 rounded-lg border ${project.isCrafdFunded === 'YES'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                        <div className="flex items-center gap-2">
                            <DollarSign className={`h-4 w-4 ${project.isCrafdFunded === 'YES' ? 'text-green-600' : 'text-gray-600'
                                }`} />
                            <span className={`text-sm font-medium ${project.isCrafdFunded === 'YES' ? 'text-green-800' : 'text-gray-800'
                                }`}>
                                CRAF&apos;d Funded: {project.isCrafdFunded}
                            </span>
                        </div>
                    </div>
                )}

                {/* Project Description */}
                {project.projectDescription && (
                    <div>
                        <SubHeader>Description</SubHeader>
                        <p className="text-gray-700 leading-relaxed text-sm">{project.projectDescription}</p>
                        {/* Project Website */}
                        {project.projectWebsite && (
                            <Field label="Website">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (typeof project.projectWebsite === 'string') {
                                            window.open(project.projectWebsite, '_blank', 'noopener,noreferrer');
                                        }
                                    }}
                                    className="mt-5 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-[var(--brand-primary)] text-white text-sm font-small shadow hover:bg-[var(--brand-primary-dark)] transition-colors"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    <span className="flex items-center">Open Website</span>
                                </button>
                            </Field>
                        )}
                    </div>


                )}


                {/* Investment Types */}
                {project.investmentTypes && project.investmentTypes.length > 0 && (
                    <div>
                        <SubHeader>Investment Category</SubHeader>
                        <Field label="Types">
                            <div className="mt-1 flex flex-wrap">
                                {project.investmentTypes.map((type, index) => (
                                    <BadgeIndigo key={index}>{type}</BadgeIndigo>
                                ))}
                            </div>
                        </Field>
                        <Field label="Themes">
                            <div className="mt-1 flex flex-wrap">
                                {project.investmentThemes.map((theme, index) => (
                                    <BadgeIndigo key={index}>{theme}</BadgeIndigo>
                                ))}
                            </div>
                        </Field>
                    </div>
                )}

                {/* Donor Countries */}
                {project.donorCountries && project.donorCountries.length > 0 ? (
                    <div>
                        <SubHeader>Funding</SubHeader>
                        <Field label="Product Donors">
                            <div className="space-y-2">
                                {project.donorCountries.map((country, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-gray-500" />
                                        <span className="text-gray-700">{country}</span>
                                    </div>
                                ))}
                            </div>
                        </Field>
                    </div>
                ) : (
                    <div>
                        <SubHeader>Funding</SubHeader>
                        <Field label="Product Donors">
                            <span className="text-gray-500 text-sm">No specific project donor countries specified</span>
                        </Field>
                    </div>
                )}

                {/* Metadata */}
                <div className="border-t border-gray-100 pt-4">
                    <div className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2">Data Source</div>
                    <div className="text-xs text-gray-500 leading-snug space-y-1">
                        <div className="flex items-start">
                            <span className="text-gray-400 mr-2 flex-shrink-0">•</span>
                            <span>Data gathered by the Complex Risk Analytics Fund (CRAF&apos;d)</span>
                        </div>
                        <div className="flex items-start">
                            <span className="text-gray-400 mr-2 flex-shrink-0">•</span>
                            <span>Project donor countries may differ from organization-level donor countries</span>
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
                className={`w-full sm:w-2/3 md:w-1/2 lg:w-1/3 sm:min-w-[400px] lg:min-w-[500px] h-full bg-white shadow-2xl transition-transform duration-300 ease-out ${project ? 'overflow-y-auto' : ''
                    } ${isVisible && !isClosing ? 'translate-x-0' : 'translate-x-full'}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Header */}
                <div className={`px-6 sm:px-8 pt-4 sm:pt-6 pb-2 sm:pb-3 border-b border-gray-300 ${project ? 'sticky top-0 bg-white' : ''}`}>
                    {renderHeader()}
                </div>

                {/* Body Content */}
                {renderBody()}
            </div>
        </div>
    );
}