'use client';

import { Building2, Check, ExternalLink, Package, Share2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrganizationWithProjects, ProjectData } from '../lib/data';
import { getIconForInvestmentType } from '@/config/investmentTypeIcons';
import CloseButton from './CloseButton';

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
    const [showCopied, setShowCopied] = useState(false);

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



    // Reusable subheader component - Major sections - smaller than main title
    const SubHeader = ({ children }: { children: React.ReactNode }) => (
        <h3 className="text-xl font-roboto font-black text-[#333333] mb-3 uppercase tracking-wide leading-normal">
            {children}
        </h3>
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

        if (!project) {
            return (
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-lg sm:text-xl font-bold text-[#333333] flex-1 font-roboto">Project Not Found</h2>
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

        return (
            <div className="flex items-center justify-between gap-4">
                {/* Main title with icon - Responsive sizing */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Package className="h-6 w-6 sm:h-7 sm:w-7 text-[#333333] shrink-0" />
                    <h2 className="text-lg sm:text-xl md:text-xl lg:text-2xl font-bold text-[#333333] leading-tight font-roboto">
                        {project.projectName}
                    </h2>
                </div>
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
                    <p className="text-base font-normal text-gray-700 leading-6 font-roboto mb-2">
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
                <div className="border-t border-gray-200 mt-4 mb-6"></div>

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

                {/* Asset Type - Investment Types */}
                {project.investmentTypes && project.investmentTypes.length > 0 && (
                    <div className="mb-6">
                        <SubHeader>Asset Type</SubHeader>
                        <div className="flex flex-wrap gap-2">
                            {project.investmentTypes.map((type, index) => {
                                const IconComponent = getIconForInvestmentType(type);
                                return (
                                    <span
                                        key={index}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold"
                                        style={{
                                            backgroundColor: 'var(--badge-other-bg)',
                                            color: 'var(--badge-other-text)'
                                        }}
                                    >
                                        <IconComponent className="w-4 h-4" />
                                        {type}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Asset Donors */}
                <div className="mb-6">
                    <div className="mb-3 flex items-center gap-2">
                        <h3 className="text-xl font-roboto font-black text-[#333333] uppercase tracking-wide leading-normal">
                            Asset Donors
                        </h3>
                        {project.donorCountries && project.donorCountries.length > 0 && (
                            <span className="text-lg font-normal text-gray-500 tabular-nums">({project.donorCountries.length})</span>
                        )}
                    </div>
                    {project.donorCountries && project.donorCountries.length > 0 ? (
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
                    ) : (
                        <div className="text-gray-500">
                            No asset donor information available
                        </div>
                    )}
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
                        <div className="flex items-start">
                            <span className="text-gray-400 mr-2 shrink-0">•</span>
                            <span>Project donor countries may differ from organization-level donor countries.</span>
                        </div>
                    </div>
                </div>
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
                <div className={`px-6 sm:px-8 pt-4 sm:pt-6 pb-4 sm:pb-5 border-b border-gray-300 ${project ? 'sticky top-0 bg-white z-10' : ''}`}>
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