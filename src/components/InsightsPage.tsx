"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageHeader from "@/components/PageHeader";
import ChartCard from "@/components/ChartCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip as TooltipUI,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Network,
  Globe,
  Building2,
  Database,
  ChevronDown,
  X,
} from "lucide-react";
import { SectionHeader } from "@/components/SectionHeader";
import { toUrlSlug, matchesUrlSlug } from "@/lib/urlShortcuts";
import {
  getOrgColorIntensity,
  getProjectColorIntensity,
} from "@/lib/colorUtils";
import { processDashboardData } from "@/lib/data";
import type { OrganizationWithProjects } from "@/types/airtable";
import labels from "@/config/labels.json";

const NetworkGraph = dynamic(() => import("@/components/NetworkGraph"), {
  ssr: false,
});

// ---------- types -------------------------------------------------------

interface NestedOrg {
  id: string;
  name?: string;
  fields?: Record<string, unknown>;
  agencies?: Array<{ id: string; fields?: Record<string, unknown> }>;
  projects?: Array<{
    id: string;
    name?: string;
    fields?: Record<string, unknown>;
    agencies?: Array<{ id: string; fields?: Record<string, unknown> }>;
  }>;
}

// ---------- helpers -----------------------------------------------------

const TOOLTIP_STYLE = {
  backgroundColor: "var(--tooltip-bg)",
  backdropFilter: "blur(12px)",
  border: "1px solid var(--tooltip-border)",
  borderRadius: "10px",
  fontSize: "12px",
  padding: "8px",
} as const;

function getDonorsForOrg(org: NestedOrg): string[] {
  const set = new Set<string>();
  org.agencies?.forEach((a) => {
    const name = a.fields?.["Country Name"];
    if (typeof name === "string") set.add(name);
  });
  org.projects?.forEach((p) =>
    p.agencies?.forEach((a) => {
      const name = a.fields?.["Country Name"];
      if (typeof name === "string") set.add(name);
    }),
  );
  return Array.from(set);
}

// ---------- component ---------------------------------------------------

