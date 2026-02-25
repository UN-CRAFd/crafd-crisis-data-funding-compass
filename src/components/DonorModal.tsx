"use client";

import {
  Building2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Package,
  PackageOpen,
  Building,
  MapPin,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { getMemberStates } from "@/lib/data";
import BaseModal, { ModalHeader, ModalTooltip } from "./BaseModal";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CountryFlag } from "./CountryFlag";
import labels from "@/config/labels.json";
import { matchesUrlSlug } from "@/lib/urlShortcuts";

interface Agency {
  id: string;
  name: string;
  dataPortal?: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  productKey: string;
}

interface Organization {
  id: string;
  name: string;
  shortName: string;
}

interface AgencyData {
  agency: Agency;
  organizations: Organization[];
  projects: Project[];
}

interface DonorModalProps {
  donorCountry: string | null;
  // Nested organizations for agency data
  nestedOrganizations?: Array<{
    id: string;
    name: string;
    fields: Record<string, any>;
    agencies?: Array<{
      id: string;
      fields: Record<string, any>;
    }>;
    projects?: Array<{
      id: string;
      fields: Record<string, any>;
      agencies?: Array<{
        id: string;
        fields: Record<string, any>;
      }>;
    }>;
  }>;
  loading: boolean;
  onOpenOrganizationModal?: (orgKey: string) => void;
  onOpenProjectModal?: (productKey: string) => void;
}

