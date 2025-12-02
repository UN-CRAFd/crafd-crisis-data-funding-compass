'use client';

import { Check, Share2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CloseButton from './CloseButton';
import { CountryFlag } from './CountryFlag';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface BaseModalProps {
    isOpen: boolean;
    closeEventName: string; // e.g., 'closeOrganizationModal' or 'closeProjectModal'
    loading: boolean;
    renderHeader: (props: {
        showCopied: boolean;
        onShare: () => void;
        onClose: () => void;
    }) => React.ReactNode;
    renderBody: (props: {
        tooltipContainer?: Element | null;
    }) => React.ReactNode;
}

/**
 * BaseModal - Shared modal component for consistent styling, animations, gestures, and logic.
 * Handles:
 * - Slide-in/out animations
 * - Swipe-to-dismiss gestures
 * - Escape key handling
 * - Share functionality
 * - Body scroll lock
 * - Backdrop click-to-close
 */
export default function BaseModal({
    isOpen,
    closeEventName,
    loading,
    renderHeader,
    renderBody,
}: BaseModalProps): React.ReactElement {
    const [isVisible, setIsVisible] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const modalRef = useRef<HTMLDivElement>(null);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const [showCopied, setShowCopied] = useState(false);
    const [portalContainer, setPortalContainer] = useState<Element | null>(null);

    // Detect fullscreen element and set portal container
    useEffect(() => {
        const updatePortalContainer = () => {
            // If in fullscreen, portal into the fullscreen element
            // Otherwise, portal into document.body
            const fullscreenEl = document.fullscreenElement;
            setPortalContainer(fullscreenEl || document.body);
        };

        updatePortalContainer();
        
        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', updatePortalContainer);
        return () => document.removeEventListener('fullscreenchange', updatePortalContainer);
    }, []);

    // Animation state management
    useEffect(() => {
        if (isOpen) {
            const timer = setTimeout(() => setIsVisible(true), 100);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Reset visibility when modal closes
    useEffect(() => {
        if (!isOpen) {
            setIsVisible(false);
            setIsClosing(false);
        }
    }, [isOpen]);

    const handleClose = useCallback(() => {
        setIsClosing(true);
        setTimeout(() => {
            try {
                window.dispatchEvent(new CustomEvent(closeEventName));
            } catch (e) {
                console.error(`Failed to dispatch ${closeEventName} event`, e);
            }
        }, 300);
    }, [closeEventName]);

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

    // Share functionality
    const handleShare = async () => {
        try {
            const currentUrl = window.location.href;
            await navigator.clipboard.writeText(currentUrl);
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
            // Fallback for browsers that don't support clipboard API
            const textArea = document.createElement('textarea');
            textArea.value = window.location.href;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000);
        }
    };

    const modalContent = (
        <div
            className={`fixed inset-0 bg-black/50 flex items-center justify-end z-[200] transition-all duration-300 ease-out ${
                isVisible && !isClosing ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className={`relative w-full sm:w-3/5 md:w-[45%] lg:w-[37%] xl:w-[29%] sm:min-w-[435px] lg:min-w-[500px] xl:min-w-[550px] h-full bg-white shadow-2xl transition-transform duration-300 ease-out flex flex-col ${
                    isVisible && !isClosing ? 'translate-x-0' : 'translate-x-full'
                }`}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Header */}
                <div className={`px-6 sm:px-8 pt-4 sm:pt-6 pb-4 sm:pb-5 border-b border-gray-300 shrink-0 ${isOpen ? 'bg-white' : ''}`}>
                    {renderHeader({ showCopied, onShare: handleShare, onClose: handleClose })}
                </div>

                {/* Body Content - scrollable if content exceeds viewport */}
                <div className="overflow-y-auto flex-1">
                    {renderBody({ tooltipContainer: portalContainer })}
                </div>
            </div>
        </div>
    );

    // Portal the modal into the appropriate container (fullscreen element or body)
    // Wait for portalContainer to be set before rendering
    if (!portalContainer) {
        return <></>;
    }
    
    return createPortal(modalContent, portalContainer);
}

/**
 * Shared header component builder for modals.
 * Provides a consistent header layout with icon, title, share button, and close button.
 */
interface ModalHeaderProps {
    icon: React.ReactNode;
    title: string;
    showCopied: boolean;
    onShare: () => void;
    onClose: () => void;
    loading?: boolean;
}

export function ModalHeader({ icon, title, showCopied, onShare, onClose, loading }: ModalHeaderProps) {
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

    return (
        <div className="flex items-center justify-between gap-4">
            {/* Main title with icon - Responsive sizing */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                {icon}
                <h2 className="text-lg sm:text-xl md:text-xl lg:text-2xl font-bold text-[#333333] leading-tight font-roboto">
                    {title}
                </h2>
            </div>
            {/* Buttons container */}
            <div className="flex items-center gap-2 shrink-0">
                <button
                    onClick={onShare}
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
                <CloseButton onClick={onClose} absolute={false} />
            </div>
        </div>
    );
}

/**
 * Reusable country badge component with flag icon
 * Use in modals to display donor countries consistently
 */
interface CountryBadgeProps {
    country: string;
    className?: string;
    onClick?: (country: string) => void;
    agencies?: string[];
    tooltipContainer?: Element | null;
}

export function CountryBadge({ country, className = '', onClick, agencies, tooltipContainer }: CountryBadgeProps) {
    const isClickable = !!onClick;
    
    const badgeContent = (
        <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-slate-100 text-slate-600 ${
                isClickable ? 'cursor-pointer hover:bg-slate-200 transition-colors' : ''
            } ${className}`}
            onClick={isClickable ? () => onClick(country) : undefined}
        >
            <CountryFlag country={country} width={20} height={15} />
            <span>{country}</span>
        </span>
    );
    
    // If agencies are provided, wrap in tooltip
    if (agencies && agencies.length > 0) {
        return (
            <ModalTooltip
                content={
                    <div>
                        <div className="font-semibold mb-1">Financing Agencies:</div>
                        <ul className="space-y-0.5">
                            {agencies.map((agency, idx) => (
                                <li key={idx}>• {agency}</li>
                            ))}
                        </ul>
                    </div>
                }
                side="top"
                delayDuration={200}
                tooltipContainer={tooltipContainer}
            >
                {badgeContent}
            </ModalTooltip>
        );
    }
    
    return badgeContent;
}

/**
 * Reusable ModalTooltip component for consistent tooltip styling across all modals
 * Single unified style used everywhere for countries, types, themes, and info content
 */
interface ModalTooltipProps {
    children: React.ReactNode; // The element that triggers the tooltip
    content: React.ReactNode; // Tooltip content
    side?: 'left' | 'right' | 'top' | 'bottom';
    delayDuration?: number;
    tooltipContainer?: Element | null;
}

export function ModalTooltip({ 
    children, 
    content,
    side = 'top',
    delayDuration = 200,
    tooltipContainer 
}: ModalTooltipProps) {
    // If no content, just render children without tooltip
    if (!content) {
        return children;
    }
    
    return (
        <TooltipProvider delayDuration={delayDuration}>
            <Tooltip>
                <TooltipTrigger asChild>
                    {children}
                </TooltipTrigger>
                <TooltipContent 
                    side={side} 
                    className="max-w-xs p-2 text-xs bg-white border border-gray-300 !z-[9999]"
                    sideOffset={5}
                    container={tooltipContainer as HTMLElement | null}
                    style={{
                        backgroundColor: 'rgb(255, 255, 255)',
                        color: 'var(--tooltip-text)',
                        border: '1px solid var(--tooltip-border)',
                        opacity: 1,
                        zIndex: 9999
                    }}
                >
                    {content}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
