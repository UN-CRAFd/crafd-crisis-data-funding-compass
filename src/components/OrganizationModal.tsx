"use client";

import {
  Building2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Image,
  Info,
  Package,
  PackageOpen,
} from "lucide-react";
import { useState, useEffect } from "react";
import { getMemberStates } from "@/lib/data";
import ModalOrganizationFocus from "./ModalOrganizationFocus";
import BaseModal, {
  ModalHeader,
  CountryBadge,
  ModalTooltip,
} from "./BaseModal";
import { getIconForInvestmentType } from "@/config/investmentTypeIcons";
import labels from "@/config/labels.json";
import { IATIProjectsList } from "./IATIProjectsList";
import { IATIActivitySummaryCard } from "./IATIActivitySummaryCard";
import type { IATIOrganizationData } from "@/types/iati";

interface OrganizationModalProps {
  // Accept the full organization record coming from `public/data/organizations-table.json`
  // Structure: { id: string; createdTime?: string; fields: Record<string, unknown> }
  organization: {
    id: string;
    createdTime?: string;
    fields: Record<string, unknown>;
    iati_data?: IATIOrganizationData;
  } | null;
  // Centralized data maps from data.ts for consistent data access
  projectNameMap?: Record<string, string>;
  projectDescriptionMap?: Record<string, string>;
  orgProjectsMap?: Record<
    string,
    Array<{ id: string; investmentTypes: string[] }>
  >;
  orgDonorCountriesMap?: Record<string, string[]>;
  orgDonorInfoMap?: Record<string, import("@/types/airtable").DonorInfo[]>;
  orgAgenciesMap?: Record<string, Record<string, string[]>>;
  orgProjectDonorsMap?: Record<string, Record<string, string[]>>;
  orgProjectDonorAgenciesMap?: Record<
    string,
    Record<string, Record<string, string[]>>
  >;
  // onClose removed for serializability; modal will dispatch a CustomEvent 'closeOrganizationModal'
  loading: boolean;
  // Callback to open project modal
  onOpenProjectModal?: (projectKey: string) => void;
  // Map from project ID to product_key for navigation
  projectIdToKeyMap?: Record<string, string>;
  // Callback when a donor is clicked
  onOpenDonorModal?: (country: string) => void;
  // Callback when an investment type is clicked
  onTypeClick?: (type: string) => void;
}

// Import HeadquartersCountry component - comment out import to disable HQ display
// import HeadquartersCountry from './HeadquartersCountry';

