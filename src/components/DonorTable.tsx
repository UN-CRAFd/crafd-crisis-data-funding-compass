import React, { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Info, Building2 } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { getIconForInvestmentType } from "@/config/investmentTypeIcons";
import { useTips } from "@/contexts/TipsContext";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tooltip as TooltipUI,
} from "@/components/ui/tooltip";
import labels from "@/config/labels.json";
import { matchesUrlSlug, toUrlSlug } from "@/lib/urlShortcuts";
import type { OrganizationWithProjects, ProjectData } from "@/types/airtable";
import { Badge } from "@/components/shared/Badge";
import { INVESTMENT_TYPE_DESCRIPTIONS } from "@/config/investmentDescriptions";
import { CountryFlag } from "@/components/CountryFlag";
import { OrganizationBox } from "@/components/OrganizationBox";

interface DonorTableProps {
  organizationsWithProjects: OrganizationWithProjects[];
  nestedOrganizations: any[];
  organizationsTable: Array<{
    id: string;
    createdTime?: string;
    fields: Record<string, unknown>;
  }>;
  onOpenOrganizationModal: (orgKey: string) => void;
  onOpenProjectModal: (projectKey: string) => void;
  onOpenDonorModal?: (donorCountry: string) => void;
  combinedDonors: string[];
  sortBy: "name" | "orgs" | "assets";
  sortDirection: "asc" | "desc";
}

