"use client";

import { Check, Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import CloseButton from "./CloseButton";
import { CountryFlag } from "./CountryFlag";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTips } from "@/contexts/TipsContext";
import labels from "@/config/labels.json";

interface BaseModalProps {
  isOpen: boolean;
  closeEventName: string; // e.g., 'closeOrganizationModal' or 'closeProjectModal'
  loading: boolean;
  renderHeader: (props: {
    showCopied: boolean;
    onShare: () => void;
    onClose: () => void;
  }) => React.ReactNode;
  renderBody: (props: { tooltipContainer?: Element | null }) => React.ReactNode;
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
    document.addEventListener("fullscreenchange", updatePortalContainer);
    return () =>
      document.removeEventListener("fullscreenchange", updatePortalContainer);
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
      if (e.key === "Escape") {
        handleClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
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
    document.documentElement.style.overflow = "hidden";
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
      console.error("Failed to copy to clipboard:", err);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const modalContent = (
    <div
      className={`fixed inset-0 z-[200] flex items-center justify-end bg-black/50 transition-all duration-300 ease-out ${
        isVisible && !isClosing ? "opacity-100" : "opacity-0"
      }`}
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className={`relative flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:w-3/5 sm:min-w-[435px] md:w-[45%] lg:w-[37%] lg:min-w-[500px] xl:w-[29%] xl:min-w-[550px] ${
          isVisible && !isClosing ? "translate-x-0" : "translate-x-full"
        }`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div
          className={`shrink-0 border-b border-gray-300 px-6 pt-4 pb-4 sm:px-8 sm:pt-6 sm:pb-5 ${isOpen ? "bg-white" : ""}`}
        >
          {renderHeader({
            showCopied,
            onShare: handleShare,
            onClose: handleClose,
          })}
        </div>

        {/* Body Content - scrollable if content exceeds viewport */}
        <div className="scrollbar-hide flex-1 overflow-y-auto">
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
  subtitle?: React.ReactNode;
}

export function ModalHeader({
  icon,
  title,
  showCopied,
  onShare,
  onClose,
  loading,
  subtitle,
}: ModalHeaderProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="h-6 w-48 flex-1 animate-pulse rounded bg-gray-200"></div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200"></div>
          <div className="h-10 w-20 animate-pulse rounded-lg bg-gray-200"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-4">
      {/* Main title with icon - Responsive sizing */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {icon}
        <div className="min-w-0 flex-1">
          <h2 className="font-roboto text-lg leading-tight font-bold text-[#333333] sm:text-xl md:text-xl lg:text-2xl">
            {title}
          </h2>
          {subtitle && <div className="mt-1">{subtitle}</div>}
        </div>
      </div>
      {/* Buttons container */}
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onShare}
          className={`flex h-12 w-12 shrink-0 cursor-pointer touch-manipulation items-center justify-center rounded-full transition-all duration-200 ease-out focus:outline-none sm:h-10 sm:w-10 sm:rounded-lg ${
            showCopied
              ? "bg-[#10b981] text-white shadow-lg hover:bg-[#059669] focus:bg-[#059669] sm:bg-[#10b981] sm:text-white sm:shadow-none sm:hover:bg-[#059669] sm:hover:text-white sm:focus:bg-[#059669] sm:focus:text-white"
              : "bg-slate-600 text-white shadow-lg hover:bg-slate-700 focus:bg-slate-700 sm:bg-gray-200 sm:text-gray-600 sm:shadow-none sm:hover:bg-gray-400 sm:hover:text-gray-100 sm:focus:bg-gray-400 sm:focus:text-gray-100"
          }`}
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
  projectsForDonor?: string[];
  projectAgenciesForDonor?: string[];
  tooltipContainer?: Element | null;
  isMemberState?: boolean;
}

export function CountryBadge({
  country,
  className = "",
  onClick,
  agencies,
  projectsForDonor,
  projectAgenciesForDonor,
  tooltipContainer,
  isMemberState = false,
}: CountryBadgeProps) {
  const isClickable = !!onClick;

  const badgeContent = (
    <div className="inline-flex items-center gap-2">
      <span
        className={`inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 ${
          isClickable
            ? "cursor-pointer transition-colors hover:bg-slate-200"
            : ""
        } ${className}`}
        onClick={isClickable ? () => onClick(country) : undefined}
      >
        <CountryFlag country={country} width={20} height={15} />
        <span>{country}</span>
      </span>
    </div>
  );

  // Filter out "Unspecified Agency"
  const filteredAgencies = agencies
    ? agencies.filter((agency) => agency !== "Unspecified Agency")
    : [];
  const hasAgencies = filteredAgencies && filteredAgencies.length > 0;
  const hasProjects = projectsForDonor && projectsForDonor.length > 0;
  const hasProjectAgencies =
    projectAgenciesForDonor && projectAgenciesForDonor.length > 0;

  if (hasAgencies || hasProjects || hasProjectAgencies) {
    const tooltipContent = (
      <div>
        {hasAgencies && (
          <div>
            <div className="mb-1 font-semibold">
              {labels.modals.financingAgencies}
            </div>
            <ul className="space-y-0.5">
              {filteredAgencies.map((agency, idx) => (
                <li key={idx}>• {agency}</li>
              ))}
            </ul>
          </div>
        )}
        {hasProjects && (
          <div
            className={hasAgencies ? "mt-2 border-t border-slate-300 pt-2" : ""}
          >
            <div className="mb-1 font-semibold">Projects funded:</div>
            <ul className="space-y-0.5">
              {projectsForDonor.map((project, idx) => (
                <li key={idx}>• {project}</li>
              ))}
            </ul>
          </div>
        )}
        {hasProjectAgencies && (
          <div
            className={
              hasAgencies || hasProjects
                ? "mt-2 border-t border-slate-300 pt-2"
                : ""
            }
          >
            <div className="mb-1 font-semibold">
              {labels.modals.financingAgencies}
            </div>
            <ul className="space-y-0.5">
              {projectAgenciesForDonor.map((agency, idx) => (
                <li key={idx}>• {agency}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );

    return (
      <ModalTooltip
        content={tooltipContent}
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
  side?: "left" | "right" | "top" | "bottom";
  delayDuration?: number;
  tooltipContainer?: Element | null;
}

export function ModalTooltip({
  children,
  content,
  side = "top",
  delayDuration = 200,
  tooltipContainer,
}: ModalTooltipProps) {
  // Get tips enabled state with fallback for SSR
  let tipsEnabled = false;
  try {
    const tipsContext = useTips();
    tipsEnabled = tipsContext.tipsEnabled;
  } catch (e) {
    // TipsProvider not available (e.g., during server-side rendering)
    tipsEnabled = false;
  }

  // If tips are disabled or no content, just render children without tooltip
  if (!tipsEnabled || !content) {
    return children;
  }

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          className="!z-[9999] max-h-[80vh] max-w-[90vw] overflow-auto border border-gray-300 bg-white p-2 text-xs"
          sideOffset={5}
          container={tooltipContainer as HTMLElement | null}
          style={{
            backgroundColor: "rgb(255, 255, 255)",
            color: "var(--tooltip-text)",
            border: "1px solid var(--tooltip-border)",
            opacity: 1,
            zIndex: 9999,
            overflow: "auto",
            maxWidth: "90vw",
            maxHeight: "80vh",
            boxSizing: "border-box",
          }}
        >
          {content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