export default function OrganizationModal({
  organization,
  projectNameMap = {},
  projectDescriptionMap = {},
  orgProjectsMap = {},
  orgDonorCountriesMap = {},
  orgDonorInfoMap = {},
  orgAgenciesMap = {},
  orgProjectDonorsMap = {},
  orgProjectDonorAgenciesMap = {},
  loading,
  onOpenProjectModal,
  projectIdToKeyMap = {},
  onOpenDonorModal,
  onTypeClick,
}: OrganizationModalProps): React.ReactElement {
  const [memberStates, setMemberStates] = useState<string[]>([]);

  // Load member states on mount
  useEffect(() => {
    getMemberStates().then((states) => setMemberStates(states));
  }, []);

  // Reusable subheader component - Major sections (Assets, Funding) - smaller than main title
  const SubHeader = ({ children }: { children: React.ReactNode }) => (
    <h3 className="font-roboto mb-3 text-xl leading-normal font-black tracking-wide text-[#333333] uppercase">
      {children}
    </h3>
  );

  // Reusable field label component - Smallest text for labels
  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <span className="font-roboto text-xs leading-5 font-medium tracking-wide text-[#333333] uppercase">
      {children}
    </span>
  );

  // Helper function to extract unique agencies from project-to-agencies map
  const getUniqueAgenciesForProjects = (
    projects: string[],
    projectToAgencies: Record<string, string[]>,
  ): string[] => {
    const uniqueAgencies = new Set<string>();
    projects.forEach((project) => {
      const agencies = projectToAgencies[project] || [];
      agencies.forEach((agency) => uniqueAgencies.add(agency));
    });
    return Array.from(uniqueAgencies);
  };

  // Reusable field value wrapper component
  const FieldValue = ({ children }: { children: React.ReactNode }) => (
    <div className="mt-0.5">{children}</div>
  );

  // Complete field component combining label and value
  const Field = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <FieldValue>{children}</FieldValue>
    </div>
  );

  // Simple badge used for array values
  const Badge = ({ children }: { children: React.ReactNode }) => (
    <span
      className="mr-1 mb-1 inline-block rounded-full px-3 py-1 text-sm font-medium"
      style={{
        backgroundColor: "var(--brand-bg-light)",
        color: "var(--brand-primary-dark)",
      }}
    >
      {children}
    </span>
  );

  // Helper function to extract first sentence from text
  const getFirstSentence = (text: string): string => {
    if (!text || text.trim().length === 0) return "";
    // Match text up to the first period, exclamation mark, or question mark
    const match = text.match(/^[^.!?]*[.!?]/);
    return match ? match[0].trim() : text.trim();
  };

  // Hover state for project items to toggle the icon
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);

  const renderHeader = ({
    showCopied,
    onShare,
    onClose,
  }: {
    showCopied: boolean;
    onShare: () => void;
    onClose: () => void;
  }) => {
    if (!organization) {
      return (
        <ModalHeader
          icon={
            <Building2 className="h-6 w-6 shrink-0 text-[#333333] sm:h-7 sm:w-7" />
          }
          title={labels.modals.organizationNotFound}
          showCopied={showCopied}
          onShare={onShare}
          onClose={onClose}
          loading={loading}
        />
      );
    }

    const fields = organization.fields || {};
    const displayName =
      (typeof fields["Org Full Name"] === "string" &&
        fields["Org Full Name"]) ||
      (typeof fields["Org Short Name"] === "string" &&
        fields["Org Short Name"]) ||
      organization.id;

    // Get org_key for logo lookup
    const orgKey =
      typeof fields["org_key"] === "string" ? fields["org_key"] : "";

    // Try to load organization logo (supports png, jpg, svg, webp)
    const [logoError, setLogoError] = useState(false);
    const logoExtensions = ["png", "jpg", "svg", "webp"];

    // Determine icon to use
    let icon: React.ReactNode;
    if (orgKey && !logoError) {
      // Try to use organization logo - will fallback on error
      const logoSrc = `/logos/${orgKey}.png`; // Default to png, but onError will try others
      icon = (
        <img
          src={logoSrc}
          alt={`${displayName} logo`}
          className="h-6 w-6 shrink-0 object-contain sm:h-10 sm:w-10"
          onError={(e) => {
            // Try other extensions
            const currentSrc = (e.target as HTMLImageElement).src;
            const currentExt = currentSrc.split(".").pop()?.split("?")[0];
            const currentIndex = logoExtensions.indexOf(currentExt || "");

            if (
              currentIndex !== -1 &&
              currentIndex < logoExtensions.length - 1
            ) {
              // Try next extension
              (e.target as HTMLImageElement).src =
                `/logos/${orgKey}.${logoExtensions[currentIndex + 1]}`;
            } else {
              // All extensions failed, use fallback
              setLogoError(true);
            }
          }}
        />
      );
    } else {
      icon = (
        <Building2 className="h-6 w-6 shrink-0 text-[#333333] sm:h-7 sm:w-7" />
      );
    }

    return (
      <ModalHeader
        icon={icon}
        title={displayName}
        showCopied={showCopied}
        onShare={onShare}
        onClose={onClose}
        loading={loading}
      />
    );
  };

  // Render body content based on state
  const renderBody = ({
    tooltipContainer,
  }: {
    tooltipContainer?: Element | null;
  }): React.ReactNode => {
    if (loading) {
      return (
        <div className="space-y-4 p-4 sm:p-6">
          <div className="h-4 w-full animate-pulse rounded bg-gray-200"></div>
          <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
          <div className="h-4 w-1/2 animate-pulse rounded bg-gray-200"></div>
        </div>
      );
    }

    if (!organization) {
      return (
        <div className="p-4 sm:p-6">
          <p className="text-gray-600">
            {labels.modals.organizationNotFoundMessage}
          </p>
        </div>
      );
    }

    // If the caller provided a raw fields object (from organizations-table.json), render all keys
    const fields = organization.fields || {};

    // Extract budget-related fields early so they're available for both the budget box and notes
    const estBudget = fields["Est. Org Budget"] as
      | number
      | string
      | null
      | undefined;
    const budgetSourceRaw = fields["Budget Source"];
    const budgetSourceStr =
      budgetSourceRaw != null ? String(budgetSourceRaw) : null;
    const lastUpdated = fields["Last Updated"] as string | null | undefined;

    // Helper to render a single field value nicely
    const renderValue = (val: unknown): React.ReactNode => {
      if (val === null || val === undefined)
        return <span className="text-gray-500">—</span>;
      if (Array.isArray(val)) {
        return (
          <div className="flex flex-wrap gap-1">
            {val.map((v, i) => (
              <Badge key={i}>{String(v)}</Badge>
            ))}
          </div>
        );
      }
      if (typeof val === "object") {
        try {
          return (
            <pre className="text-xs whitespace-pre-wrap text-gray-700">
              {JSON.stringify(val, null, 2)}
            </pre>
          );
        } catch {
          return <span className="text-gray-700">{String(val)}</span>;
        }
      }
      if (
        typeof val === "string" ||
        typeof val === "number" ||
        typeof val === "boolean"
      ) {
        const s = String(val);
        if (s === "") return <span className="text-gray-500">—</span>;
        // If looks like a URL, render as link
        if (s.startsWith("http://") || s.startsWith("https://")) {
          const cleaned = s.replace(/^<|>$/g, "");
          return (
            <a
              href={cleaned}
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--brand-primary) hover:underline"
            >
              {cleaned}
            </a>
          );
        }
        return <span className="whitespace-pre-wrap text-gray-700">{s}</span>;
      }
      // Fallback for any other type
      return (
        <span className="whitespace-pre-wrap text-gray-700">{String(val)}</span>
      );
    };

    // Curated display: only show selected important fields
    const WEBSITE_KEYS = [
      "Org Website",
      "Org Website (URL)",
      "Org Website Url",
      "Org Website URL",
    ];
    const websiteKey = WEBSITE_KEYS.find(
      (k) => typeof fields[k] === "string" && fields[k],
    );
    const websiteValue: string | null = websiteKey
      ? String(fields[websiteKey])
      : null;

    // Extract organization type, handling both string and array formats
    const orgTypeRaw = fields["Org Type"];
    let orgType = "";
    if (typeof orgTypeRaw === "string") {
      orgType = orgTypeRaw;
    } else if (Array.isArray(orgTypeRaw) && orgTypeRaw.length > 0) {
      orgType = orgTypeRaw[0];
    }

    // Derive displayName here as well for use in the body
    const displayName =
      (typeof fields["Org Full Name"] === "string" &&
        fields["Org Full Name"]) ||
      (typeof fields["Org Short Name"] === "string" &&
        fields["Org Short Name"]) ||
      organization.id;

    // Detect United Nations organizations (simple heuristics)
    const isUN =
      /united nation/i.test(String(displayName)) ||
      /united nation/i.test(String(orgType)) ||
      /\bUN\b/.test(String(displayName)) ||
      /\bUN\b/.test(String(orgType));

    return (
      <div className="font-roboto flex h-full flex-col px-6 pt-4 pb-6 sm:px-8 sm:pt-5 sm:pb-8">
        {/* Description with inline Learn more link */}
        {typeof fields["Org Description"] === "string" &&
          String(fields["Org Description"]).length > 0 && (
            <p className="font-roboto text-base leading-relaxed font-normal text-gray-700">
              {String(fields["Org Description"])}
              {websiteValue && websiteValue.trim() !== "" && (
                <>
                  {" "}
                  <a
                    href={websiteValue.replace(/^<|>$/g, "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="align-baseline font-semibold whitespace-nowrap underline underline-offset-2 transition-colors"
                    style={{ color: "var(--brand-primary)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color =
                        "var(--brand-primary-dark)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--brand-primary)")
                    }
                  >
                    {labels.modals.learnMore}
                    <ExternalLink className="ml-0.5 inline-block h-3.5 w-3.5 align-text-bottom" />
                  </a>
                </>
              )}
            </p>
          )}

        {/* HDX + IATI Buttons */}
        <div className="mt-3 flex items-center gap-3">
          {/* HDX */}
          {typeof fields["HDX Org Key"] === "string" &&
            fields["HDX Org Key"].trim() !== "" && (
              <a
                href={`https://data.humdata.org/organization/${fields["HDX Org Key"].trim()}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-200"
              >
                <img
                  src="images/hdx-logo.png"
                  alt="HDX logo"
                  className="h-5 w-5 rounded-none"
                />
                <span className="font-normal">
                  {labels.modals.viewOnHdx}{" "}
                  <strong className="font-bold">{labels.modals.hdx}</strong>
                </span>
              </a>
            )}

          {/* IATI */}
          {typeof fields["IATI Org Key"] === "string" &&
            fields["IATI Org Key"].trim() !== "" && (
              <a
                href={`https://d-portal.org/ctrack.html?publisher=${fields["IATI Org Key"].trim()}#view=main`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-200"
              >
                <img
                  src="images/iati-logo.png"
                  alt="IATI logo"
                  className="h-5 rounded-none"
                />
                <span className="font-normal">
                  {labels.modals.viewOnIati}{" "}
                  <strong className="font-bold">{labels.modals.iati}</strong>
                </span>
              </a>
            )}
        </div>
        {/* If website exists but description didn't show it, render a prominent Website button */}
        {!fields["Org Description"] &&
          websiteValue &&
          websiteValue.trim() !== "" && (
            <div>
              <Field label="Website">
                <button
                  type="button"
                  onClick={() => {
                    const cleaned = websiteValue.replace(/^<|>$/g, "");
                    window.open(cleaned, "_blank", "noopener,noreferrer");
                  }}
                  className="mt-1 inline-flex items-center justify-center gap-2 rounded-full bg-(--brand-primary) px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-(--brand-primary-dark)"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="flex items-center">
                    {labels.modals.openWebsite}
                  </span>
                </button>
              </Field>
            </div>
          )}
        <div className="mt-4 mb-4 flex items-center justify-between">
          <div className="ml-4 flex-1 border-t border-gray-200"></div>
        </div>

        {/* Metadata - Single column layout */}
        {/* Organization Funding*/}

        <div className="mt-2 space-y-8">
          {/* Provided Assets - Simple field access matching FIELDS_ORGANIZATIONS */}
          {(() => {
            // Use the clean field name from FIELDS_ORGANIZATIONS: "Provided Data Ecosystem Projects"
            const providedProjects = fields["Provided Data Ecosystem Projects"];

            if (
              !providedProjects ||
              (Array.isArray(providedProjects) && providedProjects.length === 0)
            ) {
              return null;
            }

            // Convert to array if needed - keep both IDs and names
            let projectsList: Array<{
              id: string;
              name: string;
              productKey: string;
            }> = [];
            if (Array.isArray(providedProjects)) {
              // Array of project IDs - resolve to names and product keys
              projectsList = providedProjects
                .map((id) => String(id).trim())
                .map((id) => ({
                  id,
                  name: projectNameMap[id] || id,
                  productKey: projectIdToKeyMap[id] || id,
                }))
                .filter((p) => p.name)
                .sort((a, b) => a.name.localeCompare(b.name));
            }

            if (projectsList.length === 0) return null;

            const showCollapsible = projectsList.length > 5;
            const [isExpanded, setIsExpanded] = useState(false);
            const displayedProjects =
              showCollapsible && !isExpanded
                ? projectsList.slice(0, 5)
                : projectsList;

            return (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="font-roboto text-xl leading-normal font-black tracking-wide text-[#333333] uppercase">
                    {labels.modals.providedAssets}
                  </h3>
                  <span className="text-lg font-normal text-slate-600 tabular-nums">
                    ({projectsList.length})
                  </span>
                </div>

                <div className="mt-4 mb-2 flex flex-col gap-2">
                  {displayedProjects.map((proj, i) => {
                    const description = projectDescriptionMap[proj.id] || "";
                    const firstSentence = getFirstSentence(description);

                    // Get investment types for this project
                    const projectData = orgProjectsMap?.[organization.id]?.find(
                      (p) => p.id === proj.id,
                    );
                    const investmentTypes = projectData?.investmentTypes || [];

                    const projectButton = (
                      <button
                        key={proj.id || i}
                        onClick={() => onOpenProjectModal?.(proj.productKey)}
                        onMouseEnter={() => setHoveredProjectId(proj.id)}
                        onMouseLeave={() => setHoveredProjectId(null)}
                        className="inline-flex w-full cursor-pointer items-center justify-between gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-left text-base font-medium text-slate-600 transition-colors hover:bg-slate-200"
                      >
                        <div className="inline-flex min-w-0 items-center gap-1.5">
                          {(() => {
                            if (investmentTypes.length === 0) {
                              return hoveredProjectId === proj.id ? (
                                <PackageOpen className="h-4 w-4 shrink-0 text-slate-600" />
                              ) : (
                                <Package className="h-4 w-4 shrink-0 text-slate-600" />
                              );
                            }
                            if (investmentTypes.length === 1) {
                              const TypeIcon = getIconForInvestmentType(investmentTypes[0]);
                              return <TypeIcon className="h-4 w-4 shrink-0 text-slate-600" />;
                            }
                            // Two or more types - show first two diagonally
                            const Icon1 = getIconForInvestmentType(investmentTypes[0]);
                            const Icon2 = getIconForInvestmentType(investmentTypes[1]);
                            return (
                              <div className="relative h-4 w-4 shrink-0">
                                <Icon1 className="absolute left-0 top-0 h-2 w-2 text-slate-600" />
                                <Icon2 className="absolute bottom-0 right-0 h-2 w-2 text-slate-600" />
                              </div>
                            );
                          })()}
                          <span className="truncate">{proj.name}</span>
                        </div>
                        {investmentTypes.length > 2 && (
                          <div className="inline-flex shrink-0 items-center gap-1">
                            {investmentTypes.slice(2).map((type, idx) => {
                              const TypeIcon = getIconForInvestmentType(type);
                              return (
                                <TypeIcon
                                  key={idx}
                                  className="h-4 w-4 text-slate-400"
                                />
                              );
                            })}
                          </div>
                        )}
                      </button>
                    );

                    // Only wrap in tooltip if there's a description
                    if (firstSentence) {
                      return (
                        <ModalTooltip
                          key={proj.id || i}
                          content={firstSentence}
                          side="top"
                          tooltipContainer={tooltipContainer}
                        >
                          {projectButton}
                        </ModalTooltip>
                      );
                    }

                    return projectButton;
                  })}
                </div>
                {showCollapsible && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-400"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        <span>{labels.ui.showLess}</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        <span>
                          {labels.ui.showMore.replace(
                            "{count}",
                            String(projectsList.length - 5),
                          )}
                        </span>
                      </>
                    )}
                  </button>
                )}
                {(() => {
                  const orgProjects = orgProjectsMap[organization.id];
                  if (!orgProjects || orgProjects.length === 0) return null;

                  return (
                    <div className="mt-4 border-t border-slate-200 pt-4">
                      <ModalOrganizationFocus
                        projects={orgProjects}
                        onTypeClick={onTypeClick}
                        tooltipContainer={tooltipContainer}
                        SubHeader={undefined}
                      />
                    </div>
                  );
                })()}
              </div>
            );
          })()}

          {/* Organization Donors - Clean field access from centralized data */}
          {(() => {
            // Get donor info from the centralized map (includes both org-level and project-only donors)
            const donorInfo = orgDonorInfoMap[organization.id] || [];

            // Use the budget fields already extracted at the top
            const linkRaw = fields["Link to Budget Source"];
            const linkToBudgetSource =
              typeof linkRaw === "string" && linkRaw.trim() !== ""
                ? linkRaw.trim()
                : null;

            // Get org_key to find local screenshots
            const orgKey = fields["org_key"] as string | undefined;

            // Try to load downloaded screenshots from public/screenshots/ directory
            // For now, we'll try the first screenshot (index 0)
            const budgetScreenshotUrl = orgKey
              ? `/screenshots/${orgKey}.png`
              : null;

            // Only show the whole section if there are donors OR budget data
            if (
              donorInfo.length === 0 &&
              !estBudget &&
              !budgetSourceStr &&
              !lastUpdated
            ) {
              return null;
            }

            return (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="font-roboto text-xl leading-normal font-black tracking-wide text-[#333333] uppercase">
                    {labels.modals.organizationFunding}
                  </h3>
                  <span className="text-lg font-normal text-gray-500 tabular-nums">
                    ({donorInfo.length})
                  </span>
                </div>
                {(estBudget || budgetSourceStr || lastUpdated) && (
                  <div className="rounded-lg border border-slate-200 bg-slate-100 p-4 shadow-sm">
                    <div className="mt-0 grid grid-cols-[3fr_3fr_3fr_0.2fr] gap-4">
                      <div className="flex flex-col">
                        <span className="text-sm tracking-wide text-slate-400">
                          {labels.modals.estOrgBudget}
                        </span>
                        <span className="text-base font-medium text-slate-600">
                          {estBudget
                            ? (() => {
                                const budget = estBudget as number | string;
                                if (typeof budget !== "number")
                                  return String(budget);
                                if (budget >= 1_000_000_000)
                                  return `$${(budget / 1_000_000_000).toFixed(1)} B`;
                                if (budget >= 1_000_000)
                                  return `$${(budget / 1_000_000).toFixed(1)} M`;
                                return `$${budget}`;
                              })()
                            : "—"}
                        </span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-sm tracking-wide text-slate-400">
                          {labels.modals.budgetSource}
                        </span>
                        <div className="flex items-center gap-2">
                          {budgetScreenshotUrl ? (
                            <ModalTooltip
                              content={
                                <div className="p-1">
                                  <img
                                    src={budgetScreenshotUrl}
                                    alt="Budget Source Screenshot"
                                    className="rounded-md object-contain"
                                    style={{
                                      maxWidth: "80vw",
                                      maxHeight: "70vh",
                                    }}
                                  />
                                </div>
                              }
                              side="top"
                              tooltipContainer={tooltipContainer}
                            >
                              <span className="inline-flex cursor-help items-center gap-1 text-base font-medium text-slate-600 underline decoration-slate-400 decoration-dotted underline-offset-2">
                                {budgetSourceStr ? budgetSourceStr : "—"}
                              </span>
                            </ModalTooltip>
                          ) : (
                            <span className="text-base font-medium text-slate-600">
                              {budgetSourceStr ? budgetSourceStr : "—"}
                            </span>
                          )}
                          {linkToBudgetSource && (
                            <a
                              href={linkToBudgetSource}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 cursor-pointer text-slate-400 transition-colors hover:text-slate-600"
                              title={labels.modals.viewBudgetSource}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-sm tracking-wide text-slate-400">
                          {labels.modals.lastUpdated}
                        </span>
                        <span className="text-base font-medium text-slate-600">
                          {fields["Last Updated"]
                            ? String(fields["Last Updated"])
                            : "—"}
                        </span>
                      </div>
                      <div className="flex">
                        <div className="flex-1"></div>
                        <ModalTooltip
                          content={labels.modals.budgetInfoTooltip}
                          side="left"
                          tooltipContainer={tooltipContainer}
                        >
                          <Info className="h-4 w-4 shrink-0 cursor-help text-slate-400 transition-colors hover:text-slate-600" />
                        </ModalTooltip>
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {donorInfo.map((donor, idx) => {
                    const orgAgencies = orgAgenciesMap[organization.id] || {};
                    const orgProjectDonors =
                      orgProjectDonorsMap[organization.id] || {};
                    const orgProjectDonorAgencies =
                      orgProjectDonorAgenciesMap[organization.id] || {};

                    // For project-level donors, get the projects they fund and corresponding agencies
                    const projectsForDonor = !donor.isOrgLevel
                      ? orgProjectDonors[donor.country] || []
                      : undefined;
                    const projectAgenciesForDonor =
                      !donor.isOrgLevel && projectsForDonor
                        ? getUniqueAgenciesForProjects(
                            projectsForDonor,
                            orgProjectDonorAgencies[donor.country] || {},
                          )
                        : undefined;
                    const isMemberState = memberStates.includes(donor.country);

                    return (
                      <div
                        key={donor.country}
                        className={donor.isOrgLevel ? "" : "opacity-50"}
                      >
                        <CountryBadge
                          country={donor.country}
                          onClick={onOpenDonorModal}
                          agencies={orgAgencies[donor.country]}
                          projectsForDonor={projectsForDonor}
                          projectAgenciesForDonor={projectAgenciesForDonor}
                          tooltipContainer={tooltipContainer}
                          isMemberState={isMemberState}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* IATI Data Section - Minimal */}
        {organization.iati_data &&
          organization.iati_data.activities &&
          organization.iati_data.activities.length > 0 && (
            <div className="mt-8 space-y-4">
              <div className="mb-3 flex items-center gap-2">
                <h3 className="font-roboto text-xl leading-normal font-black tracking-wide text-[#333333] uppercase">
                  IATI Data
                </h3>
                <span className="text-lg font-normal text-gray-500 tabular-nums">
                  ({organization.iati_data.activities.length})
                </span>
              </div>

              {/* Summary metrics */}
              {organization.iati_data.activity_summary &&
                organization.iati_data.activity_summary.count > 0 && (
                  <IATIActivitySummaryCard
                    activitySummary={organization.iati_data.activity_summary}
                    totalActivities={
                      organization.iati_data.stats.total_activities
                    }
                    storedActivities={
                      organization.iati_data.stats.stored_activities
                    }
                    tooltipContainer={tooltipContainer}
                  />
                )}

              {/* Activities list */}
              {organization.iati_data.activities &&
                organization.iati_data.activities.length > 0 && (
                  <div className="mt-4 flex hidden flex-col gap-2">
                    <IATIProjectsList
                      activities={organization.iati_data.activities}
                      orgName={displayName}
                    />
                  </div>
                )}
            </div>
          )}

        {/* Flexible spacer to push notes to bottom */}
        <div className="min-h-8 grow"></div>

        <div className="mt-auto border-t border-slate-200 pt-4 pb-4">
          <div className="mb-2 text-xs font-medium tracking-wider text-slate-400 uppercase">
            {labels.modals.notes}
          </div>
          <div className="space-y-1 text-xs leading-snug text-slate-500">
            <div className="flex items-start">
              <span className="mr-2 shrink-0 text-slate-400">•</span>
              <span>{labels.modals.notesInsights}</span>
            </div>
            {!estBudget && !budgetSourceStr && !lastUpdated && (
              <div className="flex items-start">
                <span className="mr-2 shrink-0 text-slate-400">•</span>
                <span>{labels.modals.noBudgetDisclosed}</span>
              </div>
            )}
            {isUN && (
              <div className="flex items-start">
                <span className="mr-2 shrink-0 text-slate-400">•</span>
                <span>
                  {labels.modals.notesUn}
                  {typeof fields["UN Funding Link"] === "string" &&
                    fields["UN Funding Link"] && (
                      <>
                        {" "}
                        <a
                          href={String(fields["UN Funding Link"]).replace(
                            /^<|>$/g,
                            "",
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold whitespace-nowrap underline underline-offset-2 transition-colors"
                          style={{ color: "var(--brand-primary)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.color =
                              "var(--brand-primary-dark)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.color =
                              "var(--brand-primary)")
                          }
                        >
                          {labels.modals.learnMore}
                          <ExternalLink className="ml-0.5 inline-block h-3 w-3 align-text-bottom" />
                        </a>
                      </>
                    )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseModal
      isOpen={!!organization}
      closeEventName="closeOrganizationModal"
      loading={loading}
      renderHeader={renderHeader}
      renderBody={renderBody}
    />
  );
}
