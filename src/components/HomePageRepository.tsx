"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,

  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import FilterBar from "@/components/FilterBar";
import OrganizationModal from "@/components/OrganizationModal";
import ProjectModal from "@/components/ProjectModal";
import DonorModal from "@/components/DonorModal";
import { OrganizationBox } from "@/components/OrganizationBox";
import { ProjectBox } from "@/components/ProjectBox";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { matchesUrlSlug } from "@/lib/urlShortcuts";
import { processDashboardData, setGeneralContributionsEnabled } from "@/lib/data";
import { exportViewAsCSV, exportViewAsXLSX } from "@/lib/exportCSV";
import { useGeneralContributions } from "@/contexts/GeneralContributionsContext";
import { getAgenciesForDonors } from "@/lib/data";
import { useProjectCounts } from "@/hooks/useProjectCounts";
import labels from "@/config/labels.json";
import {
  ChevronDown,
  Compass,
  FileDown,
  Landmark,
  X,
} from "lucide-react";
import type { ModalMapsDTO } from "@/server/dto";
import type {
  OrganizationWithProjects,
  ProjectData,
} from "@/types/airtable";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

export interface RepositoryFilters {
  donors: string[];
  types: string[];
  themes: string[];
  searchQuery: string;
  appliedSearchQuery: string;
  singleFunderOrg: boolean;
  fivePlusFunderOrg: boolean;
}

export interface HomePageRepositoryHandle {
  resetAndSetFilters: (filters: Partial<RepositoryFilters>) => void;
}

const DEFAULT_FILTERS: RepositoryFilters = {
  donors: [],
  types: [],
  themes: [],
  searchQuery: "",
  appliedSearchQuery: "",
  singleFunderOrg: false,
  fivePlusFunderOrg: false,
};

const EMPTY_MODAL_MAPS: ModalMapsDTO = {
  projectNameMap: {},
  projectIdToKeyMap: {},
  projectDescriptionMap: {},
  orgProjectsMap: {},
  orgDonorCountriesMap: {},
  orgDonorInfoMap: {},
  orgAgenciesMap: {},
  orgProjectDonorsMap: {},
  orgProjectDonorAgenciesMap: {},
  projectAgenciesMap: {},
};

const normalizeOrgName = (name: string) =>
  name.replace(/\s+/g, " ").trim().toLowerCase();

// ─────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────

