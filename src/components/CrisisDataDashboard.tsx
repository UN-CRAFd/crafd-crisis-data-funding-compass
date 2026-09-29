"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
// Image import removed because it's not used in this file
import FilterBar from "@/components/FilterBar";
import NoResultsPopup from "@/components/NoResultsPopup";
import PageHeader from "@/components/PageHeader";
import { SectionHeader } from "@/components/SectionHeader";
import dynamic from "next/dynamic";
import OrganizationModal from "@/components/OrganizationModal";
import ProjectModal from "@/components/ProjectModal";
import DonorModal from "@/components/DonorModal";
import DonorTable from "@/components/DonorTable";
import { OrganizationBox } from "@/components/OrganizationBox";
import { ProjectBox } from "@/components/ProjectBox";
import { matchesUrlSlug } from "@/lib/urlShortcuts";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tooltip as TooltipUI,
} from "@/components/ui/tooltip";
import labels from "@/config/labels.json";
import type { ModalMapsDTO } from "@/server/dto";
import {
  Building2,
  ChevronDown,
  Database,
  FileDown,
  Globe,
  ArrowUpWideNarrow,
  ArrowDownWideNarrow,
  Settings,
  Lightbulb,
  Landmark,
  UserRoundPlus,
  Compass,
} from "lucide-react";
import {
  setGeneralContributionsEnabled,
} from "../lib/data";
import { exportViewAsCSV, exportViewAsXLSX } from "../lib/exportCSV";
import { useTips } from "@/contexts/TipsContext";
import { useGeneralContributions } from "@/contexts/GeneralContributionsContext";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  DashboardStats,
  OrganizationProjectData,
  OrganizationTypeData,
  OrganizationWithProjects,
  ProjectData,
  ProjectTypeData,
} from "../types/airtable";
import { useProjectCounts } from "@/hooks/useProjectCounts";

// NetworkGraph moved to /insights — no longer imported here

const TABS = [
  {
    value: "table",
    label: "Organizations",
    Icon: Building2,
    tooltip: "View organizations and their projects in a table format",
  },
  {
    value: "donors",
    label: "Donors",
    Icon: Globe,
    tooltip: "View funding by donor countries and organizations",
  },
] as const;

// Consolidated style constants
const STYLES = {
  cardGlass: "!border-0 bg-white dark:bg-slate-800",
} as const;

// Tooltip style for reuse
const TOOLTIP_STYLE = {
  backgroundColor: "var(--tooltip-bg)",
  backdropFilter: "blur(12px)",
  border: "1px solid var(--tooltip-border)",
  borderRadius: "10px",
} as const;

// Utility to normalize organization names for matching
const normalizeOrgName = (name: string) =>
  name.replace(/\s+/g, " ").trim().toLowerCase();

// Helper to format donor list for display
const formatDonorList = (donors: string[]): string => {
  if (donors.length === 1) return donors[0];
  if (donors.length === 2) return `${donors[0]} & ${donors[1]}`;
  return `${donors.slice(0, -1).join(", ")} & ${donors[donors.length - 1]}`;
};