export const DonorTable: React.FC<DonorTableProps> = ({
  organizationsWithProjects,
  nestedOrganizations,
  organizationsTable,
  onOpenOrganizationModal,
  onOpenProjectModal,
  onOpenDonorModal,
  combinedDonors,
  sortBy,
  sortDirection,
}) => {
  const [expandedDonors, setExpandedDonors] = useState<Set<string>>(new Set());
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(
    new Set(),
  );
  const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set());

  // Helper to sanitize names for matching (remove parentheses and extra punctuation)
  const sanitizeForMatch = (input?: any) => {
    if (input === null || input === undefined) return "";
    try {
      const s = String(input);
      // Remove parenthetical content e.g. "Norway (Ministry)" -> "Norway"
      const noParens = s.replace(/\s*\([^)]*\)\s*/g, " ");
      // Collapse whitespace and trim
      return noParens.replace(/\s+/g, " ").trim();
    } catch (e) {
      return String(input || "");
    }
  };

  // Generate possible donor aliases to match against agency fields.
  // For example: "International Financial Institutions (IFIs)" -> ["International Financial Institutions (IFIs)", "International Financial Institutions", "IFIs"]
  const donorAliasesFor = (d?: string) => {
    if (!d) return [] as string[];
    const original = String(d).trim();
    const aliases = new Set<string>();
    aliases.add(original);

    // Remove parenthetical content
    const noParens = original
      .replace(/\s*\([^)]*\)\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (noParens) aliases.add(noParens);

    // Extract parenthetical content if present
    const parenMatch = original.match(/\(([^)]+)\)/);
    if (parenMatch && parenMatch[1]) {
      aliases.add(parenMatch[1].trim());
    }

    return Array.from(aliases);
  };
  // Get tips enabled state
  let tipsEnabled = false;
  try {
    const tipsContext = useTips();
    tipsEnabled = tipsContext.tipsEnabled;
  } catch (e) {
    tipsEnabled = false;
  }

  // Group organizations and projects by donor
  const donorData = useMemo(() => {
    const donorMap = new Map<
      string,
      {
        organizations: Map<
          string,
          {
            org: OrganizationWithProjects;
            projects: ProjectData[];
            isOrgLevel: boolean;
          }
        >;
      }
    >();

    organizationsWithProjects.forEach((org) => {
      // Get org-level donors
      const orgLevelDonors = org.donorCountries || [];

      // Add org to each org-level donor
      orgLevelDonors.forEach((donor) => {
        if (!donorMap.has(donor)) {
          donorMap.set(donor, { organizations: new Map() });
        }
        const donorEntry = donorMap.get(donor)!;

        if (!donorEntry.organizations.has(org.id)) {
          donorEntry.organizations.set(org.id, {
            org,
            projects: [],
            isOrgLevel: true,
          });
        }
        // Add all org projects to this donor
        donorEntry.organizations.get(org.id)!.projects = [...org.projects];
      });

      // Also check project-level donors
      org.projects.forEach((project) => {
        const projectDonors = project.donorCountries || [];
        projectDonors.forEach((donor) => {
          if (!donorMap.has(donor)) {
            donorMap.set(donor, { organizations: new Map() });
          }
          const donorEntry = donorMap.get(donor)!;

          if (!donorEntry.organizations.has(org.id)) {
            // Org not yet added to this donor (project-only relationship)
            donorEntry.organizations.set(org.id, {
              org,
              projects: [project],
              isOrgLevel: false,
            });
          } else {
            // Org already exists, ensure this project is included
            const orgEntry = donorEntry.organizations.get(org.id)!;
            if (!orgEntry.projects.find((p) => p.id === project.id)) {
              orgEntry.projects.push(project);
            }
          }
        });
      });
    });

    // Convert to array and sort
    return Array.from(donorMap.entries())
      .map(([donor, data]) => {
        const orgsArray = Array.from(data.organizations.values());

        // Deduplicate projects across all organizations for this donor
        const projectIdSet = new Set<string>();
        orgsArray.forEach((orgData) => {
          (orgData.projects || []).forEach((p: any) => {
            // Prefer `id` as canonical project id, fallback to other identifiers
            const pid =
              p?.id ?? p?.projectId ?? p?.productKey ?? p?.name ?? null;
            if (pid) projectIdSet.add(String(pid));
          });
        });

        // Count unique agencies for this donor
        const agencySet = new Set<string>();
        orgsArray.forEach((orgData) => {
          const nestedOrg = nestedOrganizations.find(
            (n) => n.id === orgData.org.id,
          );
          const agencies = nestedOrg?.agencies || [];

          agencies.forEach((agency: any) => {
            const agencyCountry =
              agency.fields?.["Country Name"] ||
              agency.fields?.["Country"] ||
              agency.fields?.["Agency Associated Country"] ||
              agency.fields?.["Agency/Department Country"];

            let belongsToDonor = false;
            if (agencyCountry) {
              const countryValues = Array.isArray(agencyCountry)
                ? agencyCountry
                : [agencyCountry];
              const aliases = donorAliasesFor(donor);
              belongsToDonor = countryValues.some((c: any) => {
                const candidate = String(c || "");
                return aliases.some((alias) => {
                  return (
                    sanitizeForMatch(candidate).toLowerCase() ===
                    sanitizeForMatch(alias).toLowerCase()
                  );
                });
              });
            }

            if (belongsToDonor) {
              const agencyName =
                agency.fields?.["Agency Name"] ||
                agency.fields?.["Funding Agency"] ||
                agency.fields?.["Agency/Department Name"];
              if (agencyName) {
                if (Array.isArray(agencyName)) {
                  agencyName.forEach((name) => {
                    if (name && name.trim()) {
                      agencySet.add(name);
                    }
                  });
                } else if (agencyName.trim()) {
                  agencySet.add(agencyName);
                }
              }
            }
          });
        });

        return {
          donor,
          organizations: orgsArray,
          totalOrgs: data.organizations.size,
          totalProjects: projectIdSet.size,
          totalAgencies: agencySet.size,
        };
      })
      .sort((a, b) => {
        // Always prefer selected/filtered donors (combinedDonors) to the top
        const aSelected = combinedDonors.includes(a.donor);
        const bSelected = combinedDonors.includes(b.donor);
        if (aSelected && !bSelected) return -1;
        if (!aSelected && bSelected) return 1;

        let comparison = 0;

        if (sortBy === "name") {
          comparison = b.donor.localeCompare(a.donor);
        } else if (sortBy === "orgs") {
          comparison = a.totalOrgs - b.totalOrgs;
        } else if (sortBy === "assets") {
          comparison = a.totalProjects - b.totalProjects;
        }

        // Apply sort direction
        return sortDirection === "asc" ? comparison : -comparison;
      });
  }, [organizationsWithProjects, combinedDonors, sortBy, sortDirection]);

  return (
    <div className="space-y-2 transition-all duration-500">
      {donorData.map(({ donor, organizations, totalOrgs, totalProjects, totalAgencies }) => {
        const isDonorExpanded = expandedDonors.has(donor);
        const isSelected = combinedDonors.includes(donor);

        return (
          <Collapsible
            key={donor}
            open={isDonorExpanded}
            onOpenChange={() => {
              const newExpanded = new Set(expandedDonors);
              if (isDonorExpanded) {
                newExpanded.delete(donor);
              } else {
                newExpanded.add(donor);
              }
              setExpandedDonors(newExpanded);
            }}
            className="transition-all duration-500 ease-out"
          >
            <CollapsibleTrigger className="w-full">
              <div
                className={`flex flex-col rounded-lg border p-3 sm:flex-row sm:justify-between sm:p-4 ${
                  isSelected
                    ? "border-[var(--brand-primary)] bg-[var(--brand-bg-lighter)] hover:bg-[var(--brand-bg-light)]/90"
                    : "border-slate-200 bg-slate-50/30 hover:bg-slate-50/70"
                } min-h-[60px] animate-in cursor-pointer gap-3 fade-in sm:gap-0`}
              >
                <div className="flex flex-1 items-center space-x-3">
                  <CountryFlag
                    country={donor}
                    width={32}
                    height={32}
                    className="h-8 w-8 flex-shrink-0 object-cover"
                  />
                  <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                    {isDonorExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    )}
                  </div>
                  <div className="mt-0 mb-0 min-w-0 flex-1 space-y-0 text-left">
                    <h3
                      className={`cursor-pointer text-sm font-medium transition-colors hover:text-[var(--brand-primary)] sm:text-base ${
                        isSelected
                          ? "text-[var(--brand-primary)]"
                          : "text-slate-900"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onOpenDonorModal) {
                          onOpenDonorModal(donor);
                        }
                      }}
                    >
                      {donor}
                    </h3>
                    <div className="mt-0 text-xs text-slate-500 sm:text-sm">
                      {totalAgencies} agenc{totalAgencies !== 1 ? "ies" : "y"} ·{" "}
                      {totalOrgs} organization{totalOrgs !== 1 ? "s" : ""} ·{" "}
                      {totalProjects} asset{totalProjects !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
                <div className="flex min-w-[100px] flex-shrink-0 flex-col items-end justify-between self-stretch">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenDonorModal) {
                        onOpenDonorModal(donor);
                      }
                    }}
                    className="hidden h-6 items-center justify-center gap-1 rounded-md bg-[var(--badge-slate-text)] px-2 text-[10px] text-[var(--badge-slate-bg)] duration-150 hover:bg-slate-400 sm:inline-flex"
                  >
                    <div className="hidden items-center justify-center gap-1 border-none sm:inline-flex">
                      <Info className="h-3 w-3" />
                      <span>Details</span>
                    </div>
                  </Button>
                  <div className="text-xs whitespace-nowrap text-slate-400 sm:text-xs">
                    {isDonorExpanded
                      ? `Showing ${totalOrgs} organization${totalOrgs === 1 ? "" : "s"}`
                      : `Show ${totalOrgs} organization${totalOrgs === 1 ? "" : "s"}`}
                  </div>
                </div>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 ml-4 space-y-2 sm:ml-7">
                {organizations.map(({ org, projects, isOrgLevel }) => {
                  const isOrgExpanded = expandedOrgs.has(org.id);
                  const hasProjects = projects.length > 0;

                  return (
                    <Collapsible
                      key={org.id}
                      open={isOrgExpanded}
                      onOpenChange={() => {
                        const newExpanded = new Set(expandedOrgs);
                        if (isOrgExpanded) {
                          newExpanded.delete(org.id);
                        } else {
                          newExpanded.add(org.id);
                        }
                        setExpandedOrgs(newExpanded);
                      }}
                      className="transition-all duration-500 ease-out"
                    >
                      <CollapsibleTrigger className="w-full">
                        <OrganizationBox
                          orgId={org.id}
                          organizationName={org.organizationName}
                          nestedOrganizations={nestedOrganizations}
                          organizationsTable={organizationsTable}
                          isExpanded={isOrgExpanded}
                          hasProjects={hasProjects}
                          onOpenOrganizationModal={onOpenOrganizationModal}
                          logoErrors={logoErrors}
                          onLogoError={(orgId) => setLogoErrors((prev) => new Set([...prev, orgId]))}
                          headingLevel="h4"
                          showDetailsButton={false}
                          projectCount={projects.length}
                          projectLabel={projects.length === 1 ? "asset" : "assets"}
                        >
                          {!isOrgLevel && (
                            <Badge
                              text="Project-Level Funding"
                              variant="slate"
                              className="text-xs text-[9px] opacity-70 sm:text-[10px]"
                              title="This donor only funds specific projects, not the organization as a whole"
                            />
                          )}
                          {(() => {
                            const isAgenciesExpanded = expandedAgencies.has(`org-${org.id}`);
                            // Get agencies for this org from nestedOrganizations
                            const nestedOrg = nestedOrganizations.find((n) => n.id === org.id);
                            const agencies = nestedOrg?.agencies || [];

                                  // Extract unique agency names that belong to the current donor
                                  const agencyNames = new Set<string>();
                                  agencies.forEach((agency: any) => {
                                    // Get the country/donor from this agency
                                    const agencyCountry =
                                      agency.fields?.["Country Name"] ||
                                      agency.fields?.["Country"] ||
                                      agency.fields?.[
                                        "Agency Associated Country"
                                      ] ||
                                      agency.fields?.[
                                        "Agency/Department Country"
                                      ];

                                    // Check if this agency's country matches the current donor we're iterating
                                    let belongsToDonor = false;
                                    if (agencyCountry) {
                                      const countryValues = Array.isArray(
                                        agencyCountry,
                                      )
                                        ? agencyCountry
                                        : [agencyCountry];
                                      const aliases = donorAliasesFor(donor);
                                      belongsToDonor = countryValues.some(
                                        (c: any) => {
                                          const candidate = String(c || "");
                                          // Try matching against any alias (slug compare preferred)
                                          return aliases.some((alias) => {
                                            try {
                                              return matchesUrlSlug(
                                                toUrlSlug(alias),
                                                candidate,
                                              );
                                            } catch {
                                              return (
                                                sanitizeForMatch(
                                                  candidate,
                                                ).toLowerCase() ===
                                                sanitizeForMatch(
                                                  alias,
                                                ).toLowerCase()
                                              );
                                            }
                                          });
                                        },
                                      );
                                    }

                                    if (belongsToDonor) {
                                      const agencyName =
                                        agency.fields?.["Agency Name"] ||
                                        agency.fields?.["Funding Agency"] ||
                                        agency.fields?.[
                                          "Agency/Department Name"
                                        ];
                                      if (agencyName) {
                                        if (Array.isArray(agencyName)) {
                                          agencyName.forEach((name) => {
                                            if (
                                              name &&
                                              name.trim() !==
                                                "Unspecified Agency"
                                            ) {
                                              agencyNames.add(name);
                                            }
                                          });
                                        } else if (
                                          agencyName.trim() !==
                                          "Unspecified Agency"
                                        ) {
                                          agencyNames.add(agencyName);
                                        }
                                      }
                                    }
                                  });

                                  const agencyArray =
                                    Array.from(agencyNames).sort();
                                  const maxAgenciesToShow = 3;
                                  const agenciesToShow = isAgenciesExpanded
                                    ? agencyArray
                                    : agencyArray.slice(0, maxAgenciesToShow);

                                  if (agencyArray.length === 0) return null;

                                  return (
                                    <>
                                      {agenciesToShow.map((agency, idx) => (
                                        <Badge
                                          key={idx}
                                          text={agency}
                                          variant="agency"
                                          className="text-[9px] sm:text-[10px]"
                                          title={`Funding Agency: ${agency}`}
                                        />
                                      ))}
                                      {agencyArray.length > maxAgenciesToShow &&
                                        !isAgenciesExpanded && (
                                          <div
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const newExpanded = new Set(
                                                expandedAgencies,
                                              );
                                              newExpanded.add(`org-${org.id}`);
                                              setExpandedAgencies(newExpanded);
                                            }}
                                            className="bg-slate-000 inline-flex cursor-pointer items-center rounded-md px-2 py-1 text-xs font-medium text-slate-900 transition-colors hover:bg-slate-100"
                                          >
                                            +
                                            {agencyArray.length -
                                              maxAgenciesToShow}{" "}
                                            more
                                          </div>
                                        )}
                                      {isAgenciesExpanded &&
                                        agencyArray.length >
                                          maxAgenciesToShow && (
                                          <div
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const newExpanded = new Set(
                                                expandedAgencies,
                                              );
                                              newExpanded.delete(
                                                `org-${org.id}`,
                                              );
                                              setExpandedAgencies(newExpanded);
                                            }}
                                            className="bg-slate-000 inline-flex cursor-pointer items-center rounded-md px-2 py-1 text-xs font-medium text-slate-900 transition-colors hover:bg-slate-100"
                                          >
                                            Show less
                                          </div>
                                        )}
                                    </>
                                  );
                                })()}
                        </OrganizationBox>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="mt-2 ml-7 space-y-2 sm:ml-12">
                          {projects.map((project: ProjectData) => (
                            <div
                              key={project.id}
                              className="group animate-in cursor-pointer rounded-lg border border-slate-100 bg-slate-50/50 p-2 transition-colors duration-200 fade-in hover:bg-slate-50 sm:p-2.5"
                              onClick={() => {
                                const nestedOrg = nestedOrganizations.find(
                                  (n: any) => n.id === org.id,
                                );
                                const nestedProject = nestedOrg?.projects?.find(
                                  (p: any) => p.id === project.id,
                                );
                                const projectKey =
                                  nestedProject?.fields?.product_key;
                                if (projectKey) {
                                  onOpenProjectModal(projectKey);
                                }
                              }}
                            >
                              <div className="mt-1 mb-0">
                                <div className="flex flex-wrap items-center gap-1.5 gap-y-0.5">
                                  <span className="ml-2group-hover:text-[var(--badge-other-border)] text-md sm:text-md font-medium text-slate-900 transition-colors">
                                    {project.projectName}
                                  </span>
                                  {project.investmentTypes &&
                                    project.investmentTypes.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-1">
                                        {project.investmentTypes.map(
                                          (type, idx) => {
                                            const IconComponent =
                                              getIconForInvestmentType(type);
                                            const description =
                                              INVESTMENT_TYPE_DESCRIPTIONS[
                                                type
                                              ];
                                            const badge = (
                                              <span
                                                key={idx}
                                                className="inline-flex cursor-help items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                                                style={{
                                                  backgroundColor:
                                                    "var(--badge-other-bg)",
                                                  color:
                                                    "var(--badge-other-text)",
                                                }}
                                              >
                                                <IconComponent className="h-3.5 w-3.5" />
                                                {type}
                                              </span>
                                            );

                                            if (description && tipsEnabled) {
                                              return (
                                                <TooltipProvider key={idx}>
                                                  <TooltipUI
                                                    delayDuration={200}
                                                  >
                                                    <TooltipTrigger asChild>
                                                      {badge}
                                                    </TooltipTrigger>
                                                    <TooltipContent
                                                      side="top"
                                                      className="!z-[300] max-w-xs border border-gray-200 bg-white/70 text-xs backdrop-blur-md"
                                                      sideOffset={5}
                                                    >
                                                      {description}
                                                    </TooltipContent>
                                                  </TooltipUI>
                                                </TooltipProvider>
                                              );
                                            }

                                            return badge;
                                          },
                                        )}
                                      </div>
                                    )}
                                </div>
                              </div>
                              <div>
                                <div className="flex flex-wrap gap-0.5"></div>
                                {/* Agency badges for project */}
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {(() => {
                                    const isAgenciesExpanded =
                                      expandedAgencies.has(
                                        `project-${project.id}`,
                                      );

                                    // Get agencies for this project from nestedOrganizations
                                    const nestedOrg = nestedOrganizations.find(
                                      (n: any) => n.id === org.id,
                                    );
                                    const nestedProject =
                                      nestedOrg?.projects?.find(
                                        (p: any) => p.id === project.id,
                                      );
                                    const agencies =
                                      nestedProject?.agencies || [];

                                    // Extract unique agency names that belong to the current donor
                                    const agencyNames = new Set<string>();
                                    agencies.forEach((agency: any) => {
                                      // Check if this agency belongs to the current donor
                                      // Look for donor field first, then fall back to country fields
                                      const donorField =
                                        agency.fields?.["Donor"] ||
                                        agency.fields?.["Funding Country"] ||
                                        agency.fields?.["Organization Donor"];
                                      const agencyCountry =
                                        agency.fields?.["Country Name"] ||
                                        agency.fields?.["Country"] ||
                                        agency.fields?.[
                                          "Agency Associated Country"
                                        ] ||
                                        agency.fields?.[
                                          "Agency/Department Country"
                                        ];

                                      // Check if agency belongs to current donor
                                      let belongsToDonor = false;

                                      // Check donor field first
                                      if (donorField) {
                                        const donorValues = Array.isArray(
                                          donorField,
                                        )
                                          ? donorField
                                          : [donorField];
                                        const aliases = donorAliasesFor(donor);
                                        belongsToDonor = donorValues.some(
                                          (d: any) => {
                                            const candidate = String(d || "");
                                            return aliases.some((alias) => {
                                              try {
                                                return matchesUrlSlug(
                                                  toUrlSlug(alias),
                                                  candidate,
                                                );
                                              } catch {
                                                return (
                                                  sanitizeForMatch(
                                                    candidate,
                                                  ).toLowerCase() ===
                                                  sanitizeForMatch(
                                                    alias,
                                                  ).toLowerCase()
                                                );
                                              }
                                            });
                                          },
                                        );
                                      }

                                      // Fall back to country field if no donor field match
                                      if (!belongsToDonor && agencyCountry) {
                                        const countryValues = Array.isArray(
                                          agencyCountry,
                                        )
                                          ? agencyCountry
                                          : [agencyCountry];
                                        const aliases = donorAliasesFor(donor);
                                        belongsToDonor = countryValues.some(
                                          (c: any) => {
                                            const candidate = String(c || "");
                                            return aliases.some((alias) => {
                                              try {
                                                return matchesUrlSlug(
                                                  toUrlSlug(alias),
                                                  candidate,
                                                );
                                              } catch {
                                                return (
                                                  sanitizeForMatch(
                                                    candidate,
                                                  ).toLowerCase() ===
                                                  sanitizeForMatch(
                                                    alias,
                                                  ).toLowerCase()
                                                );
                                              }
                                            });
                                          },
                                        );
                                      }

                                      if (belongsToDonor) {
                                        const agencyName =
                                          agency.fields?.["Agency Name"] ||
                                          agency.fields?.["Funding Agency"] ||
                                          agency.fields?.[
                                            "Agency/Department Name"
                                          ];
                                        if (agencyName) {
                                          if (Array.isArray(agencyName)) {
                                            agencyName.forEach((name) => {
                                              if (
                                                name &&
                                                name.trim() !==
                                                  "Unspecified Agency"
                                              ) {
                                                agencyNames.add(name);
                                              }
                                            });
                                          } else if (
                                            agencyName.trim() !==
                                            "Unspecified Agency"
                                          ) {
                                            agencyNames.add(agencyName);
                                          }
                                        }
                                      }
                                    });

                                    const agencyArray =
                                      Array.from(agencyNames).sort();
                                    const maxAgenciesToShow = 3;
                                    const agenciesToShow = isAgenciesExpanded
                                      ? agencyArray
                                      : agencyArray.slice(0, maxAgenciesToShow);

                                    if (agencyArray.length === 0) return null;

                                    return (
                                      <>
                                        {agenciesToShow.map((agency, idx) => (
                                          <Badge
                                            key={idx}
                                            text={agency}
                                            variant="agency"
                                            className="text-[9px] sm:text-[10px]"
                                            title={`Funding Agency: ${agency}`}
                                          />
                                        ))}
                                        {agencyArray.length >
                                          maxAgenciesToShow &&
                                          !isAgenciesExpanded && (
                                            <div
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const newExpanded = new Set(
                                                  expandedAgencies,
                                                );
                                                newExpanded.add(
                                                  `project-${project.id}`,
                                                );
                                                setExpandedAgencies(
                                                  newExpanded,
                                                );
                                              }}
                                              className="bg-slate-000 inline-flex cursor-pointer items-center rounded-md px-2 py-1 text-xs font-medium text-slate-900 transition-colors hover:bg-slate-100"
                                            >
                                              +
                                              {agencyArray.length -
                                                maxAgenciesToShow}{" "}
                                              more
                                            </div>
                                          )}
                                        {isAgenciesExpanded &&
                                          agencyArray.length >
                                            maxAgenciesToShow && (
                                            <div
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const newExpanded = new Set(
                                                  expandedAgencies,
                                                );
                                                newExpanded.delete(
                                                  `project-${project.id}`,
                                                );
                                                setExpandedAgencies(
                                                  newExpanded,
                                                );
                                              }}
                                              className="bg-slate-000 inline-flex cursor-pointer items-center rounded-md px-2 py-1 text-xs font-medium text-slate-900 transition-colors hover:bg-slate-100"
                                            >
                                              Show less
                                            </div>
                                          )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
};

export default DonorTable;