const HomePageRepository = forwardRef<HomePageRepositoryHandle>(
  function HomePageRepository(_props, ref) {
    const { showGeneralContributions, setShowGeneralContributions } =
      useGeneralContributions();

    const searchParams = useSearchParams();
    const [filters, setFiltersState] = useState<RepositoryFilters>(DEFAULT_FILTERS);
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
    const [selectedOrgKey, setSelectedOrgKey] = useState("");
    const [selectedProjectKey, setSelectedProjectKey] = useState("");
    const [selectedDonorCountry, setSelectedDonorCountry] = useState("");
    const [nestedOrganizations, setNestedOrganizations] = useState<any[]>([]);
    const [modalMaps, setModalMaps] = useState<ModalMapsDTO>(EMPTY_MODAL_MAPS);
    const [availableAgencies, setAvailableAgencies] = useState<Map<string, string[]>>(new Map());
    const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set());
    const [csvExportLoading, setCsvExportLoading] = useState(false);
    const [xlsxExportLoading, setXlsxExportLoading] = useState(false);
    const [exportMenuOpen, setExportMenuOpen] = useState(false);

    // Keep module-level variable in sync with context
    useEffect(() => {
      setGeneralContributionsEnabled(showGeneralContributions);
    }, [showGeneralContributions]);

    // Apply filters from URL params on mount (?type=&theme=&donor=&q=&single=1&fiveplus=1)
    useEffect(() => {
      const list = (key: string) =>
        (searchParams.get(key) ?? "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
      const q = searchParams.get("q") ?? "";
      const urlFilters: Partial<RepositoryFilters> = {};
      if (list("type").length) urlFilters.types = list("type");
      if (list("theme").length) urlFilters.themes = list("theme");
      if (list("donor").length) urlFilters.donors = list("donor");
      if (q) {
        urlFilters.searchQuery = q;
        urlFilters.appliedSearchQuery = q;
      }
      if (searchParams.get("single") === "1") urlFilters.singleFunderOrg = true;
      if (searchParams.get("fiveplus") === "1") urlFilters.fivePlusFunderOrg = true;
      if (Object.keys(urlFilters).length === 0) return;
      setFiltersState({ ...DEFAULT_FILTERS, ...urlFilters });
      setExpandedOrgs(new Set());
    }, []);

    // BaseModal only fades out on close and relies on these events to unmount.
    // Without listeners its transparent full-screen overlay stays mounted and blocks all clicks.
    useEffect(() => {
      const closeOrg = () => setSelectedOrgKey("");
      const closeProject = () => setSelectedProjectKey("");
      const closeDonor = () => setSelectedDonorCountry("");
      window.addEventListener("closeOrganizationModal", closeOrg);
      window.addEventListener("closeProjectModal", closeProject);
      window.addEventListener("closeDonorModal", closeDonor);
      return () => {
        window.removeEventListener("closeOrganizationModal", closeOrg);
        window.removeEventListener("closeProjectModal", closeProject);
        window.removeEventListener("closeDonorModal", closeDonor);
      };
    }, []);

    // Expose imperative handle to parent
    useImperativeHandle(ref, () => ({
      resetAndSetFilters: (newFilters: Partial<RepositoryFilters>) => {
        setFiltersState({ ...DEFAULT_FILTERS, ...newFilters });
        setExpandedOrgs(new Set());
      },
    }));

    // Fetch filtered dashboard data
    const fetchKey = useMemo(
      () =>
        JSON.stringify({
          donors: [...filters.donors].sort(),
          types: [...filters.types].sort(),
          themes: [...filters.themes].sort(),
          search: filters.appliedSearchQuery,
          gc: showGeneralContributions,
        }),
      [filters.donors, filters.types, filters.themes, filters.appliedSearchQuery, showGeneralContributions],
    );

    useEffect(() => {
      let cancelled = false;
      setLoading(true);

      processDashboardData({
        donorCountries: filters.donors.length > 0 ? filters.donors : undefined,
        investmentTypes: filters.types.length > 0 ? filters.types : undefined,
        investmentThemes: filters.themes.length > 0 ? filters.themes : undefined,
        searchQuery: filters.appliedSearchQuery || undefined,
      }).then((data) => {
        if (!cancelled) {
          setDashboardData(data);
          setLoading(false);
        }
      }).catch(() => {
        if (!cancelled) setLoading(false);
      });

      return () => { cancelled = true; };
    }, [fetchKey]);

    // Load modal data once
    useEffect(() => {
      Promise.all([fetch("/api/modal-maps"), fetch("/api/nested-organizations")])
        .then(([mapsRes, nestedRes]) =>
          Promise.all([
            mapsRes.ok ? mapsRes.json() : EMPTY_MODAL_MAPS,
            nestedRes.ok ? nestedRes.json() : [],
          ])
        )
        .then(([maps, nested]) => {
          setModalMaps({ ...EMPTY_MODAL_MAPS, ...maps });
          setNestedOrganizations(nested);
        })
        .catch(() => {});
    }, []);

    // Load agencies when exactly 1 donor is selected
    useEffect(() => {
      if (filters.donors.length === 1) {
        getAgenciesForDonors(filters.donors).then(setAvailableAgencies);
      } else {
        setAvailableAgencies(new Map());
      }
    }, [filters.donors]);

    const handleLogoError = useCallback((orgId: string) => {
      setLogoErrors((prev) => new Set([...prev, orgId]));
    }, []);

    // Agencies with funding (simplified: all loaded agencies)
    const agenciesWithFunding = useMemo(() => {
      const set = new Set<string>();
      if (dashboardData?.allOrganizations) {
        for (const org of dashboardData.allOrganizations) {
          if (org.orgAgencies) {
            Object.values(org.orgAgencies as Record<string, string[]>).forEach((list) =>
              list.forEach((a: string) => set.add(a)),
            );
          }
        }
      }
      return set;
    }, [dashboardData?.allOrganizations]);

    // Parse selected agencies from URL — here we do it from local filter state
    const selectedAgencies = useMemo<string[]>(() => [], []); // Agencies sub-filter not used on home page

    const organizationsTable = useMemo(() => {
      if (!dashboardData?.allOrganizations) return [];
      return dashboardData.allOrganizations.map((org: any) => ({
        id: org.id,
        fields: org.fields || {},
      }));
    }, [dashboardData?.allOrganizations]);

    const allKnownInvestmentTypes = useMemo(
      () => Object.values(labels.investmentTypes),
      [],
    );

    const allKnownInvestmentThemes = useMemo(
      () => dashboardData?.investmentThemes || [],
      [dashboardData?.investmentThemes],
    );

    const investmentThemesByType = useMemo(
      () => dashboardData?.investmentThemesByType || {},
      [dashboardData?.investmentThemesByType],
    );

    const { projectCountsByType, projectCountsByTheme } = useProjectCounts({
      organizations: dashboardData?.allOrganizations || [],
      combinedDonors: filters.donors,
      appliedSearchQuery: filters.appliedSearchQuery,
      investmentTypes: filters.types,
      investmentThemes: filters.themes,
    });

    // Apply client-side special filters (singleOrg, fivePlusOrg)
    const displayedOrgs = useMemo<OrganizationWithProjects[]>(() => {
      if (!dashboardData?.organizationsWithProjects) return [];

      let orgs: OrganizationWithProjects[] = dashboardData.organizationsWithProjects;

      if (filters.singleFunderOrg) {
        orgs = orgs.filter((org) => org.donorCountries.length === 1);
      }

      if (filters.fivePlusFunderOrg) {
        orgs = orgs.filter((org) => org.donorCountries.length >= 5);
      }

      return [...orgs].sort((a, b) =>
        a.organizationName.localeCompare(b.organizationName),
      );
    }, [
      dashboardData?.organizationsWithProjects,
      filters.singleFunderOrg,
      filters.fivePlusFunderOrg,
    ]);

    // ─── Modal logic (adapted from CrisisDataDashboard) ───

    const selectedProject = useMemo(() => {
      if (!selectedProjectKey || !nestedOrganizations.length) return null;
      for (const org of nestedOrganizations) {
        for (const project of org.projects || []) {
          const productKey = project.fields?.product_key;
          if (productKey && matchesUrlSlug(selectedProjectKey, productKey)) {
            const projectAgencies = project.agencies || [];
            const donors = new Set<string>();
            if (Array.isArray(projectAgencies)) {
              projectAgencies.forEach((a: any) => {
                const f = a?.fields || {};
                const c =
                  f["Country Name"] || f["Country"] || f["Agency Associated Country"];
                if (Array.isArray(c)) c.forEach((cc: unknown) => { if (typeof cc === "string" && cc.trim()) donors.add(cc.trim()); });
                else if (typeof c === "string" && c.trim()) donors.add(c.trim());
              });
            }
            return {
              project: {
                id: project.id,
                productKey: project.fields?.["product_key"] || "",
                projectName:
                  project.fields?.["Project/Product Name"] ||
                  project.fields?.["Project Name"] ||
                  "Unnamed Project",
                projectDescription: project.fields?.["Project Description"] || "",
                projectWebsite: project.fields?.["Project Website"] || "",
                investmentTypes: project.fields?.["Investment Type(s)"] || [],
                investmentThemes: project.fields?.["Investment Theme(s)"] || [],
                donorCountries: Array.from(donors),
                provider: org.name || "Unknown Provider",
                hdxSohd: project.fields?.["HDX_SOHD"] || undefined,
              } as ProjectData,
              organizationName: org.name || "Unknown Organization",
            };
          }
        }
      }
      return null;
    }, [selectedProjectKey, nestedOrganizations]);

    const selectedOrganization = useMemo(() => {
      if (!selectedOrgKey || !dashboardData?.allOrganizations) return null;
      return (
        dashboardData.allOrganizations.find((org: OrganizationWithProjects) => {
          const nestedOrg = nestedOrganizations.find((n) => n.id === org.id);
          const orgKey = nestedOrg?.fields?.["org_key"];
          return orgKey && matchesUrlSlug(selectedOrgKey, orgKey);
        }) || null
      );
    }, [selectedOrgKey, dashboardData?.allOrganizations, nestedOrganizations]);

    // ─── Filter description for FilterBar ───

    const filterDescription = useMemo(() => {
      const stats = dashboardData?.stats;
      if (!stats) return null;
      const hasFilters =
        filters.donors.length > 0 ||
        filters.types.length > 0 ||
        filters.themes.length > 0 ||
        filters.appliedSearchQuery ||
        filters.singleFunderOrg ||
        filters.fivePlusFunderOrg;

      if (!hasFilters) {
        return (
          <span>
            Showing all <strong>{stats.dataProviders}</strong> organizations,{" "}
            <strong>{stats.dataProjects}</strong> products and{" "}
            <strong>{stats.donorCountries}</strong> funders
          </span>
        );
      }
      return (
        <span>
          <strong>{displayedOrgs.length}</strong> organizations ·{" "}
          <strong>
            {displayedOrgs.reduce((sum, o) => sum + o.projects.length, 0)}
          </strong>{" "}
          products
        </span>
      );
    }, [dashboardData?.stats, filters, displayedOrgs]);

    // ─── Export ───

    const getExportOptions = () => ({
      searchQuery: filters.appliedSearchQuery || undefined,
      donorCountries: filters.donors,
      investmentTypes: filters.types,
      investmentThemes: filters.themes,
    });

    const handleExportCSV = async () => {
      try {
        setCsvExportLoading(true);
        await exportViewAsCSV(displayedOrgs as any, getExportOptions());
      } catch {
        alert(labels.errors.exportCsvFailed);
      } finally {
        setCsvExportLoading(false);
      }
    };

    const handleExportXLSX = async () => {
      try {
        setXlsxExportLoading(true);
        await exportViewAsXLSX(displayedOrgs as any, getExportOptions());
      } catch {
        alert(labels.errors.exportXlsxFailed);
      } finally {
        setXlsxExportLoading(false);
      }
    };

    // ─── Handlers ───

    const handleClearAll = useCallback(() => {
      setFiltersState(DEFAULT_FILTERS);
      setExpandedOrgs(new Set());
    }, []);

    const removeFilterChip = (kind: string, value?: string) => {
      setFiltersState((prev) => {
        switch (kind) {
          case "donor":
            return { ...prev, donors: prev.donors.filter((d) => d !== value) };
          case "type":
            return { ...prev, types: prev.types.filter((t) => t !== value) };
          case "theme":
            return { ...prev, themes: prev.themes.filter((t) => t !== value) };
          case "search":
            return { ...prev, searchQuery: "", appliedSearchQuery: "" };
          case "singleFunderOrg":
            return { ...prev, singleFunderOrg: false };
          case "fivePlusFunderOrg":
            return { ...prev, fivePlusFunderOrg: false };
          default:
            return prev;
        }
      });
    };

    const hasAnyFilter =
      filters.donors.length > 0 ||
      filters.types.length > 0 ||
      filters.themes.length > 0 ||
      filters.appliedSearchQuery ||
      filters.singleFunderOrg ||
      filters.fivePlusFunderOrg;

    // ─── Render ───

    return (
      <section
        className="mx-auto max-w-[82rem] px-4 pb-16 sm:px-6 lg:px-8"
        aria-label="Organizations"
      >
        {/* Section title row */}
        <div className="mb-4 flex items-center justify-end">
          <div className="flex items-center gap-3">
            {/* General contributions toggle: only once a funder is selected */}
            {filters.donors.length > 0 && (
              <button
                onClick={() => {
                  const newValue = !showGeneralContributions;
                  setShowGeneralContributions(newValue);
                  setGeneralContributionsEnabled(newValue);
                }}
                className="flex items-center gap-2 text-xs text-slate-500 transition-colors hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              >
                <Landmark className="h-3.5 w-3.5" />
                <span>Include core / institutional support</span>
                <div
                  className={`h-4 w-7 rounded-full transition-colors ${
                    showGeneralContributions
                      ? "bg-[var(--brand-primary-dark)]"
                      : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white transition-transform ${
                      showGeneralContributions ? "translate-x-3" : "translate-x-0"
                    }`}
                  />
                </div>
              </button>
            )}

            {/* Export */}
            <DropdownMenu onOpenChange={setExportMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  disabled={csvExportLoading || xlsxExportLoading}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  {csvExportLoading
                    ? labels.header.exportingCsv
                    : xlsxExportLoading
                      ? labels.header.exportingXlsx
                      : labels.header.exportView}
                  <ChevronDown
                    className={`h-3 w-3 opacity-50 transition-transform ${exportMenuOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={4}
                className="w-auto min-w-[180px] border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
              >
                <DropdownMenuItem
                  onClick={handleExportCSV}
                  disabled={csvExportLoading || xlsxExportLoading}
                  className="cursor-pointer py-2 text-[11px]"
                >
                  <FileDown className="mr-2 h-3 w-3" />
                  {labels.header.exportMenuCsv}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleExportXLSX}
                  disabled={csvExportLoading || xlsxExportLoading}
                  className="cursor-pointer py-2 text-[11px]"
                >
                  <FileDown className="mr-2 h-3 w-3" />
                  {labels.header.exportMenuXlsx}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Filter bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900 sm:p-5">
          <FilterBar
            searchQuery={filters.searchQuery}
            appliedSearchQuery={filters.appliedSearchQuery}
            onSearchChange={(v) => setFiltersState((p) => ({ ...p, searchQuery: v }))}
            onSearchSubmit={() =>
              setFiltersState((p) => ({ ...p, appliedSearchQuery: p.searchQuery }))
            }
            combinedDonors={filters.donors}
            availableDonorCountries={dashboardData?.donorCountries || []}
            selectedAgencies={selectedAgencies}
            availableAgencies={availableAgencies}
            agenciesWithFunding={agenciesWithFunding}
            onDonorsChange={(v) => setFiltersState((p) => ({ ...p, donors: v }))}
            onAgenciesChange={() => {}}
            investmentTypes={filters.types}
            allKnownInvestmentTypes={allKnownInvestmentTypes}
            onTypesChange={(v) => setFiltersState((p) => ({ ...p, types: v }))}
            investmentThemes={filters.themes}
            allKnownInvestmentThemes={allKnownInvestmentThemes}
            investmentThemesByType={investmentThemesByType}
            onThemesChange={(v) => setFiltersState((p) => ({ ...p, themes: v }))}
            projectCountsByType={projectCountsByType}
            projectCountsByTheme={projectCountsByTheme}
            onResetFilters={handleClearAll}
            filterDescription={filterDescription}
            rightActions={
              hasAnyFilter &&
              !(
                filters.donors.length > 0 ||
                filters.types.length > 0 ||
                filters.themes.length > 0 ||
                filters.appliedSearchQuery
              ) ? (
                <button
                  onClick={handleClearAll}
                  className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear all
                </button>
              ) : null
            }
          />

          {/* Active filter chips */}
          {hasAnyFilter && (
            <div className="mt-3 flex flex-wrap gap-2">
              {filters.donors.map((d) => (
                <FilterChip
                  key={`donor-${d}`}
                  label={d}
                  onRemove={() => removeFilterChip("donor", d)}
                />
              ))}
              {filters.types.map((t) => (
                <FilterChip
                  key={`type-${t}`}
                  label={t}
                  onRemove={() => removeFilterChip("type", t)}
                />
              ))}
              {filters.themes.map((th) => (
                <FilterChip
                  key={`theme-${th}`}
                  label={th}
                  onRemove={() => removeFilterChip("theme", th)}
                />
              ))}
              {filters.appliedSearchQuery && (
                <FilterChip
                  label={`"${filters.appliedSearchQuery}"`}
                  onRemove={() => removeFilterChip("search")}
                />
              )}
              {filters.singleFunderOrg && (
                <FilterChip
                  label="Single documented funder (organizations)"
                  onRemove={() => removeFilterChip("singleFunderOrg")}
                />
              )}
              {filters.fivePlusFunderOrg && (
                <FilterChip
                  label="Five or more funders (organizations)"
                  onRemove={() => removeFilterChip("fivePlusFunderOrg")}
                />
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Compass className="mr-3 h-8 w-8 animate-spin text-[var(--brand-primary)]" />
              <span className="text-slate-500">Loading…</span>
            </div>
          ) : displayedOrgs.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900">
              <p className="text-slate-500">
                No results match your current filters.{" "}
                <button
                  onClick={handleClearAll}
                  className="font-medium text-[var(--brand-primary)] underline-offset-2 hover:underline"
                >
                  Clear all filters
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedOrgs.map((org) => {
                const isExpanded = expandedOrgs.has(org.id);
                const hasProjects = org.projects.length > 0;

                // Derive unique investment types across org's products for summary
                const orgTypes = Array.from(
                  new Set(org.projects.flatMap((p: ProjectData) => p.investmentTypes || [])),
                );

                return (
                  <Collapsible
                    key={org.id}
                    open={isExpanded}
                    onOpenChange={() => {
                      setExpandedOrgs((prev) => {
                        const next = new Set(prev);
                        if (isExpanded) next.delete(org.id);
                        else next.add(org.id);
                        return next;
                      });
                    }}
                  >
                    <div className="w-full">
                      <OrganizationBox
                        orgId={org.id}
                        organizationName={org.organizationName}
                        nestedOrganizations={nestedOrganizations}
                        organizationsTable={organizationsTable}
                        isExpanded={isExpanded}
                        hasProjects={hasProjects}
                        onOpenOrganizationModal={(key) => {
                          setSelectedOrgKey(key);
                          setSelectedProjectKey("");
                          setSelectedDonorCountry("");
                        }}
                        logoErrors={logoErrors}
                        onLogoError={handleLogoError}
                        headingLevel="h3"
                        onToggleExpand={() =>
                          setExpandedOrgs((prev) => {
                            const next = new Set(prev);
                            if (next.has(org.id)) next.delete(org.id);
                            else next.add(org.id);
                            return next;
                          })
                        }
                        projectCount={org.projects.length}
                        projectLabel={
                          org.projects.length === 1
                            ? labels.product.singular
                            : labels.product.plural
                        }
                      >
                        {/* Organization summary: types · products · funders */}
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {orgTypes.length > 0 && (
                            <>
                              <span className="italic">
                                {orgTypes.slice(0, 2).join(", ")}
                                {orgTypes.length > 2
                                  ? ` +${orgTypes.length - 2}`
                                  : ""}
                              </span>
                              {" · "}
                            </>
                          )}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {org.projects.length}
                          </strong>{" "}
                          {org.projects.length === 1
                            ? labels.product.singular
                            : labels.product.plural}
                          {" · "}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {org.donorCountries.length}
                          </strong>{" "}
                          {org.donorCountries.length === 1 ? "funder" : "funders"}
                        </span>
                      </OrganizationBox>
                    </div>
                    <CollapsibleContent>
                      <div className="mt-2 ml-8 space-y-2 sm:ml-14">
                        {org.projects.map((project: ProjectData) => {
                          const nestedOrg = nestedOrganizations.find(
                            (n: any) => n.id === org.id,
                          );
                          const nestedProject = nestedOrg?.projects?.find(
                            (p: any) => p.id === project.id,
                          );
                          const projectKey = nestedProject?.fields?.product_key;

                          return (
                            <ProjectBox
                              key={project.id}
                              project={project}
                              onClick={() => {
                                if (projectKey) {
                                  setSelectedProjectKey(projectKey);
                                  setSelectedOrgKey("");
                                  setSelectedDonorCountry("");
                                }
                              }}
                              tipsEnabled={false}
                              combinedDonors={filters.donors}
                            />
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </div>

        {/* Organization Modal */}
        {selectedOrganization &&
          (() => {
            const target = normalizeOrgName(
              selectedOrganization.organizationName || selectedOrganization.id,
            );
            const match = organizationsTable.find((rec: { id: string; fields: Record<string, unknown> }) => {
              const full = (rec.fields["Org Full Name"] as string) || "";
              const short = (rec.fields["Org Short Name"] as string) || "";
              return [full, short].some(
                (s) => normalizeOrgName(String(s || "")) === target,
              );
            });
            const nestedMatch = nestedOrganizations.find((n: any) => {
              const nm = normalizeOrgName(n.name || "");
              const nf = normalizeOrgName(n.fields?.["Org Full Name"] || "");
              const ns = normalizeOrgName(n.fields?.["Org Short Name"] || "");
              return (
                nm === target ||
                nf === target ||
                ns === target ||
                n.id === (match?.id || selectedOrganization.id)
              );
            });
            let orgRecord: any = match || {
              id: selectedOrganization.id,
              fields: { "Org Full Name": selectedOrganization.organizationName },
            };
            if (nestedMatch?.iati_data) {
              orgRecord = { ...orgRecord, iati_data: nestedMatch.iati_data };
            }
            return (
              <OrganizationModal
                organization={orgRecord}
                projectNameMap={modalMaps.projectNameMap}
                projectDescriptionMap={modalMaps.projectDescriptionMap}
                orgProjectsMap={modalMaps.orgProjectsMap}
                orgDonorCountriesMap={modalMaps.orgDonorCountriesMap}
                orgDonorInfoMap={modalMaps.orgDonorInfoMap}
                orgAgenciesMap={modalMaps.orgAgenciesMap}
                orgProjectDonorsMap={modalMaps.orgProjectDonorsMap}
                orgProjectDonorAgenciesMap={modalMaps.orgProjectDonorAgenciesMap}
                loading={false}
                onOpenProjectModal={(key) => {
                  setSelectedProjectKey(key);
                  setSelectedOrgKey("");
                }}
                projectIdToKeyMap={modalMaps.projectIdToKeyMap}
                onOpenDonorModal={(country) => {
                  setSelectedDonorCountry(country);
                  setSelectedOrgKey("");
                  setSelectedProjectKey("");
                }}
                onTypeClick={(type) =>
                  setFiltersState((p) => ({
                    ...p,
                    types: p.types.includes(type) ? p.types : [...p.types, type],
                  }))
                }
              />
            );
          })()}

        {/* Project Modal */}
        {selectedProject && (
          <ProjectModal
            project={selectedProject.project}
            organizationName={selectedProject.organizationName}
            allOrganizations={dashboardData?.allOrganizations || []}
            loading={false}
            projectAgenciesMap={modalMaps.projectAgenciesMap}
            onOpenOrganizationModal={(key) => {
              setSelectedOrgKey(key);
              setSelectedProjectKey("");
            }}
            onOpenProjectModal={(key) => {
              setSelectedProjectKey(key);
              setSelectedOrgKey("");
            }}
            onOpenDonorModal={(country) => {
              setSelectedDonorCountry(country);
              setSelectedOrgKey("");
              setSelectedProjectKey("");
            }}
            onTypeClick={(type) =>
              setFiltersState((p) => ({
                ...p,
                types: p.types.includes(type) ? p.types : [...p.types, type],
              }))
            }
            onThemeClick={(theme) =>
              setFiltersState((p) => ({
                ...p,
                themes: p.themes.includes(theme)
                  ? p.themes
                  : [...p.themes, theme],
              }))
            }
          />
        )}

        {/* Donor Modal */}
        {selectedDonorCountry && (
          <DonorModal
            donorCountry={selectedDonorCountry}
            nestedOrganizations={nestedOrganizations as any}
            loading={false}
            onOpenOrganizationModal={(key) => {
              setSelectedOrgKey(key);
              setSelectedDonorCountry("");
            }}
            onOpenProjectModal={(key) => {
              setSelectedProjectKey(key);
              setSelectedDonorCountry("");
            }}
          />
        )}
      </section>
    );
  },
);

HomePageRepository.displayName = "HomePageRepository";
export default HomePageRepository;

// ─────────────────────────────────────────────────────────
// FilterChip — small removable pill
// ─────────────────────────────────────────────────────────

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {label}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-600 dark:hover:text-slate-200"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  );
}