// Sorting comparator for organizations
const sortOrganizations = (
  a: OrganizationWithProjects,
  b: OrganizationWithProjects,
  sortBy: "name" | "donors" | "assets" | "funding" | "overlap",
  sortDirection: "asc" | "desc",
): number => {
  let comparison = 0;
  switch (sortBy) {
    case "name":
      comparison = b.organizationName.localeCompare(a.organizationName);
      break;
    case "donors":
      comparison = a.donorCountries.length - b.donorCountries.length;
      break;
    case "assets":
      comparison = a.projects.length - b.projects.length;
      break;
    case "funding":
      comparison = (a.estimatedBudget || 0) - (b.estimatedBudget || 0);
      break;
    case "overlap":
      // overlap not used in org sort; fall back to name
      comparison = b.organizationName.localeCompare(a.organizationName);
      break;
  }
  return sortDirection === "asc" ? comparison : -comparison;
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

interface CrisisDataDashboardProps {
  dashboardData: {
    stats: DashboardStats;
    projectTypes: ProjectTypeData[];
    organizationTypes: OrganizationTypeData[];
    organizationProjects: OrganizationProjectData[];
    organizationsWithProjects: OrganizationWithProjects[];
    allOrganizations: OrganizationWithProjects[]; // Add unfiltered organizations
    donorCountries: string[];
    investmentTypes: string[];
    investmentThemes: string[];
    investmentThemesByType: Record<string, string[]>; // Grouped themes by investment type
    topDonors: Array<{ name: string; value: number }>; // Add top co-financing donors
  } | null;
  loading: boolean;
  error: string | null;
  combinedDonors: string[];
  selectedAgencies: string[];
  availableAgencies: Map<string, string[]>;
  investmentTypes: string[];
  investmentThemes: string[];
  searchQuery: string; // Current input value
  appliedSearchQuery: string; // Applied search query (from URL)
  selectedOrgKey: string; // Organization key from URL
  selectedProjectKey: string; // Asset key from URL
  sortBy: "name" | "donors" | "assets" | "funding" | "overlap"; // Sort field from URL
  sortDirection: "asc" | "desc"; // Sort direction from URL
  isSortExplicit?: boolean; // True when sb param is present in URL (user made an explicit choice)
  onDonorsChange: (values: string[]) => void;
  onAgenciesChange: (values: string[]) => void;
  onTypesChange: (values: string[]) => void;
  onThemesChange: (values: string[]) => void;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onResetFilters: () => void;
  onSortChange: (
    sortBy: "name" | "donors" | "assets" | "funding" | "overlap",
    sortDirection: "asc" | "desc",
  ) => void;
  onOpenOrganizationModal: (orgKey: string) => void;
  onOpenProjectModal: (projectKey: string) => void;
  onOpenDonorModal?: (donorCountry: string) => void;
  onCloseOrganizationModal: () => void;
  onCloseProjectModal: () => void;
  onCloseDonorModal?: () => void;
  selectedDonorCountry?: string;
  onDonorClick?: (country: string) => void;
  onTypeClick?: (type: string) => void;
  onThemeClick?: (theme: string) => void;
  onViewChange?: (view: "table" | "donors") => void;
  activeView?: "table" | "donors";
}

const CrisisDataDashboard = ({
  dashboardData,
  loading,
  combinedDonors,
  selectedAgencies,
  availableAgencies,
  investmentTypes,
  investmentThemes,
  searchQuery,
  appliedSearchQuery,
  selectedOrgKey,
  selectedProjectKey,
  selectedDonorCountry,
  onDonorsChange,
  onAgenciesChange,
  onTypesChange,
  onThemesChange,
  onSearchChange,
  onSearchSubmit,
  onResetFilters,
  onOpenOrganizationModal,
  onOpenProjectModal,
  onOpenDonorModal,
  onCloseOrganizationModal,
  onCloseProjectModal,
  onCloseDonorModal,
  onTypeClick,
  onThemeClick,
  onViewChange,
  activeView: activeViewProp,
  sortBy,
  sortDirection,
  isSortExplicit = false,
  onSortChange,
}: CrisisDataDashboardProps) => {
  // Get tips enabled state with fallback for SSR
  let tipsEnabled = false;
  let setTipsEnabled: (enabled: boolean) => void = () => {};
  try {
    const tipsContext = useTips();
    tipsEnabled = tipsContext.tipsEnabled;
    setTipsEnabled = tipsContext.setTipsEnabled;
  } catch (e) {
    // TipsProvider not available (e.g., during server-side rendering)
    tipsEnabled = false;
  }

  // Get general contributions state with fallback for SSR
  let showGeneralContributions = true;
  let setShowGeneralContributions: (enabled: boolean) => void = () => {};
  try {
    const genContContext = useGeneralContributions();
    showGeneralContributions = genContContext.showGeneralContributions;
    setShowGeneralContributions = genContContext.setShowGeneralContributions;
  } catch (e) {
    // GeneralContributionsProvider not available - use defaults
  }

  const router = useRouter();
  const searchParams = useSearchParams();

  // UI state (not related to routing)
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [expandedCountries, setExpandedCountries] = useState<Set<string>>(
    new Set(),
  );
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<"table" | "donors">(activeViewProp ?? "table");

  // When donors are selected and the user hasn't explicitly chosen a sort, default to "Most overlap"
  const effectiveSortBy = useMemo(() => {
    if (activeView === "donors" && combinedDonors.length > 0 && !isSortExplicit) {
      return "overlap" as const;
    }
    return sortBy;
  }, [activeView, combinedDonors.length, isSortExplicit, sortBy]);

  // Enforce table-only on small screens (mobile).
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined" && window.innerWidth < 640) {
        setActiveView("table");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);


  // Full reset: URL + component state (expanded rows). Tab is preserved — driven by URL.
  const handleClearAll = useCallback(() => {
    setExpandedOrgs(new Set());
    setExpandedCountries(new Set());
    onResetFilters();
  }, [onResetFilters]);

  // Modal and UI states
  const [csvExportLoading, setCSVExportLoading] = useState(false);
  const [xlsxExportLoading, setXLSXExportLoading] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set());

  // Memoized callback for logo errors to prevent recreation on each render
  const handleLogoError = useCallback((orgId: string) => {
    setLogoErrors((prev) => new Set([...prev, orgId]));
  }, []);

  // Organizations table data (loaded from API via allOrganizations)
  const organizationsTable = useMemo(() => {
    if (!dashboardData?.allOrganizations) return [];
    return dashboardData.allOrganizations.map((org: any) => ({
      id: org.id,
      fields: org.fields || {},
    }));
  }, [dashboardData?.allOrganizations]);

  // Get all investment themes from dashboardData (must be before early returns)
  const allKnownInvestmentThemes = useMemo(
    () => dashboardData?.investmentThemes || [],
    [dashboardData?.investmentThemes],
  );

  // Get grouped themes by investment type
  const investmentThemesByType = useMemo(
    () => dashboardData?.investmentThemesByType || {},
    [dashboardData?.investmentThemesByType],
  );

  // Extract agencies that actually have funding in the full (unfiltered) data
  const agenciesWithFunding = useMemo(() => {
    const agencies = new Set<string>();
    if (dashboardData?.allOrganizations) {
      for (const org of dashboardData.allOrganizations) {
        // Add org-level agencies
        if (org.orgAgencies) {
          Object.values(org.orgAgencies).forEach((agencyList) => {
            agencyList.forEach((agency) => {
              if (agency) agencies.add(agency);
            });
          });
        }
        // Add project-level agencies
        if (org.projects) {
          for (const project of org.projects) {
            if (project.donorAgencies) {
              Object.values(project.donorAgencies).forEach((agencyList) => {
                agencyList.forEach((agency) => {
                  if (agency) agencies.add(agency);
                });
              });
            }
          }
        }
      }
    }
    return agencies;
  }, [dashboardData?.allOrganizations]);

  // Calculate project counts using shared hook
  const { projectCountsByType, projectCountsByTheme } = useProjectCounts({
    organizations: dashboardData?.allOrganizations || [],
    combinedDonors,
    appliedSearchQuery,
    investmentTypes,
    investmentThemes,
  });

  // Load nested data for modals
  const [nestedOrganizations, setNestedOrganizations] = useState<any[]>([]);

  const [modalMaps, setModalMaps] = useState<ModalMapsDTO>(EMPTY_MODAL_MAPS);

  // Load modal maps and nested organization data from API
  useEffect(() => {
    const loadModalData = async () => {
      try {
        const [mapsResponse, nestedResponse] = await Promise.all([
          fetch("/api/modal-maps"),
          fetch("/api/nested-organizations"),
        ]);

        if (mapsResponse.ok) {
          const maps = await mapsResponse.json();
          setModalMaps({ ...EMPTY_MODAL_MAPS, ...maps });
        }

        if (nestedResponse.ok) {
          const nestedOrgs = await nestedResponse.json();
          setNestedOrganizations(nestedOrgs);
        }
      } catch (error) {
        console.error("Error loading modal data:", error);
      }
    };
    loadModalData();
  }, []);

  // Listen for modal close events dispatched from client modal components (now using URL-based handlers)
  useEffect(() => {
    // Event handlers for modal close events dispatched from within modals
    window.addEventListener(
      "closeProjectModal",
      onCloseProjectModal as EventListener,
    );
    window.addEventListener(
      "closeOrganizationModal",
      onCloseOrganizationModal as EventListener,
    );
    if (onCloseDonorModal) {
      window.addEventListener(
        "closeDonorModal",
        onCloseDonorModal as EventListener,
      );
    }

    return () => {
      window.removeEventListener(
        "closeProjectModal",
        onCloseProjectModal as EventListener,
      );
      window.removeEventListener(
        "closeOrganizationModal",
        onCloseOrganizationModal as EventListener,
      );
      if (onCloseDonorModal) {
        window.removeEventListener(
          "closeDonorModal",
          onCloseDonorModal as EventListener,
        );
      }
    };
  }, [onCloseProjectModal, onCloseOrganizationModal, onCloseDonorModal]);

  // Find selected items based on URL parameters
  const selectedProject = useMemo(() => {
    if (!selectedProjectKey || !nestedOrganizations.length) return null;

    for (const org of nestedOrganizations) {
      for (const project of org.projects || []) {
        // Match product_key using URL slug format (lowercase with dashes)
        const productKey = project.fields?.product_key;
        if (productKey && matchesUrlSlug(selectedProjectKey, productKey)) {
          // Extract donor countries from project's own agencies
          const projectAgencies = project.agencies || [];
          const projectDonorCountriesSet = new Set<string>();
          if (Array.isArray(projectAgencies) && projectAgencies.length > 0) {
            projectAgencies.forEach((a: any) => {
              const aFields = (a && a.fields) || {};
              const c =
                aFields["Country Name"] ||
                aFields["Country"] ||
                aFields["Agency Associated Country"];
              if (Array.isArray(c)) {
                c.forEach((cc: unknown) => {
                  if (typeof cc === "string" && cc.trim())
                    projectDonorCountriesSet.add(cc.trim());
                });
              } else if (typeof c === "string" && c.trim()) {
                projectDonorCountriesSet.add(c.trim());
              }
            });
          }
          const projectDonorCountries = Array.from(projectDonorCountriesSet);

          return {
            project: {
              id: project.id,
              productKey: project.fields?.["product_key"] || "",
              projectName:
                project.fields?.["Project/Product Name"] ||
                project.fields?.["Project Name"] ||
                project.name ||
                "Unnamed Project",
              projectDescription: project.fields?.["Project Description"] || "",
              projectWebsite: project.fields?.["Project Website"] || "",
              investmentTypes: project.fields?.["Investment Type(s)"] || [],
              investmentThemes: project.fields?.["Investment Theme(s)"] || [],
              donorCountries: projectDonorCountries,
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
    if (!selectedOrgKey) return null;

    // First, try to find in processed organizations (which have injected member states)
    if (dashboardData?.allOrganizations) {
      const processedOrg = dashboardData.allOrganizations.find((org) => {
        const nestedOrg = nestedOrganizations.find((n) => n.id === org.id);
        const orgKey = nestedOrg?.fields?.["org_key"];
        return orgKey && matchesUrlSlug(selectedOrgKey, orgKey);
      });

      if (processedOrg) {
        return processedOrg;
      }
    }

    // Fallback: build from nested organizations if processed data not available
    if (!nestedOrganizations.length) return null;

    const nestedOrg = nestedOrganizations.find((org: any) => {
      const orgKey = org.fields?.["org_key"];
      return orgKey && matchesUrlSlug(selectedOrgKey, orgKey);
    });

    if (!nestedOrg) return null;

    // Convert nested organization to OrganizationWithProjects format
    const projectsData = (nestedOrg.projects || []).map((project: any) => ({
      id: project.id,
      projectName:
        project.fields?.["Project/Product Name"] ||
        project.fields?.["Project Name"] ||
        project.name ||
        "Unnamed Project",
      projectDescription: project.fields?.["Project Description"] || "",
      projectWebsite: project.fields?.["Project Website"] || "",
      investmentTypes: project.fields?.["Investment Type(s)"] || [],
      donorCountries: project.donor_countries || [],
      provider: nestedOrg.name || "Unknown Provider",
    }));

    return {
      id: nestedOrg.id,
      organizationName: nestedOrg.name || "Unnamed Organization",
      type: Array.isArray(nestedOrg.fields?.["Org Type"])
        ? nestedOrg.fields["Org Type"][0]
        : nestedOrg.fields?.["Org Type"] || "Unknown",
      donorCountries: nestedOrg.donor_countries || [],
      donorInfo: (nestedOrg.donor_countries || []).map((country: string) => ({
        country,
        isOrgLevel: true,
      })),
      projects: projectsData,
      projectCount: projectsData.length,
    } as OrganizationWithProjects;
  }, [selectedOrgKey, nestedOrganizations, dashboardData?.allOrganizations]);

  // Shared export options for CSV/XLSX
  const getExportOptions = () => ({
    searchQuery: appliedSearchQuery || undefined,
    donorCountries: combinedDonors,
    investmentTypes: investmentTypes,
    investmentThemes: investmentThemes,
  });

  // Generic export handler factory
  const createExportHandler =
    (
      exportFn: typeof exportViewAsCSV | typeof exportViewAsXLSX,
      setLoading: (loading: boolean) => void,
      errorMessage: string,
    ) =>
    async () => {
      try {
        setLoading(true);
        await exportFn(organizationsWithProjects, getExportOptions());
      } catch (error) {
        console.error(`Export failed:`, error);
        alert(errorMessage);
      } finally {
        setLoading(false);
      }
    };

  const handleExportCSV = createExportHandler(
    exportViewAsCSV,
    setCSVExportLoading,
    labels.errors.exportCsvFailed,
  );

  const handleExportXLSX = createExportHandler(
    exportViewAsXLSX,
    setXLSXExportLoading,
    labels.errors.exportXlsxFailed,
  );

  const sortedOrganizations = useMemo(
    () =>
      dashboardData
        ? [...dashboardData.organizationsWithProjects].sort((a, b) =>
            sortOrganizations(a, b, sortBy, sortDirection),
          )
        : [],
    [dashboardData?.organizationsWithProjects, sortBy, sortDirection],
  );

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Compass className="mr-3 h-10 w-10 animate-spin text-[var(--brand-primary)]" />
        <span className="text-slate-600">{labels.loading.message}</span>
      </div>
    );
  }

  // If no data, just return null (no error screen)
  if (!dashboardData) {
    return null;
  }

  // Extract data for use in component
  const {
    stats,
    organizationsWithProjects,
    allOrganizations,
    donorCountries: availableDonorCountries,
  } = dashboardData;

  // Always show all investment types in the type filter
  const allKnownInvestmentTypes = Object.values(labels.investmentTypes);

  // Generate dynamic filter description for Organizations & Projects section
  const getFilterDescription = () => {
    const hasFilters =
      combinedDonors.length > 0 ||
      investmentTypes.length > 0 ||
      investmentThemes.length > 0 ||
      appliedSearchQuery;

    if (!hasFilters) {
      const template = labels.filterDescription.showingAll;
      const parts = template.split(/(\{[^}]+\})/);

      return (
        <>
          {parts.map((part, index) => {
            if (part === "{projects}") {
              return <strong key={index}>{stats.dataProjects}</strong>;
            } else if (part === "{organizations}") {
              return <strong key={index}>{stats.dataProviders}</strong>;
            }
            return part;
          })}
        </>
      );
    }

    const elements: React.ReactNode[] = [];

    // Start with donor countries
    if (combinedDonors.length > 0) {
      let donorString: string;
      if (combinedDonors.length === 1) {
        donorString = combinedDonors[0];
      } else if (combinedDonors.length === 2) {
        donorString = `${combinedDonors[0]} & ${combinedDonors[1]}`;
      } else {
        donorString = `${combinedDonors.slice(0, -1).join(", ")} & ${combinedDonors[combinedDonors.length - 1]}`;
      }

      // Build agency string if agencies are selected
      let agencyString: string = "";
      if (selectedAgencies.length > 0) {
        if (selectedAgencies.length === 1) {
          agencyString = selectedAgencies[0];
        } else if (selectedAgencies.length === 2) {
          agencyString = `${selectedAgencies[0]} & ${selectedAgencies[1]}`;
        } else {
          agencyString = `${selectedAgencies.slice(0, -1).join(", ")} & ${selectedAgencies[selectedAgencies.length - 1]}`;
        }
      }

      // Get all donors from the currently filtered organizations
      const currentDonors = new Set<string>();
      organizationsWithProjects.forEach((org) => {
        org.donorCountries.forEach((country) => currentDonors.add(country));
      });

      // Calculate other donors (current donors minus the selected ones)
      const otherDonorsCount = currentDonors.size - combinedDonors.length;

      const orgCount = stats.dataProviders;
      const projectCount = stats.dataProjects;
      const orgLabel = orgCount !== 1 ? "organizations" : "organization";
      const productLabel =
        projectCount !== 1 ? labels.product.plural : labels.product.singular;

      if (otherDonorsCount > 0) {
        const otherDonorLabel = otherDonorsCount !== 1 ? "donors" : "donor";
        if (combinedDonors.length === 1) {
          elements.push(
            <React.Fragment key="donors">
              <strong>{donorString}</strong>
              {agencyString && (
                <> (through <strong>{agencyString}</strong>)</>
              )}{" "}
              funds <strong>{orgCount}</strong> {orgLabel} (
              <strong>{projectCount}</strong> {productLabel}).{" "}
              <strong>{otherDonorsCount}</strong> other {otherDonorLabel} also
              fund at least one of them.
            </React.Fragment>,
          );
        } else {
          elements.push(
            <React.Fragment key="donors">
              The selected donors fund <strong>{orgCount}</strong> {orgLabel} (
              <strong>{projectCount}</strong> {productLabel}).{" "}
              <strong>{otherDonorsCount}</strong> other {otherDonorLabel} also
              fund at least one of them.
            </React.Fragment>,
          );
        }
      } else {
        if (combinedDonors.length === 1) {
          elements.push(
            <React.Fragment key="donors">
              <strong>{donorString}</strong>
              {agencyString && (
                <> (through <strong>{agencyString}</strong>)</>
              )}{" "}
              funds <strong>{orgCount}</strong> {orgLabel} (
              <strong>{projectCount}</strong> {productLabel}).
            </React.Fragment>,
          );
        } else {
          elements.push(
            <React.Fragment key="donors">
              The selected donors fund <strong>{orgCount}</strong> {orgLabel} (
              <strong>{projectCount}</strong> {productLabel}).
            </React.Fragment>,
          );
        }
      }
    } else {
      elements.push("Showing");

      // Add organization count (donor fragment includes stats when donors are active)
      const organizationLabel =
        stats.dataProviders !== 1 ? "organizations" : "organization";
      elements.push(
        <React.Fragment key="orgs">
          {" "}
          <strong>{stats.dataProviders}</strong> {organizationLabel}, providing
        </React.Fragment>,
      );

      // Add project count
      const projectLabel =
        stats.dataProjects !== 1
          ? labels.product.plural
          : labels.product.singular;
      elements.push(
        <React.Fragment key="projects">
          {" "}
          <strong>{stats.dataProjects}</strong> {projectLabel}
        </React.Fragment>,
      );
    }

    // Add investment types
    if (investmentTypes.length > 0) {
      // Map selected type keys to display names where possible
      const displayTypes = investmentTypes.map((type) => {
        const typeKey = Object.keys(labels.investmentTypes).find(
          (key) =>
            labels.investmentTypes[key as keyof typeof labels.investmentTypes]
              .toLowerCase()
              .includes(type.toLowerCase()) ||
            type.toLowerCase().includes(key.toLowerCase()),
        );
        return typeKey
          ? labels.investmentTypes[
              typeKey as keyof typeof labels.investmentTypes
            ]
          : type;
      });

      elements.push(
        <React.Fragment key="types">
          {" "}
          in <strong>{displayTypes.join(" / ")}</strong>
        </React.Fragment>,
      );
    }

    // Add investment themes
    if (investmentThemes.length > 0) {
      elements.push(
        <React.Fragment key="themes">
          {" "}
          with themes <strong>{investmentThemes.join(" / ")}</strong>
        </React.Fragment>,
      );
    }

    // Add search query (only if it's been applied)
    if (appliedSearchQuery) {
      elements.push(
        <React.Fragment key="search">
          {" "}
          relating to <strong>"{appliedSearchQuery}"</strong>
        </React.Fragment>,
      );
    }

    return <>{elements}</>;
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      {/* Header Section - Fixed */}
      <PageHeader />

      {/* Main Content - Add top padding to account for fixed header */}
      <div className="mx-auto max-w-[82rem] overflow-x-hidden px-4 py-4 pt-20 sm:px-6 sm:py-6 sm:pt-24 lg:px-8">
        <div className="space-y-4 sm:space-y-[var(--spacing-section)]">

          {/* Main Layout - Full Width */}
          <div>
            {/* View Tabs - Outside Card */}
            <Tabs
              value={activeView}
              onValueChange={(v) => {
                const view = v as "table" | "donors";
                setActiveView(view);
                onViewChange?.(view);
              }}
              className="-mb-px flex w-full flex-col gap-0"
            >
              {/* Tab List with Controls - Unified */}
              <TabsList className="trapezoid-tabs-container h-auto w-full justify-between gap-0 rounded-none border-0 bg-transparent p-0">
                {/* Left Side Tabs */}
                <div className="flex items-center gap-0">
                  <TooltipProvider delayDuration={0}>
                    {TABS.map(({ value, label, Icon, tooltip }) => (
                      <div
                        key={value}
                        className={
                          value === "donors"
                            ? "hidden sm:block"
                            : ""
                        }
                      >
                        {tipsEnabled ? (
                          <TooltipUI>
                            <TooltipTrigger asChild>
                              <div>
                                <TabsTrigger
                                  value={value}
                                  className="trapezoid-tab -ml-4 sm:-ml-8"
                                >
                                  <SectionHeader
                                    icon={<Icon />}
                                    title={label}
                                    isActive={value === activeView}
                                  />
                                </TabsTrigger>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              align="center"
                              className="max-w-100 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                              sideOffset={5}
                              avoidCollisions={true}
                              style={TOOLTIP_STYLE}
                            >
                              {tooltip}
                            </TooltipContent>
                          </TooltipUI>
                        ) : (
                          <div>
                            <TabsTrigger
                              value={value}
                              className="trapezoid-tab -ml-4 sm:-ml-8"
                            >
                              <SectionHeader
                                icon={<Icon />}
                                title={label}
                                isActive={value === activeView}
                              />
                            </TabsTrigger>
                          </div>
                        )}
                      </div>
                    ))}
                  </TooltipProvider>
                </div>

                {/* Sort and Settings Trapezoid - Right-aligned */}
                <div className="flex animate-in items-center gap-0 duration-300 slide-in-from-right-5 fade-in">
                  {/* Sort Dropdown Tab */}
                  {(activeView === "table" || activeView === "donors") && (
                    <div className="hidden sm:block">
                      {/* Trapezoid Container */}
                      <div className="trapezoid-tab trapezoid-tab-white flex items-center">
                        {/* Sort Direction Button */}
                        <button
                          onClick={() => {
                            const newDirection =
                              sortDirection === "asc" ? "desc" : "asc";
                            onSortChange(sortBy, newDirection);
                          }}
                          title={
                            sortDirection === "asc"
                              ? "Sort ascending"
                              : "Sort descending"
                          }
                          className="p-0 transition-opacity hover:opacity-70"
                        >
                          {sortDirection === "asc" ? (
                            <ArrowUpWideNarrow className="h-4 w-4" />
                          ) : (
                            <ArrowDownWideNarrow className="h-4 w-4" />
                          )}
                        </button>

                        {/* Sort Field Dropdown */}
                        <DropdownMenu
                          onOpenChange={(open) => setSortMenuOpen(open)}
                        >
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-0 border-none bg-transparent p-0 transition-opacity hover:opacity-70">
                              {/* Sort Field Text */}
                              <span className="font-roboto ml-2 text-sm font-semibold">
                                {effectiveSortBy === "overlap"
                                  ? "Most overlap"
                                  : effectiveSortBy === "name"
                                    ? "Alphabetically"
                                    : effectiveSortBy === "donors"
                                      ? activeView === "donors"
                                        ? "Organizations"
                                        : "Donors"
                                      : effectiveSortBy === "assets"
                                        ? labels.product.capitalizedPlural
                                        : "Funding"}
                              </span>

                              {/* Dropdown Chevron */}
                              <ChevronDown
                                className={`ml-2 h-3 w-3 shrink-0 transform opacity-50 transition-transform ${
                                  sortMenuOpen ? "rotate-180" : ""
                                }`}
                              />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            side="bottom"
                            sideOffset={4}
                            className="w-auto min-w-[140px] border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
                          >
                            <DropdownMenuItem
                              onClick={() =>
                                onSortChange("name", sortDirection)
                              }
                              className="cursor-pointer py-1 text-[14px]"
                            >
                              Alphabetically
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                onSortChange("donors", sortDirection)
                              }
                              className="cursor-pointer py-1 text-[14px]"
                            >
                              {activeView === "donors"
                                ? "No. of Organizations"
                                : "No. of Donors"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                onSortChange("assets", sortDirection)
                              }
                              className="cursor-pointer py-1 text-[14px]"
                            >
                              No. of {labels.product.capitalizedPlural}
                            </DropdownMenuItem>
                            {activeView === "table" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  onSortChange("funding", sortDirection)
                                }
                                className="cursor-pointer py-1 text-[14px]"
                              >
                                Funding
                              </DropdownMenuItem>
                            )}
                            {activeView === "donors" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  onSortChange("overlap", sortDirection)
                                }
                                className="cursor-pointer py-1 text-[14px]"
                              >
                                Most overlap
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  )}

                  {/* Settings Tab */}
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="trapezoid-tab trapezoid-tab-white mr-0">
                          <Settings className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        side="bottom"
                        sideOffset={4}
                        className="w-auto min-w-[250px] border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
                      >
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          onClick={() => setTipsEnabled(!tipsEnabled)}
                          className="flex cursor-pointer items-center justify-between px-2 py-2 text-sm hover:bg-slate-100"
                        >
                          <div className="flex items-center">
                            <Lightbulb className="mr-2 h-4 w-4" />
                            <span>Show Tips</span>
                          </div>
                          <div
                            className={`h-4 w-7 rounded-full transition-colors ${tipsEnabled ? "bg-[var(--brand-primary-dark)]" : "bg-slate-300"}`}
                          >
                            <div
                              className={`h-4 w-4 rounded-full bg-white transition-transform ${tipsEnabled ? "translate-x-3" : "translate-x-0"}`}
                            />
                          </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          onClick={() => {
                            const newValue = !showGeneralContributions;
                            setShowGeneralContributions(newValue);
                            setGeneralContributionsEnabled(newValue);
                          }}
                          className="flex cursor-pointer items-center justify-between px-2 py-2 text-sm hover:bg-slate-100"
                        >
                          <div className="flex items-center">
                            <Landmark className="mr-2 h-4 w-4" />
                            <span>Show UN Core Contributions</span>
                          </div>
                          <div
                            className={`h-4 w-7 rounded-full transition-colors ${showGeneralContributions ? "bg-[var(--brand-primary-dark)]" : "bg-slate-300"}`}
                          >
                            <div
                              className={`h-4 w-4 rounded-full bg-white transition-transform ${showGeneralContributions ? "translate-x-3" : "translate-x-0"}`}
                            />
                          </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          onClick={() => {
                            const raw = searchParams?.toString() || "";
                            const params = new URLSearchParams(raw);
                            const incoming = (
                              params.get("d") ??
                              params.get("donors") ??
                              ""
                            )
                              .split(",")
                              .filter(Boolean);
                            const crafdKey = "crafd-donors";
                            const crafdExpansion = [
                              "germany",
                              "netherlands",
                              "canada",
                              "finland",
                              "luxembourg",
                              "united-kingdom",
                              "european-union",
                              "usa",
                            ];

                            const hasCrafd =
                              incoming.includes(crafdKey) ||
                              (incoming.length === crafdExpansion.length &&
                                crafdExpansion.every((s) =>
                                  incoming.includes(s),
                                ));

                            if (hasCrafd) {
                              // Remove donor filter entirely
                              params.delete("d");
                              params.delete("donors");
                            } else {
                              // Set the short key so expansion logic handles it downstream
                              params.set("d", crafdKey);
                              // keep 'donors' cleared to avoid duplicates
                              params.delete("donors");
                            }

                            const target = params.toString()
                              ? `?${params.toString()}`
                              : "/";
                            router.push(target);
                          }}
                          className="flex cursor-pointer items-center justify-between px-2 py-2 text-sm hover:bg-slate-100"
                        >
                          <div className="flex items-center">
                            <UserRoundPlus className="mr-2 h-4 w-4" />
                            <span>Select CRAF'd Donors</span>
                          </div>
                          {(() => {
                            const raw = searchParams?.toString() || "";
                            const params = new URLSearchParams(raw);
                            const incoming = (
                              params.get("d") ??
                              params.get("donors") ??
                              ""
                            )
                              .split(",")
                              .filter(Boolean);
                            const crafdKey = "crafd-donors";
                            const crafdExpansion = [
                              "germany",
                              "netherlands",
                              "canada",
                              "finland",
                              "luxembourg",
                              "united-kingdom",
                              "european-union",
                              "usa",
                            ];

                            const hasCrafd =
                              incoming.includes(crafdKey) ||
                              (incoming.length === crafdExpansion.length &&
                                crafdExpansion.every((s) =>
                                  incoming.includes(s),
                                ));

                            return (
                              <div
                                className={`h-4 w-7 rounded-full transition-colors ${hasCrafd ? "bg-[var(--brand-primary-dark)]" : "bg-slate-300"}`}
                              >
                                <div
                                  className={`h-4 w-4 rounded-full bg-white transition-transform ${hasCrafd ? "translate-x-3" : "translate-x-0"}`}
                                />
                              </div>
                            );
                          })()}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </TabsList>

              {/* Card with Content and Tab Views */}
              <Card
                className={`${STYLES.cardGlass} card-bottom-rounded overflow-x-hidden !border-t-0`}
              >
                {/* Filters */}
                <CardContent className="px-4 pt-0 pb-4 sm:px-6 sm:pb-6">
                  <FilterBar
                    searchQuery={searchQuery}
                    appliedSearchQuery={appliedSearchQuery}
                    onSearchChange={onSearchChange}
                    onSearchSubmit={onSearchSubmit}
                    combinedDonors={combinedDonors}
                    availableDonorCountries={availableDonorCountries}
                    selectedAgencies={selectedAgencies}
                    availableAgencies={availableAgencies}
                    agenciesWithFunding={agenciesWithFunding}
                    onDonorsChange={onDonorsChange}
                    onAgenciesChange={onAgenciesChange}
                    investmentTypes={investmentTypes}
                    allKnownInvestmentTypes={allKnownInvestmentTypes}
                    onTypesChange={onTypesChange}
                    investmentThemes={investmentThemes}
                    allKnownInvestmentThemes={allKnownInvestmentThemes}
                    investmentThemesByType={investmentThemesByType}
                    onThemesChange={onThemesChange}
                    onResetFilters={handleClearAll}
                    projectCountsByType={projectCountsByType}
                    projectCountsByTheme={projectCountsByTheme}
                    filterDescription={getFilterDescription()}
                    className="-mb-6 sm:-mb-7"
                    rightActions={
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
                    }
                  />
                </CardContent>
                {/* Tab Content Views */}
                <CardContent className="px-4 pt-2 sm:px-6 sm:pt-0">
                  <TabsContent value="table" className="mt-0">
                    <div className="space-y-2 transition-all duration-500">
                      {sortedOrganizations.map((org) => {
                          const isExpanded = expandedOrgs.has(org.id);
                          const hasProjects = org.projects.length > 0;

                          return (
                            <Collapsible
                              key={org.id}
                              open={isExpanded}
                              onOpenChange={() => {
                                const newExpanded = new Set(expandedOrgs);
                                if (isExpanded) {
                                  newExpanded.delete(org.id);
                                } else {
                                  newExpanded.add(org.id);
                                }
                                setExpandedOrgs(newExpanded);
                              }}
                              className="transition-all duration-500 ease-out"
                            >
                              <div
                                className="w-full cursor-pointer"
                                onClick={() => {
                                  const newExpanded = new Set(expandedOrgs);
                                  if (isExpanded) {
                                    newExpanded.delete(org.id);
                                  } else {
                                    newExpanded.add(org.id);
                                  }
                                  setExpandedOrgs(newExpanded);
                                }}
                              >
                                <OrganizationBox
                                  orgId={org.id}
                                  organizationName={org.organizationName}
                                  nestedOrganizations={nestedOrganizations}
                                  organizationsTable={organizationsTable}
                                  isExpanded={isExpanded}
                                  hasProjects={hasProjects}
                                  onOpenOrganizationModal={
                                    onOpenOrganizationModal
                                  }
                                  logoErrors={logoErrors}
                                  onLogoError={handleLogoError}
                                  headingLevel="h3"
                                  showDetailsButton={true}
                                  projectCount={org.projects.length}
                                  projectLabel={
                                    org.projects.length === 1
                                      ? labels.product.singular
                                      : labels.product.plural
                                  }
                                >
                                  {/* Donor summary — replaces per-donor chips */}
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    Funded by{" "}
                                    <strong className="text-slate-700 dark:text-slate-300">
                                      {org.donorCountries.length}
                                    </strong>{" "}
                                    {org.donorCountries.length === 1
                                      ? "donor"
                                      : "donors"}{" "}
                                    ·{" "}
                                    <strong className="text-slate-700 dark:text-slate-300">
                                      {org.projects.length}
                                    </strong>{" "}
                                    {org.projects.length === 1
                                      ? labels.product.singular
                                      : labels.product.plural}
                                  </span>
                                </OrganizationBox>
                              </div>
                              <CollapsibleContent>
                                <div className="mt-2 ml-8 space-y-2 sm:ml-14">
                                  {org.projects.map((project: ProjectData) => {
                                    // Get product_key from nested data
                                    const nestedOrg = nestedOrganizations.find(
                                      (n: any) => n.id === org.id,
                                    );
                                    const nestedProject =
                                      nestedOrg?.projects?.find(
                                        (p: any) => p.id === project.id,
                                      );
                                    const projectKey =
                                      nestedProject?.fields?.product_key;

                                    return (
                                      <ProjectBox
                                        key={project.id}
                                        project={project}
                                        onClick={() => {
                                          if (projectKey) {
                                            onOpenProjectModal(projectKey);
                                          }
                                        }}
                                        tipsEnabled={tipsEnabled}
                                        combinedDonors={combinedDonors}
                                      />
                                    );
                                  })}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          );
                        })}
                    </div>
                    {organizationsWithProjects.length === 0 &&
                      activeView === "table" && (
                        <NoResultsPopup onResetFilters={onResetFilters} />
                      )}
                  </TabsContent>

                  <TabsContent value="donors" className="mt-0">
                    <DonorTable
                      organizationsWithProjects={organizationsWithProjects}
                      nestedOrganizations={nestedOrganizations}
                      organizationsTable={organizationsTable}
                      onOpenOrganizationModal={onOpenOrganizationModal}
                      onOpenProjectModal={onOpenProjectModal}
                      onOpenDonorModal={onOpenDonorModal}
                      combinedDonors={combinedDonors}
                      sortBy={
                        effectiveSortBy === "funding"
                          ? "assets"
                          : effectiveSortBy === "donors"
                            ? "orgs"
                            : (effectiveSortBy as "name" | "orgs" | "assets" | "overlap")
                      }
                      sortDirection={sortDirection}
                    />
                    {organizationsWithProjects.length === 0 &&
                      activeView === "donors" && (
                        <NoResultsPopup onResetFilters={onResetFilters} />
                      )}
                  </TabsContent>

                  {/* Network Analysis tab removed — see /insights */}
                </CardContent>
              </Card>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Impressum Footer */}
      <footer className="mt-8 border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 sm:mt-16">
        <div className="mx-auto max-w-[82rem] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:justify-between sm:gap-0">
            <div className="flex-1 text-center">
              <p className="text-xs text-slate-600 dark:text-slate-400 sm:text-sm">
                {labels.footer.dataGatheredBy}{" "}
                <a
                  href="https://crafd.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                  style={{ color: "var(--brand-primary)" }}
                >
                  {labels.footer.organization}
                </a>{" "}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                {labels.footer.copyright.replace(
                  "{year}",
                  new Date().getFullYear().toString(),
                )}
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Project Modal */}
      {selectedProject && (
        <ProjectModal
          project={selectedProject.project}
          organizationName={selectedProject.organizationName}
          allOrganizations={allOrganizations}
          loading={false}
          projectAgenciesMap={modalMaps.projectAgenciesMap}
          onOpenOrganizationModal={onOpenOrganizationModal}
          onOpenProjectModal={onOpenProjectModal}
          onOpenDonorModal={onOpenDonorModal}
          onTypeClick={onTypeClick}
          onThemeClick={onThemeClick}
        />
      )}
      {/* Organization Modal */}
      {selectedOrganization &&
        (() => {
          // Find matching record in organizations table using clean field names
          const target = normalizeOrgName(
            selectedOrganization.organizationName || selectedOrganization.id,
          );
          const match = organizationsTable.find((rec) => {
            const full = (rec.fields["Org Full Name"] as string) || "";
            const short = (rec.fields["Org Short Name"] as string) || "";
            return [full, short].some(
              (s) => normalizeOrgName(String(s || "")) === target,
            );
          });

          // Use the matched record directly, or create a minimal fallback
          let orgRecord: {
            id: string;
            createdTime?: string;
            fields: Record<string, unknown>;
            iati_data?: any;
          } = match || {
            id: selectedOrganization.id,
            fields: {
              "Org Full Name": selectedOrganization.organizationName,
            },
          };

          // Find matching organization in nested data to get IATI data
          const nestedMatch = nestedOrganizations.find((nestedOrg: any) => {
            const nestedName = normalizeOrgName(nestedOrg.name || "");
            const nestedFull = normalizeOrgName(
              nestedOrg.fields?.["Org Full Name"] || "",
            );
            const nestedShort = normalizeOrgName(
              nestedOrg.fields?.["Org Short Name"] || "",
            );
            return (
              nestedName === target ||
              nestedFull === target ||
              nestedShort === target ||
              nestedOrg.id === orgRecord.id
            );
          });

          // Add IATI data if available from nested organization
          if (nestedMatch?.iati_data) {
            orgRecord = {
              ...orgRecord,
              iati_data: nestedMatch.iati_data,
            };
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
              onOpenProjectModal={onOpenProjectModal}
              projectIdToKeyMap={modalMaps.projectIdToKeyMap}
              onOpenDonorModal={onOpenDonorModal}
              onTypeClick={onTypeClick}
            />
          );
        })()}
      {/* Donor Modal */}
      {selectedDonorCountry && (
        <DonorModal
          donorCountry={selectedDonorCountry}
          nestedOrganizations={nestedOrganizations as any}
          loading={false}
          onOpenOrganizationModal={onOpenOrganizationModal}
          onOpenProjectModal={onOpenProjectModal}
        />
      )}
    </div>
  );
};

export default CrisisDataDashboard;