export default function DonorModal({
  donorCountry,
  nestedOrganizations = [],
  loading,
  onOpenOrganizationModal,
  onOpenProjectModal,
}: DonorModalProps): React.ReactElement {
  // Hover state for project items
  const [hoveredProjectId, setHoveredProjectId] = useState<string | null>(null);
  // Track expanded agencies (all expanded by default)
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(
    new Set(),
  );
  // Track expanded headquartered organizations
  const [isHeadquarteredExpanded, setIsHeadquarteredExpanded] = useState(false);
  // Member states state
  const [memberStates, setMemberStates] = useState<string[]>([]);

  // Load member states on mount
  useEffect(() => {
    getMemberStates().then((states) => setMemberStates(states));
  }, []);

  // Reusable subheader component - Major sections - smaller than main title
  const SubHeader = ({ children }: { children: React.ReactNode }) => (
    <h3 className="font-roboto text-left text-lg leading-normal font-bold text-[#333333]">
      {children}
    </h3>
  );

  // Compact stat card for modal header - matching dashboard StatCard style
  const CompactStatCard = ({
    icon: Icon,
    value,
    label,
  }: {
    icon: typeof Building2;
    value: number;
    label: string;
  }) => (
    <div className="rounded-lg bg-gradient-to-br from-[var(--brand-bg-lighter)] to-[var(--brand-bg-light)] p-4">
      <div className="mb-1 flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
        <span className="font-qanelas-subtitle text-sm font-black text-slate-700 uppercase">
          {label}
        </span>
      </div>
      <div className="font-mono text-2xl leading-none font-bold text-[var(--brand-primary)] tabular-nums">
        {value}
      </div>
    </div>
  );

  // Helper function to extract first sentence from text
  const getFirstSentence = (text: string): string => {
    if (!text || text.trim().length === 0) return "";
    const match = text.match(/^[^.!?]*[.!?]/);
    return match ? match[0].trim() : text.trim();
  };

  // Find the actual donor country name from the data by matching URL slug
  const donorDisplayName = useMemo(() => {
    if (!donorCountry || !nestedOrganizations) return donorCountry || "";

    // Collect all unique country names from the data
    const countryNames = new Set<string>();
    nestedOrganizations.forEach((org) => {
      // From agencies
      (org.agencies || []).forEach((agency) => {
        const country = agency.fields?.["Country Name"];
        if (country) countryNames.add(country);
      });
      // From projects' agencies
      (org.projects || []).forEach((project) => {
        (project.agencies || []).forEach((agency) => {
          const country = agency.fields?.["Country Name"];
          if (country) countryNames.add(country);
        });
      });
      // From HQ country
      const hqCountry = org.fields?.["Org HQ Country"];
      if (Array.isArray(hqCountry)) {
        hqCountry.forEach((c) => countryNames.add(c));
      } else if (hqCountry) {
        countryNames.add(hqCountry);
      }
    });

    // Find the country that matches the URL slug
    const match = Array.from(countryNames).find((name) =>
      matchesUrlSlug(donorCountry, name),
    );
    return match || donorCountry;
  }, [donorCountry, nestedOrganizations]);

  // Handle opening organization modal (close donor modal first)
  const handleOpenOrganization = (orgKey: string) => {
    window.dispatchEvent(new CustomEvent("closeDonorModal"));
    setTimeout(() => {
      onOpenOrganizationModal?.(orgKey);
    }, 50);
  };

  // Handle opening project modal (close donor modal first)
  const handleOpenProject = (productKey: string) => {
    window.dispatchEvent(new CustomEvent("closeDonorModal"));
    setTimeout(() => {
      onOpenProjectModal?.(productKey);
    }, 50);
  };

  // Build agency data structure from nested organizations
  // Only include directly financed organizations and projects (those with this agency at their level)
  const agencyData = useMemo(() => {
    if (!donorCountry || !nestedOrganizations) return [];

    const agencyMap = new Map<string, AgencyData>();

    nestedOrganizations.forEach((org) => {
      const orgFields = org.fields || {};
      const orgName =
        orgFields["Org Full Name"] || orgFields["Org Short Name"] || org.name;
      const orgShortName = orgFields["org_key"] || "";

      // Check organization-level agencies - organization is directly funded by this agency
      (org.agencies || []).forEach((agency) => {
        const agencyFields = agency.fields || {};
        const agencyCountry = agencyFields["Country Name"];

        // Match donor country using URL slug format (handles lowercase with dashes)
        if (agencyCountry && matchesUrlSlug(donorCountry, agencyCountry)) {
          const agencyName =
            agencyFields["Agency/Department Name"] || "Unspecified Agency";
          const agencyId = agency.id;
          const agencyPortal = agencyFields["Agency Website"];

          if (!agencyMap.has(agencyId)) {
            agencyMap.set(agencyId, {
              agency: {
                id: agencyId,
                name: agencyName,
                dataPortal: agencyPortal,
              },
              organizations: [],
              projects: [],
            });
          }

          const agencyEntry = agencyMap.get(agencyId)!;

          // Add organization if not already added
          if (!agencyEntry.organizations.some((o) => o.id === org.id)) {
            agencyEntry.organizations.push({
              id: org.id,
              name: orgName,
              shortName: orgShortName,
            });
          }
        }
      });

      // Check project-level agencies - project is directly funded by this agency
      (org.projects || []).forEach((project) => {
        const projectAgencies = project.agencies || [];

        projectAgencies.forEach((agency) => {
          const agencyFields = agency.fields || {};
          const agencyCountry = agencyFields["Country Name"];

          // Match donor country using URL slug format (handles lowercase with dashes)
          if (agencyCountry && matchesUrlSlug(donorCountry, agencyCountry)) {
            const agencyName =
              agencyFields["Agency/Department Name"] || "Unspecified Agency";
            const agencyId = agency.id;
            const agencyPortal = agencyFields["Agency Website"];

            if (!agencyMap.has(agencyId)) {
              agencyMap.set(agencyId, {
                agency: {
                  id: agencyId,
                  name: agencyName,
                  dataPortal: agencyPortal,
                },
                organizations: [],
                projects: [],
              });
            }

            const agencyEntry = agencyMap.get(agencyId)!;

            // Add project if not already added
            const projectFields = project.fields || {};
            const projectName =
              projectFields["Project/Product Name"] || "Unnamed Project";
            const projectDescription =
              projectFields["Project Description"] || "";
            const productKey = projectFields["product_key"] || "";

            if (!agencyEntry.projects.some((p) => p.id === project.id)) {
              agencyEntry.projects.push({
                id: project.id,
                name: projectName,
                description: projectDescription,
                productKey: productKey,
              });
            }
          }
        });
      });
    });

    // Convert to array and sort by agency name
    const result = Array.from(agencyMap.values());
    result.sort((a, b) => a.agency.name.localeCompare(b.agency.name));

    // Sort organizations and projects within each agency
    result.forEach((agencyData) => {
      agencyData.organizations.sort((a, b) => a.name.localeCompare(b.name));
      agencyData.projects.sort((a, b) => a.name.localeCompare(b.name));
    });

    return result;
  }, [donorCountry, nestedOrganizations]);

  // Calculate totals
  const totalOrganizations = useMemo(() => {
    const orgIds = new Set<string>();
    agencyData.forEach((ad) => {
      ad.organizations.forEach((org) => orgIds.add(org.id));
    });
    return orgIds.size;
  }, [agencyData]);

  const totalProjects = useMemo(() => {
    const projectIds = new Set<string>();
    agencyData.forEach((ad) => {
      ad.projects.forEach((p) => projectIds.add(p.id));
    });
    return projectIds.size;
  }, [agencyData]);

  // Find organizations headquartered in this country
  const headquarteredOrganizations = useMemo(() => {
    if (!donorCountry || !nestedOrganizations) return [];

    return nestedOrganizations
      .filter((org) => {
        const orgFields = org.fields || {};
        const hqCountry = orgFields["Org HQ Country"];
        // Handle both array and string format, using URL slug matching
        if (Array.isArray(hqCountry)) {
          return hqCountry.some((c: string) => matchesUrlSlug(donorCountry, c));
        }
        return hqCountry && matchesUrlSlug(donorCountry, hqCountry);
      })
      .map((org) => {
        const orgFields = org.fields || {};
        return {
          id: org.id,
          name:
            orgFields["Org Full Name"] ||
            orgFields["Org Short Name"] ||
            org.name,
          shortName: orgFields["org_key"] || orgFields["Org Short Name"] || "",
          type: orgFields["Org Type"] || "",
          projectCount: (org.projects || []).length,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [donorCountry, nestedOrganizations]);

  const renderHeader = ({
    showCopied,
    onShare,
    onClose,
  }: {
    showCopied: boolean;
    onShare: () => void;
    onClose: () => void;
  }) => {
    if (!donorCountry) {
      return (
        <ModalHeader
          icon={
            <Building2 className="h-6 w-6 shrink-0 text-[#333333] sm:h-7 sm:w-7" />
          }
          title={labels.modals.donorNotFound}
          showCopied={showCopied}
          onShare={onShare}
          onClose={onClose}
          loading={loading}
        />
      );
    }

    const isMemberState = memberStates.includes(donorDisplayName);

    return (
      <ModalHeader
        icon={
          <CountryFlag
            country={donorDisplayName}
            className="h-6 w-auto shrink-0 rounded object-cover sm:h-8"
          />
        }
        title={donorDisplayName}
        subtitle={
          isMemberState ? (
            <span className="inline-flex items-center rounded bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
              {labels.modals.memberState}
            </span>
          ) : null
        }
        showCopied={showCopied}
        onShare={onShare}
        onClose={onClose}
        loading={loading}
      />
    );
  };

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

    if (!donorCountry) {
      return (
        <div className="p-4 sm:p-6">
          <p className="text-gray-600">Donor information not available.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 p-4 sm:p-6">
        {/* Summary stat cards */}
        <div className="grid grid-cols-3 gap-2">
          <CompactStatCard
            icon={Building}
            value={agencyData.length}
            label={agencyData.length === 1 ? "Agency" : "Agencies"}
          />
          <CompactStatCard
            icon={Building2}
            value={totalOrganizations}
            label={totalOrganizations === 1 ? "Organization" : "Organizations"}
          />
          <CompactStatCard
            icon={Package}
            value={totalProjects}
            label={totalProjects === 1 ? "Product" : "Products"}
          />
        </div>

        {/* Agencies list */}
        {agencyData.length === 0 ? (
          <p className="text-gray-600">{labels.modals.noAgenciesFound}</p>
        ) : (
          <div className="space-y-4">
            {agencyData.map(({ agency, organizations, projects }) => {
              const isExpanded = expandedAgencies.has(agency.id);
              const toggleExpanded = () => {
                setExpandedAgencies((prev) => {
                  const next = new Set(prev);
                  if (next.has(agency.id)) {
                    next.delete(agency.id);
                  } else {
                    next.add(agency.id);
                  }
                  return next;
                });
              };

              return (
                <Collapsible
                  key={agency.id}
                  open={isExpanded}
                  onOpenChange={toggleExpanded}
                >
                  {/* Agency collapsible header box */}
                  <div className="rounded-md border border-slate-200 bg-white p-3 transition-colors hover:bg-slate-50">
                    <div className="flex w-full items-center justify-start gap-2">
                      <CollapsibleTrigger className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-80">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" />
                        )}
                        <SubHeader>{agency.name}</SubHeader>
                      </CollapsibleTrigger>
                      {agency.dataPortal && (
                        <a
                          href={agency.dataPortal}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 transition-colors hover:text-slate-600"
                          title="Agency Website"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                      <span className="text-sm text-slate-400 tabular-nums">
                        ({organizations.length + projects.length})
                      </span>
                    </div>
                  </div>

                  <CollapsibleContent className="mt-2 ml-0">
                    <div className="mt-3 ml-7">
                      {/* Directly funded organizations */}
                      {organizations.length > 0 && (
                        <div className="mb-4 border-b border-slate-200 pb-4">
                          <div className="mb-3 flex items-center gap-2">
                            <span className="letter-spacing text-xs font-semibold tracking-wider text-slate-500 uppercase">
                              {labels.modals.financedOrgs || "Organizations"}
                            </span>
                            <span className="text-xs font-normal text-slate-400 tabular-nums">
                              ({organizations.length})
                            </span>
                          </div>
                          <div className="flex flex-col gap-2">
                            {organizations.map((org) => (
                              <button
                                key={org.id}
                                onClick={() =>
                                  org.shortName &&
                                  handleOpenOrganization(org.shortName)
                                }
                                className="flex w-full cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:opacity-80"
                                style={{
                                  backgroundColor: "var(--brand-bg-light)",
                                  color: "var(--brand-primary-dark)",
                                }}
                              >
                                <Building2 className="h-4 w-4 shrink-0" />
                                <span className="truncate">{org.name}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Directly funded projects */}
                      {projects.length > 0 && (
                        <div>
                          <div className="mb-3 flex items-center gap-2">
                            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                              {labels.modals.financedAssets || "Products"}
                            </span>
                            <span className="text-xs font-normal text-slate-400 tabular-nums">
                              ({projects.length})
                            </span>
                          </div>
                          <div className="flex flex-col gap-2">
                            {projects.map((project) => {
                              const firstSentence = getFirstSentence(
                                project.description || "",
                              );

                              const projectButton = (
                                <button
                                  key={project.id}
                                  onClick={() =>
                                    project.productKey &&
                                    handleOpenProject(project.productKey)
                                  }
                                  onMouseEnter={() =>
                                    setHoveredProjectId(project.id)
                                  }
                                  onMouseLeave={() => setHoveredProjectId(null)}
                                  className="flex w-full cursor-pointer items-center gap-1.5 rounded-md bg-slate-100 px-3 py-2 text-left text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
                                >
                                  {hoveredProjectId === project.id ? (
                                    <PackageOpen className="h-4 w-4 shrink-0 text-slate-600" />
                                  ) : (
                                    <Package className="h-4 w-4 shrink-0 text-slate-600" />
                                  )}
                                  <span className="truncate">
                                    {project.name}
                                  </span>
                                </button>
                              );
                              // Only wrap in tooltip if there's a description
                              const content = <div>{projectButton}</div>;

                              if (firstSentence) {
                                return (
                                  <ModalTooltip
                                    key={project.id}
                                    content={firstSentence}
                                    side="top"
                                    tooltipContainer={tooltipContainer}
                                  >
                                    {content}
                                  </ModalTooltip>
                                );
                              }

                              return <div key={project.id}>{content}</div>;
                            })}
                          </div>
                        </div>
                      )}
                      {/* Show message if agency has no direct funding */}
                      {organizations.length === 0 && projects.length === 0 && (
                        <p className="text-sm text-slate-400 italic">
                          No directly funded organizations or products.
                        </p>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}

        {/* Organizations headquartered in this country */}
        {headquarteredOrganizations.length > 0 && (
          <div className="border-t border-slate-200 pt-6">
            <div className="mb-3 flex items-center gap-2">
              <h3 className="font-roboto text-xl leading-normal font-black tracking-wide text-[#333333] uppercase">
                {labels.modals.headquarteredIn} {donorDisplayName}
              </h3>
              <span className="text-lg font-normal text-slate-600 tabular-nums">
                ({headquarteredOrganizations.length})
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {(() => {
                const showCollapsible = headquarteredOrganizations.length > 5;
                const displayedOrgs =
                  showCollapsible && !isHeadquarteredExpanded
                    ? headquarteredOrganizations.slice(0, 5)
                    : headquarteredOrganizations;

                return (
                  <>
                    {displayedOrgs.map((org) => (
                      <button
                        key={org.id}
                        onClick={() =>
                          org.shortName && handleOpenOrganization(org.shortName)
                        }
                        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors hover:opacity-80"
                        style={{
                          backgroundColor: "var(--brand-bg-light)",
                          color: "var(--brand-primary-dark)",
                        }}
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          <Building2 className="h-4 w-4 shrink-0" />
                          <span className="truncate">{org.name}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {org.type && (
                            <span className="text-var(--brand-primary-dark) rounded bg-transparent px-2 py-0.5 text-xs font-thin">
                              {org.type}
                            </span>
                          )}
                          {org.projectCount > 0 && (
                            <span className="text-var(--brand-primary-dark) text-xs">
                              {org.projectCount}{" "}
                              {org.projectCount === 1 ? "product" : "products"}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                    {showCollapsible && (
                      <button
                        onClick={() =>
                          setIsHeadquarteredExpanded(!isHeadquarteredExpanded)
                        }
                        className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-400"
                      >
                        {isHeadquarteredExpanded ? (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            <span>{labels.ui.showLess}</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            <span>
                              {labels.ui.showMore.replace(
                                "{count}",
                                String(headquarteredOrganizations.length - 5),
                              )}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* Flexible spacer to push notes to bottom */}
        <div className="min-h-8 grow"></div>

        {/* Footnote section */}
        <div className="mt-auto border-t border-slate-200 pt-4 pb-4">
          <div className="mb-2 text-xs font-medium tracking-wider text-slate-400 uppercase">
            {labels.modals.notes}
          </div>
          <div className="space-y-1 text-xs leading-snug text-slate-500">
            <div className="flex items-start">
              <span className="mr-2 shrink-0 text-slate-400">•</span>
              <span>{labels.modals.notesInsights}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseModal
      isOpen={!!donorCountry}
      closeEventName="closeDonorModal"
      loading={loading}
      renderHeader={renderHeader}
      renderBody={renderBody}
    />
  );
}
