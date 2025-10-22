'use client';

import { Building2, ExternalLink, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrganizationWithProjects, ProjectData } from '../lib/data';

interface ProjectModalProps {
    project: ProjectData | null;
    organizationName?: string; // Legacy prop, no longer used
    allOrganizations: OrganizationWithProjects[];
    // onClose removed because functions are non-serializable when passed through
    // Next.js client/server boundary. The modal will dispatch a CustomEvent when
    // it wants to close and the parent will listen for it.
    loading: boolean;
}

export default function ProjectModal({ project, allOrganizations, loading }: ProjectModalProps) {
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
        focus:outline-none focus:bg-gray-400 focus:text-gray-100 shrink-0 ml-4
      "
            aria-label="Close modal"
            title="Close modal"
        >
            <X className="h-3 w-3" />
        </button>
    );

    // Reusable subheader component - Major sections - smaller than main title
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
                    <h2 className="text-lg sm:text-xl font-bold text-[#333333] flex-1 pr-4 font-roboto">Project Not Found</h2>
                    <CloseButton />
                </div>
            );
        }

        return (
            <div className="flex items-start justify-between gap-8">
                {/* Main title - Responsive sizing */}
                <h2 className="text-lg sm:text-xl md:text-xl lg:text-2xl font-bold text-[#333333] leading-tight font-roboto">
                    {project.projectName}
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

        // Get project website for description inline link
        const projectWebsite = project.projectWebsite || project.website || '';

        return (
            <div className="px-6 sm:px-8 pt-4 sm:pt-5 pb-6 sm:pb-8 font-roboto flex flex-col h-full">
                {/* Description with inline Learn more link */}

                {project.projectDescription && (
                    <p className="text-base font-normal text-gray-700 leading-relaxed font-roboto mb-6">
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

                {/* If website exists but description didn't show it, render a prominent Website button */}
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

                {/* Separator line before metadata sections */}
                <div className="border-t border-gray-200 my-6"></div>

                {/* Provider Organizations */}
                {supportingOrganizations.length > 0 && (
                    <div className="mb-6">
                        <SubHeader>Provider Organizations</SubHeader>
                        <div className="flex flex-wrap gap-2">
                            {supportingOrganizations.map(org => (
                                <span
                                    key={org.id}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium"
                                    style={{
                                        backgroundColor: 'var(--brand-bg-light)',
                                        color: 'var(--brand-primary-dark)'
                                    }}
                                >
                                    <Building2 className="h-3.5 w-3.5" />
                                    {org.organizationName}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Asset Type */}
                <div className="mb-6">
                    <SubHeader>Asset Type</SubHeader>
                    <div className="space-y-4">
                        {/* CRAF'd Funding Status */}
                        {project.isCrafdFunded && (
                            <Field label="CRAF'd Funded">
                                <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${project.isCrafdFunded === 'YES' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                    {project.isCrafdFunded === 'YES' ? 'Yes' : 'No'}
                                </span>
                            </Field>
                        )}
                    </div>
                </div>

                {/* Product Donors */}
                {project.donorCountries && project.donorCountries.length > 0 && (
                    <div className="mb-6">
                        <div className="mb-3 flex items-center gap-2">
                            <h3 className="text-xl font-qanelas font-black text-[#333333] uppercase tracking-wide leading-normal">
                                Product Donors
                            </h3>
                            <span className="text-lg font-normal text-gray-500 tabular-nums">({project.donorCountries.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {project.donorCountries.map((country, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-slate-100 text-slate-600"
                                >
                                    {country}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            className={`fixed inset-0 bg-black/50 flex items-center justify-end z-50 transition-all duration-300 ease-out ${isVisible && !isClosing ? 'opacity-100' : 'opacity-0'}`}
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className={`w-full sm:w-3/5 md:w-[45%] lg:w-[37%] xl:w-[29%] sm:min-w-[435px] lg:min-w-[500px] xl:min-w-[550px] h-full bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${isVisible && !isClosing ? 'translate-x-0' : 'translate-x-full'}`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Header - Sticky at top during scroll */}
                <div className={`px-6 sm:px-8 pt-4 sm:pt-6 pb-2 sm:pb-3 border-b border-gray-300 ${project ? 'sticky top-0 bg-white z-10' : ''}`}>
                    {renderHeader()}
                </div>

                {/* Body - Scrollable content */}
                <div className="overflow-y-auto flex-1">
                    {renderBody()}
                </div>
            </div>
        </div>
    );
}