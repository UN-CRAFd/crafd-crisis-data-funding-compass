import React from "react";
import { ChevronDown, ChevronRight, Building2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrganizationBoxProps {
  orgId: string;
  organizationName: string;
  nestedOrganizations: any[];
  organizationsTable: Array<{
    id: string;
    createdTime?: string;
    fields: Record<string, unknown>;
  }>;
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

export const OrganizationBox: React.FC<OrganizationBoxProps> = ({
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
  const HeadingTag = headingLevel;
  
  const nestedOrg = nestedOrganizations.find((n) => n.id === orgId);
  const orgKey = typeof nestedOrg?.fields?.["org_key"] === "string" ? nestedOrg.fields["org_key"] : "";
  const logoExtensions = ["png", "jpg", "svg", "webp"];
  const hasLogoError = logoErrors.has(orgId);

  // Find organization type
  const normalizeForMatch = (name: string) =>
    name.replace(/\s+/g, " ").trim().toLowerCase();
  
  const orgTarget = normalizeForMatch(organizationName || orgId);
  const orgTableMatch = organizationsTable.find((rec) => {
    const full = (rec.fields["Org Full Name"] as string) || "";
    const short = (rec.fields["Org Short Name"] as string) || "";
    const altFull = (rec.fields["Org Fullname"] as string) || "";
    return [full, short, altFull].some(
      (s) => normalizeForMatch(String(s || "")) === orgTarget,
    );
  });
  const orgType = orgTableMatch?.fields["Org Type"] as string | undefined;

  return (
    <div className="flex min-h-[80px] animate-in cursor-pointer flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/30 p-3 fade-in hover:bg-slate-50/70 sm:flex-row sm:justify-between sm:gap-0 sm:p-4">
      <div className="flex flex-1 items-center space-x-3">
        {/* Logo or fallback icon */}
        {orgKey && !hasLogoError ? (
          <img
            src={`/logos/${orgKey}.png`}
            alt={`${organizationName} logo`}
            className="h-8 w-8 flex-shrink-0 object-contain"
            style={{ filter: "saturate(0) brightness(1.05)" }}
            loading="lazy"
            decoding="async"
            onError={(e) => {
              const currentSrc = (e.target as HTMLImageElement).src;
              const currentExt = currentSrc.split(".").pop()?.split("?")[0];
              const currentIndex = logoExtensions.indexOf(currentExt || "");
              
              if (currentIndex !== -1 && currentIndex < logoExtensions.length - 1) {
                (e.target as HTMLImageElement).src = `/logos/${orgKey}.${logoExtensions[currentIndex + 1]}`;
              } else {
                onLogoError(orgId);
              }
            }}
          />
        ) : (
          <Building2 className="h-5 w-5 flex-shrink-0 text-slate-400" />
        )}

        {/* Chevron indicator */}
        <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
          {hasProjects ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            )
          ) : (
            <div className="invisible h-4 w-4" aria-hidden="true" />
          )}
        </div>

        {/* Organization name and content */}
        <div className="min-w-0 flex-1 text-left">
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-2">
            <HeadingTag
              className="cursor-pointer text-sm font-medium text-slate-900 transition-colors hover:text-[var(--brand-primary)] sm:text-base"
              onClick={(e) => {
                e.stopPropagation();
                const nestedOrg = nestedOrganizations.find((n) => n.id === orgId);
                const orgKey = nestedOrg?.fields?.["org_key"];
                if (orgKey) {
                  onOpenOrganizationModal(orgKey);
                }
              }}
            >
              {organizationName}
            </HeadingTag>
            {orgType && (
              <div className="font-sm flex-shrink-0 items-center rounded bg-transparent px-0.5 py-0 text-[10px] whitespace-nowrap text-slate-400 sm:inline-flex">
                {orgType}
              </div>
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
      <div className="flex min-w-[100px] flex-shrink-0 flex-col items-end justify-between self-stretch">
        {showDetailsButton && (
          <Button
            asChild
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              const nestedOrg = nestedOrganizations.find((n) => n.id === orgId);
              const orgKey = nestedOrg?.fields?.["org_key"];
              if (orgKey) {
                onOpenOrganizationModal(orgKey);
              }
            }}
            className="hidden h-6 items-center justify-center gap-1 rounded-md bg-[var(--badge-slate-text)] px-2 text-[10px] text-[var(--badge-slate-bg)] duration-150 hover:bg-slate-400 sm:inline-flex"
          >
            <div className="hidden items-center justify-center gap-1 border-none sm:inline-flex">
              <Info className="h-3 w-3" />
              <span>Details</span>
            </div>
          </Button>
        )}
        {projectCount !== undefined && (
          <div className="text-xs whitespace-nowrap text-slate-400 sm:text-xs">
            {projectCount > 0
              ? isExpanded
                ? `Showing ${projectCount} ${projectLabel}`
                : `Show ${projectCount} ${projectLabel}`
              : `${projectCount} ${projectLabel}`}
          </div>
        )}
      </div>
    </div>
  );
};
