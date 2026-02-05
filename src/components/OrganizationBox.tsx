import React, { useState, useMemo, useCallback, memo } from "react";
import { ChevronDown, ChevronRight, Building2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

// Constants moved outside component to prevent recreation on each render
const LOGO_EXTENSIONS = ["png", "jpg", "svg", "webp"] as const;

// Type definitions for better type safety
interface NestedOrganization {
  id: string;
  fields?: {
    org_key?: string;
    [key: string]: unknown;
  };
}

interface OrganizationTableRecord {
  id: string;
  createdTime?: string;
  fields: Record<string, unknown>;
}

interface OrganizationBoxProps {
  orgId: string;
  organizationName: string;
  nestedOrganizations: NestedOrganization[];
  organizationsTable: OrganizationTableRecord[];
  isExpanded: boolean;
  hasProjects: boolean;
  onOpenOrganizationModal: (orgKey: string) => void;
  logoErrors: Set<string>;
  onLogoError: (orgId: string) => void;
  children?: React.ReactNode;
  headingLevel?: "h3" | "h4";
  showDetailsButton?: boolean;
  projectCount?: number;
  projectLabel?: string;
}

// Utility function moved outside component
const normalizeForMatch = (name: string): string =>
  name.replace(/\s+/g, " ").trim().toLowerCase();

// Sanitize org key to prevent path traversal attacks
const sanitizeOrgKey = (key: string): string => {
  if (!key || typeof key !== "string") return "";
  // Only allow alphanumeric, hyphens, and underscores
  return key.replace(/[^a-zA-Z0-9_-]/g, "");
};

const OrganizationBoxComponent: React.FC<OrganizationBoxProps> = ({
  orgId,
  organizationName,
  nestedOrganizations,
  organizationsTable,
  isExpanded,
  hasProjects,
  onOpenOrganizationModal,
  logoErrors,
  onLogoError,
  children,
  headingLevel = "h3",
  showDetailsButton = false,
  projectCount = 0,
  projectLabel = "assets",
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const HeadingTag = headingLevel;

  // Memoize nested org lookup to prevent recalculation on every render
  const nestedOrg = useMemo(
    () => nestedOrganizations.find((n) => n.id === orgId),
    [nestedOrganizations, orgId]
  );

  // Memoize orgKey with sanitization for security
  const orgKey = useMemo(() => {
    const rawKey = nestedOrg?.fields?.org_key;
    return typeof rawKey === "string" ? sanitizeOrgKey(rawKey) : "";
  }, [nestedOrg]);

  const hasLogoError = logoErrors.has(orgId);

  // Memoize organization type lookup
  const orgType = useMemo(() => {
    const orgTarget = normalizeForMatch(organizationName || orgId);
    const orgTableMatch = organizationsTable.find((rec) => {
      const full = (rec.fields["Org Full Name"] as string) || "";
      const short = (rec.fields["Org Short Name"] as string) || "";
      const altFull = (rec.fields["Org Fullname"] as string) || "";
      return [full, short, altFull].some(
        (s) => normalizeForMatch(String(s || "")) === orgTarget
      );
    });
    return orgTableMatch?.fields["Org Type"] as string | undefined;
  }, [organizationsTable, organizationName, orgId]);

  // Memoize event handlers to prevent unnecessary re-renders
  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const handleOpenModal = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (orgKey) {
        onOpenOrganizationModal(orgKey);
      }
    },
    [orgKey, onOpenOrganizationModal]
  );

  const handleLogoError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const currentSrc = img.src;
      const currentExt = currentSrc.split(".").pop()?.split("?")[0];
      const currentIndex = LOGO_EXTENSIONS.indexOf(
        currentExt as (typeof LOGO_EXTENSIONS)[number]
      );

      if (currentIndex !== -1 && currentIndex < LOGO_EXTENSIONS.length - 1) {
        img.src = `/logos/${orgKey}.${LOGO_EXTENSIONS[currentIndex + 1]}`;
      } else {
        onLogoError(orgId);
      }
    },
    [orgKey, orgId, onLogoError]
  );

  // Memoize filter style to prevent object recreation
  const logoFilterStyle = useMemo(
    () => ({
      filter: isHovered
        ? "grayscale(0%) brightness(1.1)"
        : "grayscale(100%) brightness(1.1)",
    }),
    [isHovered]
  );

  return (
    <div
      className="group flex min-h-[80px] animate-in cursor-pointer flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/30 p-3 fade-in hover:bg-slate-50/70 sm:flex-row sm:justify-between sm:gap-0 sm:p-4"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      role="article"
      aria-label={`Organization: ${organizationName}`}
    >
      <div className="flex flex-1 items-center space-x-3">
        {/* Logo or fallback icon */}
        {orgKey && !hasLogoError ? (
          <img
            src={`/logos/${orgKey}.png`}
            alt=""
            aria-hidden="true"
            className="h-8 w-8 flex-shrink-0 object-contain transition-[filter] duration-300"
            style={logoFilterStyle}
            loading="lazy"
            decoding="async"
            onError={handleLogoError}
          />
        ) : (
          <Building2
            className="h-5 w-5 flex-shrink-0 text-slate-400"
            aria-hidden="true"
          />
        )}

        {/* Chevron indicator */}
        <div
          className="flex h-4 w-4 flex-shrink-0 items-center justify-center"
          aria-hidden="true"
        >
          {hasProjects ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            )
          ) : (
            <div className="invisible h-4 w-4" />
          )}
        </div>

        {/* Organization name and content */}
        <div className="min-w-0 flex-1 text-left">
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-2">
            <HeadingTag
              className="cursor-pointer text-sm font-medium text-slate-900 transition-colors hover:text-[var(--brand-primary)] sm:text-base"
              onClick={(e) => {
                e.stopPropagation();
                handleOpenModal(e as React.MouseEvent);
              }}
            >
              {organizationName}
            </HeadingTag>
            {orgType && (
              <span className="flex-shrink-0 items-center rounded bg-transparent px-0.5 py-0 text-[10px] whitespace-nowrap text-slate-400 sm:inline-flex">
                {orgType}
              </span>
            )}
          </div>
          
          {/* Badges section */}
          {children && (
            <div className="mt-2 flex max-w-full flex-wrap gap-1">
              {children}
            </div>
          )}
        </div>
      </div>

      {/* Right section: Details button and/or project count */}
      <div 
        className="flex min-w-[100px] flex-shrink-0 flex-col items-end justify-between self-stretch"
        onClick={(e) => e.stopPropagation()}
      >
        {showDetailsButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenModal}
            className="hidden h-6 items-center justify-center gap-1 rounded-md bg-[var(--badge-slate-text)] px-2 text-[10px] text-[var(--badge-slate-bg)] duration-150 hover:bg-slate-400 sm:inline-flex"
            aria-label={`View details for ${organizationName}`}
          >
            <Info className="h-3 w-3" aria-hidden="true" />
            <span>Details</span>
          </Button>
        )}
        {typeof projectCount === "number" && (
          <p className="text-xs whitespace-nowrap text-slate-400">
            {projectCount > 0
              ? isExpanded
                ? `Showing ${projectCount} ${projectLabel}`
                : `Show ${projectCount} ${projectLabel}`
              : `${projectCount} ${projectLabel}`}
          </p>
        )}
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders when parent updates
export const OrganizationBox = memo(OrganizationBoxComponent);

// Display name for debugging
OrganizationBox.displayName = "OrganizationBox";