export default function InsightsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [organizationsData, setOrganizationsData] = useState<NestedOrg[]>([]);
  const [orgAgenciesMap, setOrgAgenciesMap] = useState<Record<string, Record<string, string[]>>>({});
  const [dashboardData, setDashboardData] = useState<{
    organizationsWithProjects: OrganizationWithProjects[];
    allOrganizations: OrganizationWithProjects[];
    investmentThemes: string[];
    investmentThemesByType: Record<string, string[]>;
  } | null>(null);
  const [selectedDonors, setSelectedDonors] = useState<string[]>([]);
  const [donorDropdownOpen, setDonorDropdownOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // --------------- data loading ----------------------------------------

  useEffect(() => {
    fetch("/api/nested-organizations")
      .then((r) => r.json())
      .then((data: NestedOrg[]) => setOrganizationsData(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/modal-maps")
      .then((r) => r.json())
      .then((data) => {
        if (data?.orgAgenciesMap) setOrgAgenciesMap(data.orgAgenciesMap);
      })
      .catch(() => {});
  }, []);

  // Load URL donor params on mount
  useEffect(() => {
    const raw = searchParams.get("d") ?? searchParams.get("donors") ?? "";
    const slugs = raw.split(",").filter(Boolean);
    if (slugs.length > 0) {
      // Donors will be resolved once org data is loaded
      (window as Record<string, unknown>).__insightsDonorSlugs = slugs;
    }
    setIsInitialized(true);
  }, [searchParams]);

  // Resolve slug → display name once orgs are loaded
  const availableDonorCountries = useMemo(() => {
    const set = new Set<string>();
    organizationsData.forEach((org) =>
      getDonorsForOrg(org).forEach((d) => set.add(d)),
    );
    return Array.from(set).sort();
  }, [organizationsData]);

  useEffect(() => {
    if (availableDonorCountries.length === 0) return;
    const slugs = (window as Record<string, unknown>).__insightsDonorSlugs as
      | string[]
      | undefined;
    if (!slugs) return;
    const decoded = slugs
      .map((slug) => availableDonorCountries.find((d) => matchesUrlSlug(slug, d)))
      .filter((d): d is string => Boolean(d));
    if (decoded.length > 0) setSelectedDonors(decoded);
    delete (window as Record<string, unknown>).__insightsDonorSlugs;
  }, [availableDonorCountries]);

  // Sync URL when selectedDonors changes (after initialization)
  useEffect(() => {
    if (!isInitialized) return;
    const params = new URLSearchParams();
    if (selectedDonors.length > 0) {
      params.set("d", selectedDonors.map(toUrlSlug).join(","));
    }
    const newUrl = params.toString() ? `/insights?${params.toString()}` : "/insights";
    const current = window.location.pathname + window.location.search;
    if (current !== newUrl) router.replace(newUrl, { scroll: false });
  }, [selectedDonors, isInitialized, router]);

  // Fetch dashboard data whenever selected donors change
  useEffect(() => {
    processDashboardData(
      selectedDonors.length > 0
        ? { donorCountries: selectedDonors }
        : {},
    ).then((data) => {
      setDashboardData({
        organizationsWithProjects: data.organizationsWithProjects,
        allOrganizations: data.allOrganizations,
        investmentThemes: data.investmentThemes,
        investmentThemesByType: data.investmentThemesByType,
      });
    }).catch(() => {});
  }, [selectedDonors]);

  // --------------- derived data (co-financing matrix) ------------------

  const coFinancingMatrix = useMemo(() => {
    type Cell = { projects: Set<string>; orgs: Set<string> };
    const matrix: Record<string, Record<string, Cell>> = {};
    selectedDonors.forEach((d1) => {
      matrix[d1] = {};
      selectedDonors.forEach((d2) => {
        matrix[d1][d2] = { projects: new Set(), orgs: new Set() };
      });
    });

    organizationsData.forEach((org) => {
      const orgDonors = getDonorsForOrg(org);
      const orgName = String(org.name ?? org.fields?.["Organization Name"] ?? "");

      selectedDonors.forEach((d1, i) => {
        selectedDonors.forEach((d2, j) => {
          if (i === j) return;
          if (orgDonors.includes(d1) && orgDonors.includes(d2)) {
            matrix[d1][d2].orgs.add(`${org.id}-${orgName}`);
            org.projects?.forEach((p) => {
              const pName = String(p.fields?.["Project Name"] ?? p.name ?? "");
              matrix[d1][d2].projects.add(`${p.id}-${pName}`);
            });
          }
        });
      });
    });
    return matrix;
  }, [organizationsData, selectedDonors]);

  const maxValues = useMemo(() => {
    let maxProjects = 0;
    let maxOrgs = 0;
    selectedDonors.forEach((d1) =>
      selectedDonors.forEach((d2) => {
        if (d1 !== d2) {
          maxProjects = Math.max(
            maxProjects,
            coFinancingMatrix[d1]?.[d2]?.projects.size ?? 0,
          );
          maxOrgs = Math.max(
            maxOrgs,
            coFinancingMatrix[d1]?.[d2]?.orgs.size ?? 0,
          );
        }
      }),
    );
    return { maxProjects, maxOrgs };
  }, [coFinancingMatrix, selectedDonors]);

  const donorTotals = useMemo(() => {
    const totals: Record<string, { orgs: Set<string>; projects: Set<string> }> = {};
    selectedDonors.forEach((d) => {
      totals[d] = { orgs: new Set(), projects: new Set() };
    });
    organizationsData.forEach((org) => {
      const orgDonors = getDonorsForOrg(org);
      const orgName = String(org.name ?? org.fields?.["Organization Name"] ?? "");
      selectedDonors.forEach((d) => {
        if (orgDonors.includes(d)) {
          totals[d].orgs.add(`${org.id}-${orgName}`);
          org.projects?.forEach((p) => {
            const pName = String(p.fields?.["Project Name"] ?? p.name ?? "");
            totals[d].projects.add(`${p.id}-${pName}`);
          });
        }
      });
    });
    return totals;
  }, [organizationsData, selectedDonors]);

  const organizationsWithDonorCounts = useMemo(() => {
    if (selectedDonors.length < 2) return [];
    const map: Record<string, { name: string; donors: Set<string>; id: string }> = {};
    organizationsData.forEach((org) => {
      const orgDonors = getDonorsForOrg(org);
      const orgName = String(org.name ?? org.fields?.["Organization Name"] ?? "");
      const selectedFunding = new Set(
        selectedDonors.filter((d) => orgDonors.includes(d)),
      );
      if (selectedFunding.size >= 2) {
        const key = `${org.id}-${orgName}`;
        map[key] = { name: orgName, donors: selectedFunding, id: org.id };
      }
    });
    return Object.values(map).sort((a, b) => {
      if (b.donors.size !== a.donors.size) return b.donors.size - a.donors.size;
      return a.name.localeCompare(b.name);
    });
  }, [organizationsData, selectedDonors]);

  // Product type chart data — uses dashboard pipeline's typed investmentTypes field
  const projectTypesData = useMemo(() => {
    const orgs = dashboardData?.organizationsWithProjects ?? [];
    const counts: Record<string, number> = {};
    orgs.forEach((org) =>
      org.projects.forEach((project) => {
        project.investmentTypes.forEach((t) => {
          counts[t] = (counts[t] ?? 0) + 1;
        });
      }),
    );
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [dashboardData]);

  // Investment themes chart data — uses dashboard pipeline's typed investmentThemes field
  const themesData = useMemo(() => {
    const orgs = dashboardData?.organizationsWithProjects ?? [];
    const counts: Record<string, number> = {};
    orgs.forEach((org) =>
      org.projects.forEach((project) => {
        project.investmentThemes.forEach((t) => {
          if (t.trim()) counts[t.trim()] = (counts[t.trim()] ?? 0) + 1;
        });
      }),
    );
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [dashboardData]);

  // --------------- handlers --------------------------------------------

  const handleCellClick = useCallback(
    (d1: string, d2: string) => {
      const params = new URLSearchParams();
      params.set("d", [toUrlSlug(d1), toUrlSlug(d2)].join(","));
      router.push(`/explore?${params.toString()}`);
    },
    [router],
  );

  const toggleDonor = useCallback((donor: string) => {
    setSelectedDonors((prev) =>
      prev.includes(donor) ? prev.filter((d) => d !== donor) : [...prev, donor],
    );
  }, []);

  const clearDonors = useCallback(() => setSelectedDonors([]), []);

  const handleOpenOrganizationModal = useCallback(
    (orgKey: string) => router.push(`/explore?org=${orgKey}`),
    [router],
  );
  const handleOpenProjectModal = useCallback(
    (projectKey: string) => router.push(`/explore?asset=${projectKey}`),
    [router],
  );
  const NOOP = useCallback(() => {}, []);
  const EMPTY_STRINGS = useMemo(() => [] as string[], []);
  const allKnownInvestmentTypes = useMemo(
    () => Object.values(labels.investmentTypes),
    [],
  );

  // --------------- prompt for empty state ------------------------------

  const showMatrixPrompt = selectedDonors.length < 2;

  // --------------- render ----------------------------------------------

  const coFinancedEmptyState =
    selectedDonors.length === 2
      ? `${selectedDonors[0]} and ${selectedDonors[1]} don't co-finance any organizations.`
      : "The selected donors don't co-finance any organizations.";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader />

      <div className="mx-auto max-w-[82rem] overflow-x-hidden px-4 py-4 pt-20 sm:px-6 sm:py-6 sm:pt-24 lg:px-8">
        <div className="space-y-4">

          {/* Page title + inline donor filter */}
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
              Insights
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Funding overlaps, the network graph, and where donors collaborate.
            </p>

            {/* Inline donor filter */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <DropdownMenu
                open={donorDropdownOpen}
                onOpenChange={setDonorDropdownOpen}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 border-slate-200 text-xs dark:border-slate-600"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {selectedDonors.length === 0
                      ? "Filter by donor"
                      : `${selectedDonors.length} donor${selectedDonors.length === 1 ? "" : "s"} selected`}
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="max-h-72 w-60 overflow-y-auto border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
                  align="start"
                >
                  <DropdownMenuLabel className="text-xs font-semibold text-slate-500">
                    Donor countries
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableDonorCountries.map((donor) => (
                    <DropdownMenuCheckboxItem
                      key={donor}
                      checked={selectedDonors.includes(donor)}
                      onCheckedChange={() => toggleDonor(donor)}
                      onSelect={(e) => e.preventDefault()}
                      className="cursor-pointer text-xs"
                    >
                      {donor}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {selectedDonors.length > 0 && (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedDonors.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-bg-lighter)] px-2.5 py-0.5 text-xs font-medium text-[var(--brand-primary)]"
                      >
                        {d}
                        <button
                          onClick={() => toggleDonor(d)}
                          className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--brand-primary-lighter)]"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={clearDonors}
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <X className="h-3 w-3" />
                    Clear
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Co-financing matrix — prompt or matrix */}
          {showMatrixPrompt ? (
            <Card className="!border-0 bg-white dark:bg-slate-800">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Network className="mb-3 h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Select two or more donors to see where their funding overlaps.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Co-financing split matrices */}
              <Card className="!border-0 bg-white dark:bg-slate-800">
                <CardHeader className="pb-2">
                  <CardTitle>
                    <SectionHeader
                      icon={<Network style={{ color: "var(--brand-primary)" }} />}
                      title="Which donors are collaborating on Data Investment?"
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    {/* Organizations matrix */}
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <div className="h-4 w-4 rounded border border-slate-300 bg-amber-300" />
                        Organizations
                      </h3>
                      <div className="overflow-auto">
                        <table>
                          <thead>
                            <tr>
                              <th className="border-b-2 border-slate-200 p-2 text-left text-xs font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-400">
                                Donor
                              </th>
                              {selectedDonors.map((d) => (
                                <th
                                  key={d}
                                  className="w-14 border-b-2 border-slate-200 p-2 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-400"
                                  style={{
                                    writingMode: "vertical-rl",
                                    transform: "rotate(225deg)",
                                  }}
                                >
                                  {d}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDonors.map((d1) => (
                              <tr key={d1}>
                                <td className="border-r-2 border-slate-200 p-2 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  {d1}
                                </td>
                                {selectedDonors.map((d2) => {
                                  const isDiagonal = d1 === d2;
                                  const count =
                                    coFinancingMatrix[d1]?.[d2]?.orgs.size ?? 0;
                                  const colorClass = isDiagonal
                                    ? "bg-slate-100 text-slate-400 dark:bg-slate-700"
                                    : `${getOrgColorIntensity(count, maxValues.maxOrgs)} ${count > 0 ? "text-slate-800" : "text-slate-400"}`;
                                  const cell = (
                                    <td
                                      key={d2}
                                      onClick={() =>
                                        !isDiagonal && count > 0 && handleCellClick(d1, d2)
                                      }
                                      className={`border border-slate-200 p-2.5 text-center text-xs font-semibold transition-all dark:border-slate-700 ${colorClass} ${!isDiagonal && count > 0 ? "cursor-pointer hover:opacity-75" : ""}`}
                                    >
                                      {isDiagonal ? "—" : count}
                                    </td>
                                  );
                                  if (isDiagonal || count === 0) return cell;
                                  return (
                                    <TooltipProvider key={d2} delayDuration={0}>
                                      <TooltipUI>
                                        <TooltipTrigger asChild>{cell}</TooltipTrigger>
                                        <TooltipContent
                                          side="bottom"
                                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                                          style={TOOLTIP_STYLE}
                                        >
                                          {d1} and {d2} co-finance {count} organization
                                          {count !== 1 ? "s" : ""}
                                        </TooltipContent>
                                      </TooltipUI>
                                    </TooltipProvider>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Products matrix */}
                    <div>
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        <div className="h-4 w-4 rounded border border-slate-300 bg-indigo-300" />
                        Products
                      </h3>
                      <div className="overflow-auto">
                        <table>
                          <thead>
                            <tr>
                              <th className="border-b-2 border-slate-200 p-2 text-left text-xs font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-400">
                                Donor
                              </th>
                              {selectedDonors.map((d) => (
                                <th
                                  key={d}
                                  className="w-14 border-b-2 border-slate-200 p-2 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-400"
                                  style={{
                                    writingMode: "vertical-rl",
                                    transform: "rotate(225deg)",
                                  }}
                                >
                                  {d}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDonors.map((d1) => (
                              <tr key={d1}>
                                <td className="border-r-2 border-slate-200 p-2 text-xs font-semibold text-slate-600 dark:border-slate-600 dark:text-slate-400 whitespace-nowrap">
                                  {d1}
                                </td>
                                {selectedDonors.map((d2) => {
                                  const isDiagonal = d1 === d2;
                                  const count =
                                    coFinancingMatrix[d1]?.[d2]?.projects.size ?? 0;
                                  const colorClass = isDiagonal
                                    ? "bg-slate-100 text-slate-400 dark:bg-slate-700"
                                    : `${getProjectColorIntensity(count, maxValues.maxProjects)} ${count > 0 ? "text-slate-800" : "text-slate-400"}`;
                                  const cell = (
                                    <td
                                      key={d2}
                                      onClick={() =>
                                        !isDiagonal && count > 0 && handleCellClick(d1, d2)
                                      }
                                      className={`border border-slate-200 p-2.5 text-center text-xs font-semibold transition-all dark:border-slate-700 ${colorClass} ${!isDiagonal && count > 0 ? "cursor-pointer hover:opacity-75" : ""}`}
                                    >
                                      {isDiagonal ? "—" : count}
                                    </td>
                                  );
                                  if (isDiagonal || count === 0) return cell;
                                  return (
                                    <TooltipProvider key={d2} delayDuration={0}>
                                      <TooltipUI>
                                        <TooltipTrigger asChild>{cell}</TooltipTrigger>
                                        <TooltipContent
                                          side="bottom"
                                          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800"
                                          style={TOOLTIP_STYLE}
                                        >
                                          {d1} and {d2} co-finance {count} product
                                          {count !== 1 ? "s" : ""}
                                        </TooltipContent>
                                      </TooltipUI>
                                    </TooltipProvider>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Co-financed organizations list */}
              <Card className="!border-0 bg-white dark:bg-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle>
                    <SectionHeader
                      icon={<Building2 style={{ color: "var(--brand-primary)" }} />}
                      title="Co-Financed Organizations"
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {organizationsWithDonorCounts.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {coFinancedEmptyState}
                    </p>
                  ) : (
                    <div className="max-h-80 space-y-1 overflow-y-auto">
                      {organizationsWithDonorCounts.map((org, idx) => (
                        <div
                          key={`${org.id}-${idx}`}
                          className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium text-slate-800 dark:text-slate-200">
                              {org.name}
                            </p>
                            <p className="truncate text-slate-500 dark:text-slate-400">
                              {Array.from(org.donors).join(", ")}
                            </p>
                          </div>
                          <span
                            className="flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold"
                            style={{
                              backgroundColor: "var(--brand-primary-lighter)",
                              color: "var(--brand-primary)",
                            }}
                          >
                            {org.donors.size}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 border-t border-slate-100 pt-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-500">
                    {organizationsWithDonorCounts.length} organization
                    {organizationsWithDonorCounts.length !== 1 ? "s" : ""} co-financed by 2 or more selected donors
                  </p>
                </CardContent>
              </Card>
            </>
          )}

          {/* Breakdowns row */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Products by Type"
              icon={<Database style={{ color: "var(--brand-primary)" }} />}
              data={projectTypesData}
              barColor="var(--brand-primary-lighter)"
              footnote={
                selectedDonors.length > 0
                  ? `Filtered to ${selectedDonors.length} selected donor${selectedDonors.length !== 1 ? "s" : ""}`
                  : "All organizations"
              }
            />
            <ChartCard
              title="Products by Theme"
              icon={<Globe style={{ color: "var(--brand-primary)" }} />}
              data={themesData}
              barColor="var(--brand-primary-lighter)"
              footnote={
                selectedDonors.length > 0
                  ? `Filtered to ${selectedDonors.length} selected donor${selectedDonors.length !== 1 ? "s" : ""}`
                  : "All organizations"
              }
            />
          </div>

          {/* Network Graph — last */}
          <Card className="!border-0 bg-white dark:bg-slate-800">
            <CardHeader className="pb-2">
              <CardTitle>
                <SectionHeader
                  icon={<Network style={{ color: "var(--brand-primary)" }} />}
                  title="Network Graph"
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-4">
              {dashboardData ? (
                <div style={{ height: 520 }}>
                  <NetworkGraph
                    organizationsWithProjects={dashboardData.organizationsWithProjects}
                    allOrganizations={dashboardData.allOrganizations}
                    onOpenOrganizationModal={handleOpenOrganizationModal}
                    onOpenProjectModal={handleOpenProjectModal}
                    combinedDonors={selectedDonors}
                    availableDonorCountries={availableDonorCountries}
                    onDonorsChange={setSelectedDonors}
                    investmentThemes={EMPTY_STRINGS}
                    allKnownInvestmentThemes={dashboardData.investmentThemes}
                    investmentThemesByType={dashboardData.investmentThemesByType}
                    onThemesChange={NOOP}
                    investmentTypes={EMPTY_STRINGS}
                    allKnownInvestmentTypes={allKnownInvestmentTypes}
                    onTypesChange={NOOP}
                    onResetFilters={clearDonors}
                    orgAgenciesMap={orgAgenciesMap}
                  />
                </div>
              ) : (
                <div className="flex h-60 items-center justify-center text-sm text-slate-400">
                  Loading graph…
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 sm:mt-16">
        <div className="mx-auto max-w-[82rem] px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-slate-500">
            Data gathered by{" "}
            <a
              href="https://crafd.io"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
              style={{ color: "var(--brand-primary)" }}
            >
              CRAF&apos;D
            </a>
            . © {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
