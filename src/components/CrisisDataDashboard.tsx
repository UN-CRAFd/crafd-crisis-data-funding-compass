"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
// Image import removed because it's not used in this file
import ChartCard from "@/components/ChartCard";
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
import SurveyBanner from "@/components/SurveyBanner";
import { Button } from "@/components/ui/button";
import { matchesUrlSlug } from "@/lib/urlShortcuts";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { getIconForInvestmentType } from "@/config/investmentTypeIcons";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Database,
  Table,
  Globe,
  Info,
  ArrowUpWideNarrow,
  ArrowDownWideNarrow,
  Network,
  Settings,
  Lightbulb,
  Landmark,
  UserRoundPlus,
  Compass
} from "lucide-react";
import organizationsTableRaw from "../../public/data/organizations-table.json";
import nestedOrganizationsRaw from "../../public/data/organizations-nested.json";
import {
  buildOrgDonorCountriesMap,
  buildOrgDonorInfoMap,
  buildOrgProjectsMap,
  buildProjectNameMap,
  buildProjectIdToKeyMap,
  buildOrgAgenciesMap,
  buildOrgProjectDonorsMap,
  buildOrgProjectDonorAgenciesMap,
  buildProjectAgenciesMap,
  buildProjectDescriptionMap,
  calculateOrganizationTypesFromOrganizationsWithProjects,
  getNestedOrganizationsForModals,
} from "../lib/data";
import { exportDashboardToPDF } from "../lib/exportPDF";
import { exportViewAsCSV, exportViewAsXLSX } from "../lib/exportCSV";
import { useTips } from "@/contexts/TipsContext";
import { useGeneralContributions } from "@/contexts/GeneralContributionsContext";
import { setGeneralContributionsEnabled } from "@/lib/data";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  DashboardStats,
  OrganizationProjectData,
  OrganizationTypeData,
  OrganizationWithProjects,
  ProjectData,
  ProjectTypeData,
} from "../types/airtable";
import { Badge } from "@/components/shared/Badge";
import { StatCard } from "@/components/shared/StatCard";
import { INVESTMENT_TYPE_DESCRIPTIONS } from "@/config/investmentDescriptions";
import { useProjectCounts } from "@/hooks/useProjectCounts";

// Eagerly load NetworkGraph on client side to avoid lazy loading delay
const NetworkGraph = dynamic(() => import("@/components/NetworkGraph"), {
  ssr: false,
});

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
  {
    value: "network",
    label: "Network Analysis",
    Icon: Network,
    tooltip:
      "Visualize relationships between organizations, projects, and donors",
  },
] as const;

// Consolidated style constants
const STYLES = {
  cardGlass: "!border-0 bg-white",
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
  sortBy: "name" | "donors" | "assets" | "funding",
  sortDirection: "asc" | "desc"
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
  }
  return sortDirection === "asc" ? comparison : -comparison;
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
  investmentTypes: string[];
  investmentThemes: string[];
  searchQuery: string; // Current input value
  appliedSearchQuery: string; // Applied search query (from URL)
  selectedOrgKey: string; // Organization key from URL
  selectedProjectKey: string; // Asset key from URL
  sortBy: "name" | "donors" | "assets" | "funding"; // Sort field from URL
  sortDirection: "asc" | "desc"; // Sort direction from URL
  onDonorsChange: (values: string[]) => void;
  onTypesChange: (values: string[]) => void;
  onThemesChange: (values: string[]) => void;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onResetFilters: () => void;
  onSortChange: (
    sortBy: "name" | "donors" | "assets" | "funding",
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
  onViewChange?: (view: "table" | "network" | "donors") => void;
  logoutButton?: React.ReactNode;
}

const CrisisDataDashboard = ({
  dashboardData,
  loading,
  error,
  combinedDonors,
  investmentTypes,
  investmentThemes,
  searchQuery,
  appliedSearchQuery,
  selectedOrgKey,
  selectedProjectKey,
  selectedDonorCountry,
  onDonorsChange,
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
  onDonorClick,
  onTypeClick,
  onThemeClick,
  onViewChange,
  logoutButton,
  sortBy,
  sortDirection,
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
    setShowGeneralContributions =
      genContContext.setShowGeneralContributions;
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
  const [activeView, setActiveView] = useState<"table" | "network" | "donors">(
    "table",
  ); // Add view state

  // Enforce table-only on small screens (mobile). Hide view switcher on mobile via responsive classes.
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

  // Notify parent when view changes
  useEffect(() => {
    if (onViewChange) {
      onViewChange(activeView);
    }
  }, [activeView, onViewChange]);

  // Modal and UI states
  const [shareSuccess, setShareSuccess] = useState(false);
  const [csvExportLoading, setCSVExportLoading] = useState(false);
  const [xlsxExportLoading, setXLSXExportLoading] = useState(false);
  const [pdfExportLoading, setPDFExportLoading] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [logoErrors, setLogoErrors] = useState<Set<string>>(new Set());

  // Memoized callback for logo errors to prevent recreation on each render
  const handleLogoError = useCallback((orgId: string) => {
    setLogoErrors((prev) => new Set([...prev, orgId]));
  }, []);

  // Load static organizations table for modals
  const organizationsTable: Array<{
    id: string;
    createdTime?: string;
    fields: Record<string, unknown>;
  }> = organizationsTableRaw as Array<{
    id: string;
    createdTime?: string;
    fields: Record<string, unknown>;
  }>;

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

  // Centralized data maps for modals
  const [projectNameMap, setProjectNameMap] = useState<Record<string, string>>(
    {},
  );
  const [projectIdToKeyMap, setProjectIdToKeyMap] = useState<
    Record<string, string>
  >({});
  const [projectDescriptionMap, setProjectDescriptionMap] = useState<
    Record<string, string>
  >({});
  const [orgProjectsMap, setOrgProjectsMap] = useState<
    Record<string, Array<{ id: string; investmentTypes: string[] }>>
  >({});
  const [orgDonorCountriesMap, setOrgDonorCountriesMap] = useState<
    Record<string, string[]>
  >({});
  const [orgDonorInfoMap, setOrgDonorInfoMap] = useState<
    Record<string, import("@/types/airtable").DonorInfo[]>
  >({});
  const [orgAgenciesMap, setOrgAgenciesMap] = useState<
    Record<string, Record<string, string[]>>
  >({});
  const [orgProjectDonorsMap, setOrgProjectDonorsMap] = useState<
    Record<string, Record<string, string[]>>
  >({});
  const [orgProjectDonorAgenciesMap, setOrgProjectDonorAgenciesMap] = useState<
    Record<string, Record<string, Record<string, string[]>>>
  >({});
  const [projectAgenciesMap, setProjectAgenciesMap] = useState<
    Record<string, Record<string, string[]>>
  >({});

  // Load nested organization data for modal maps
  useEffect(() => {
    const loadModalData = async () => {
      try {
        const nestedOrgs = await getNestedOrganizationsForModals();
        setNestedOrganizations(nestedOrgs);
        setProjectNameMap(buildProjectNameMap(nestedOrgs));
        setProjectIdToKeyMap(buildProjectIdToKeyMap(nestedOrgs));
        setProjectDescriptionMap(buildProjectDescriptionMap(nestedOrgs));
        setOrgProjectsMap(buildOrgProjectsMap(nestedOrgs));
        setOrgDonorCountriesMap(buildOrgDonorCountriesMap(nestedOrgs));
        setOrgDonorInfoMap(buildOrgDonorInfoMap(nestedOrgs));

        // Build org and project-specific agencies maps
        setOrgAgenciesMap(buildOrgAgenciesMap(nestedOrgs));
        setOrgProjectDonorsMap(buildOrgProjectDonorsMap(nestedOrgs));
        setOrgProjectDonorAgenciesMap(
          buildOrgProjectDonorAgenciesMap(nestedOrgs),
        );
        setProjectAgenciesMap(buildProjectAgenciesMap(nestedOrgs));
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

  // Share functionality
  const handleShare = async () => {
    try {
      const currentUrl = window.location.href;
      await navigator.clipboard.writeText(currentUrl);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 2000);
    }
  };

  // Export to PDF functionality
  const handleExportPDF = async () => {
    try {
      setPDFExportLoading(true);
      await exportDashboardToPDF({
        stats: {
          dataProjects: stats.dataProjects,
          dataProviders: stats.dataProviders,
          donorCountries: stats.donorCountries,
        },
        projectTypes: projectTypes,
        organizationTypes: organizationTypes,
        organizationsWithProjects: organizationsWithProjects,
        getFilterDescription: () => {
          if (
            combinedDonors.length === 0 &&
            investmentTypes.length === 0 &&
            !appliedSearchQuery
          ) {
            return "Showing all projects";
          }
          const parts: string[] = [];
          if (combinedDonors.length > 0) {
            parts.push(
              `${combinedDonors.length} donor ${combinedDonors.length === 1 ? "donor" : "donors"}`,
            );
          }
          if (investmentTypes.length > 0) {
            parts.push(
              `${investmentTypes.length} investment ${investmentTypes.length === 1 ? "type" : "types"}`,
            );
          }
          if (appliedSearchQuery) {
            parts.push(`search: "${appliedSearchQuery}"`);
          }
          return parts.length > 0
            ? `Showing ${parts.join(", ")}`
            : "Showing all projects";
        },
      });
    } catch (error) {
      console.error("Failed to export PDF:", error);
      alert(labels.errors.exportPdfFailed);
    } finally {
      setPDFExportLoading(false);
    }
  };

  // Shared export options for CSV/XLSX
  const getExportOptions = () => ({
    searchQuery: appliedSearchQuery || undefined,
    donorCountries: combinedDonors,
    investmentTypes: investmentTypes,
    investmentThemes: investmentThemes,
  });

  // Generic export handler factory
  const createExportHandler = (
    exportFn: typeof exportViewAsCSV | typeof exportViewAsXLSX,
    setLoading: (loading: boolean) => void,
    errorMessage: string,
  ) => async () => {
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

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Compass className="h-10 w-10 animate-spin text-[var(--brand-primary)] mr-3" />
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
    projectTypes,
    organizationsWithProjects,
    allOrganizations,
    donorCountries: availableDonorCountries,
    investmentTypes: availableInvestmentTypes,
    topDonors,
  } = dashboardData;

  // Add a 6th bar to the co-financing donor chart for 'n other donors'
  let donorChartData = topDonors;
  if (availableDonorCountries && topDonors && topDonors.length > 0) {
    const shownDonors = topDonors.map((d) => d.name);
    const otherDonors = availableDonorCountries.filter(
      (donor) => !shownDonors.includes(donor),
    );
    donorChartData = [
      ...topDonors,
      {
        name: `+ ${otherDonors.length} other donor${otherDonors.length === 1 ? "" : "s"}`,
        value: 0,
      },
    ];
  }

  // Always show all investment types in the type filter
  const allKnownInvestmentTypes = Object.values(labels.investmentTypes);
  // Get all types from the pre-generated organizations-with-types.json dictionary
  // and combine with any types inferred from the current organizations list.
  // Get all organization types from organizations-table.json and organizationsWithProjects
  const typesFromTable = Array.from(
    new Set(
      organizationsTable
        .map((rec) => {
          const orgType = rec.fields["Org Type"];
          if (typeof orgType === "string") {
            return orgType.trim();
          } else if (Array.isArray(orgType) && orgType.length > 0) {
            // Handle array case - take first element if it's a string
            return typeof orgType[0] === "string"
              ? orgType[0].trim()
              : undefined;
          }
          return undefined;
        })
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  );
  const inferredTypes = Array.from(
    new Set(organizationsWithProjects.map((org) => org.type).filter(Boolean)),
  );
  const allOrgTypes = Array.from(
    new Set([...typesFromTable, ...inferredTypes]),
  );

  // Calculate organization types using both organizationsWithProjects and organizationsTable
  const organizationTypes: OrganizationTypeData[] =
    calculateOrganizationTypesFromOrganizationsWithProjects(
      organizationsWithProjects,
      allOrgTypes,
    );

  // Convert data for ChartCard components (they expect 'value' instead of 'count')
  const organizationTypesChartData = organizationTypes.map((item) => ({
    name: item.name,
    value: item.count,
  }));
  const projectTypesChartData = projectTypes.map((item) => ({
    name: item.name,
    value: item.count,
  }));

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

      // Get all donors from the currently filtered organizations
      const currentDonors = new Set<string>();
      organizationsWithProjects.forEach((org) => {
        org.donorCountries.forEach((country) => currentDonors.add(country));
      });

      // Calculate other donors (current donors minus the selected ones)
      const otherDonorsCount = currentDonors.size - combinedDonors.length;

      if (otherDonorsCount > 0) {
        const otherDonorLabel =
          otherDonorsCount !== 1
            ? labels.filterDescription.donors
            : labels.filterDescription.donor;
        const verb = combinedDonors.length === 1 ? "co-finances" : "co-finance";
        elements.push(
          <React.Fragment key="donors">
            <strong>{donorString}</strong>, together with{" "}
            <strong>{otherDonorsCount}</strong> other {otherDonorLabel}, {verb}
          </React.Fragment>,
        );
      } else {
        const verb = combinedDonors.length === 1 ? "funds" : "co-finance";
        elements.push(
          <React.Fragment key="donors">
            <strong>{donorString}</strong> {verb}
          </React.Fragment>,
        );
      }
    } else {
      elements.push("Showing");
    }

    // Add organization count
    const organizationLabel =
      stats.dataProviders !== 1 ? "organizations" : "organization";
    elements.push(
      <React.Fragment key="orgs">
        {elements.length > 0 ? " " : ""}
        <strong>{stats.dataProviders}</strong> {organizationLabel}, providing
      </React.Fragment>,
    );

    // Add project count
    const projectLabel = stats.dataProjects !== 1 ? labels.product.plural : labels.product.singular;
    elements.push(
      <React.Fragment key="projects">
        {" "}
        <strong>{stats.dataProjects}</strong> {projectLabel}
      </React.Fragment>,
    );

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
    <div className="min-h-screen bg-slate-100">
      {/* Header Section - Fixed */}
      <PageHeader
        onShare={handleShare}
        shareSuccess={shareSuccess}
        onExportCSV={handleExportCSV}
        onExportXLSX={handleExportXLSX}
        csvExportLoading={csvExportLoading}
        xlsxExportLoading={xlsxExportLoading}
        pdfExportLoading={pdfExportLoading}
        exportMenuOpen={exportMenuOpen}
        onExportMenuChange={setExportMenuOpen}
      />

      {/* Main Content - Add top padding to account for fixed header */}
      <div className="mx-auto max-w-[82rem] overflow-x-hidden px-4 py-4 pt-20 sm:px-6 sm:py-6 sm:pt-24 lg:px-8">
        <div className="space-y-4 sm:space-y-[var(--spacing-section)]">
          {/* Survey Banner */}
          <SurveyBanner />

          {/* Statistics Cards - Configuration-driven rendering */}
          {(() => {
            const donorChartFootnote = combinedDonors.length > 0
              ? `Showing ${topDonors.length} donor${topDonors.length === 1 ? "" : "s"} co-financing the most organizations together with ${formatDonorList(combinedDonors)}`
              : `Showing ${topDonors.length} donor${topDonors.length === 1 ? "" : "s"} funding the most organizations in the current view`;

            const statCardsConfig = [
    
              {
                icon: <Building2 style={{ color: "var(--brand-primary)" }} />,
                title: labels.stats.dataProviders.title,
                value: stats.dataProviders,
                label: labels.stats.dataProviders.label,
                tooltip: labels.stats.dataProviders.tooltip,
                chartTitle: labels.sections.organizationTypes,
                chartData: organizationTypesChartData,
                mobileWidth: "w-[290px]",
              },
                        {
                icon: <Globe style={{ color: "var(--brand-primary)" }} />,
                title: labels.stats.donorCountries.title,
                value: stats.donorCountries,
                label: labels.stats.donorCountries.label,
                tooltip: labels.stats.donorCountries.tooltip,
                chartTitle: labels.sections.donorCount,
                chartData: donorChartData,
                chartFootnote: donorChartFootnote,
                mobileWidth: "w-[280px]",
              },
              {
                icon: <Database style={{ color: "var(--brand-primary)" }} />,
                title: labels.stats.dataProjects.title,
                value: stats.dataProjects,
                label: labels.stats.dataProjects.label,
                tooltip: labels.stats.dataProjects.tooltip,
                chartTitle: labels.sections.projectCategories,
                chartData: projectTypesChartData,
                chartFootnote: labels.ui.chartFootnote,
                mobileWidth: "w-[280px]",
              },
            ];

            const renderStatCard = (config: typeof statCardsConfig[0], key: number) => (
              <StatCard
                key={key}
                icon={config.icon}
                title={config.title}
                value={config.value}
                label={config.label}
                colorScheme="amber"
                tooltip={config.tooltip}
              >
                <ChartCard
                  title={config.chartTitle}
                  icon={config.icon}
                  data={config.chartData}
                  barColor="var(--brand-primary-lighter)"
                  footnote={config.chartFootnote}
                />
              </StatCard>
            );

            return (
              <>
                {/* Mobile Carousel */}
                <div className="sm:hidden">
                  <div className="relative overflow-hidden">
                    <div className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2">
                      {statCardsConfig.map((config, idx) => (
                        <div key={idx} className={`${config.mobileWidth} flex-shrink-0 snap-center`}>
                          {renderStatCard(config, idx)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Desktop Grid */}
                <div className="hidden gap-4 sm:grid sm:grid-cols-2 sm:gap-[var(--spacing-section)] lg:grid-cols-3">
                  {statCardsConfig.map((config, idx) => renderStatCard(config, idx))}
                </div>
              </>
            );
          })()}

          {/* Main Layout - Full Width */}
          <div>
              {/* View Tabs - Outside Card */}
              <Tabs
                value={activeView}
                onValueChange={(v) =>
                  setActiveView(v as "table" | "donors" | "network")
                }
                className="flex w-full flex-col gap-0 -mb-px"
              >
                {/* Tab List with Controls - Unified */}
                <TabsList className="trapezoid-tabs-container h-auto gap-0 p-0 rounded-none border-0 bg-transparent p-0 w-full justify-between">
                  {/* Left Side Tabs */}
                  <div className="flex items-center gap-0">
                    <TooltipProvider delayDuration={0}>
                      {TABS.map(({ value, label, Icon, tooltip }) => (
                        <div key={value} className={value === "network" ? "hidden sm:block" : ""}>
                          {tipsEnabled ? (
                            <TooltipUI>
                              <TooltipTrigger asChild>
                                <div>
                                  <TabsTrigger
                                    value={value}
                                    className="trapezoid-tab -ml-4 sm:-ml-8"
                                  >
                                    <SectionHeader icon={<Icon />} title={label} isActive={value === activeView} />
                                  </TabsTrigger>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                align="center"
                                className="max-w-100 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-800"
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
                                <SectionHeader icon={<Icon />} title={label} isActive={value === activeView} />
                              </TabsTrigger>
                            </div>
                          )}
                        </div>
                      ))}
                    </TooltipProvider>
                  </div>

                  {/* Sort and Settings Trapezoid - Right-aligned */}
                  <div className="animate-in duration-300 slide-in-from-right-5 fade-in flex items-center gap-0">
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
                            className="p-0 hover:opacity-70 transition-opacity"
                          >
                            {sortDirection === "asc" ? (
                              <ArrowUpWideNarrow className="h-4 w-4" />
                            ) : (
                              <ArrowDownWideNarrow className="h-4 w-4" />
                            )}
                          </button>

                          {/* Sort Field Dropdown */}
                          <DropdownMenu onOpenChange={(open) => setSortMenuOpen(open)}>
                            <DropdownMenuTrigger asChild>
                              <button className="flex items-center gap-0 border-none bg-transparent p-0 hover:opacity-70 transition-opacity">
                                {/* Sort Field Text */}
                                 <span className="ml-2 text-sm font-semibold font-roboto">
                                  {sortBy === "name"
                                    ? "Alphabetically"
                                    : sortBy === "donors"
                                      ? activeView === "donors"
                                        ? "Organizations"
                                        : "Donors"
                                      : sortBy === "assets"
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
                            className="w-auto min-w-[140px] border border-slate-200 bg-white shadow-lg"
                          >
                            <DropdownMenuItem
                              onClick={() => onSortChange("name", sortDirection)}
                              className="cursor-pointer py-1 text-[14px]"
                            >
                              Alphabetically
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onSortChange("donors", sortDirection)}
                              className="cursor-pointer py-1 text-[14px]"
                            >
                              {activeView === "donors"
                                ? "No. of Organizations"
                                : "No. of Donors"}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onSortChange("assets", sortDirection)}
                              className="cursor-pointer py-1 text-[14px]"
                            >
                              No. of {labels.product.capitalizedPlural}
                            </DropdownMenuItem>
                            {activeView === "table" && (
                              <DropdownMenuItem
                                onClick={() => onSortChange("funding", sortDirection)}
                                className="cursor-pointer py-1 text-[14px]"
                              >
                                Funding
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
                              className="w-auto min-w-[250px] border border-slate-200 bg-white shadow-lg"
                            >
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                onClick={() =>
                                  setTipsEnabled(!tipsEnabled)
                                }
                                className="cursor-pointer flex items-center justify-between py-2 px-2 text-sm hover:bg-slate-100"
                              >
                                <div className="flex items-center">
                                  <Lightbulb className="mr-2 h-4 w-4" />
                                  <span>Show Tips</span>
                                </div>
                                <div className={`h-4 w-7 rounded-full transition-colors ${tipsEnabled ? "bg-[var(--brand-primary-dark)]" : "bg-slate-300"}`}>
                                  <div className={`h-4 w-4 rounded-full bg-white transition-transform ${tipsEnabled ? "translate-x-3" : "translate-x-0"}`} />
                                </div>
                              </DropdownMenuItem>

                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                                onClick={() => {
                                  const newValue =
                                    !showGeneralContributions;
                                  setShowGeneralContributions(newValue);
                                  setGeneralContributionsEnabled(newValue);
                                }}
                                className="cursor-pointer flex items-center justify-between py-2 px-2 text-sm hover:bg-slate-100"
                              >
                                <div className="flex items-center">
                                  <Landmark className="mr-2 h-4 w-4" />
                                  <span>Include Core Contributions</span>
                                </div>
                                <div className={`h-4 w-7 rounded-full transition-colors ${showGeneralContributions ? "bg-[var(--brand-primary-dark)]" : "bg-slate-300"}`}>
                                  <div className={`h-4 w-4 rounded-full bg-white transition-transform ${showGeneralContributions ? "translate-x-3" : "translate-x-0"}`} />
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
                                    (incoming.length ===
                                      crafdExpansion.length &&
                                      crafdExpansion.every((s) =>
                                        incoming.includes(s)
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
                                className="cursor-pointer flex items-center justify-between py-2 px-2 text-sm hover:bg-slate-100"
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
                                    (incoming.length ===
                                      crafdExpansion.length &&
                                      crafdExpansion.every((s) =>
                                        incoming.includes(s)
                                      ));

                                  return (
                                    <div className={`h-4 w-7 rounded-full transition-colors ${hasCrafd ? "bg-[var(--brand-primary-dark)]" : "bg-slate-300"}`}>
                                      <div className={`h-4 w-4 rounded-full bg-white transition-transform ${hasCrafd ? "translate-x-3" : "translate-x-0"}`} />
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
                <Card className={`${STYLES.cardGlass} card-bottom-rounded !border-t-0 overflow-x-hidden`}>
                  {/* Filters */}
                  <CardContent className="px-4 pt-0 pb-4 sm:px-6 sm:pb-6">
                    <FilterBar
                      searchQuery={searchQuery}
                      appliedSearchQuery={appliedSearchQuery}
                      onSearchChange={onSearchChange}
                      onSearchSubmit={onSearchSubmit}
                      combinedDonors={combinedDonors}
                      availableDonorCountries={availableDonorCountries}
                      onDonorsChange={onDonorsChange}
                      investmentTypes={investmentTypes}
                      allKnownInvestmentTypes={allKnownInvestmentTypes}
                      onTypesChange={onTypesChange}
                      investmentThemes={investmentThemes}
                      allKnownInvestmentThemes={allKnownInvestmentThemes}
                      investmentThemesByType={investmentThemesByType}
                      onThemesChange={onThemesChange}
                      onResetFilters={onResetFilters}
                      projectCountsByType={projectCountsByType}
                      projectCountsByTheme={projectCountsByTheme}
                      filterDescription={getFilterDescription()}
                      className="-mb-6 sm:-mb-7"
                    />
                  </CardContent>
                  {/* Tab Content Views */}
                  <CardContent className="px-4 pt-2 sm:px-6 sm:pt-0">
                    <TabsContent value="table" className="mt-0">
                        <div className="space-y-2 transition-all duration-500">
                          {organizationsWithProjects
                            .sort((a, b) => sortOrganizations(a, b, sortBy, sortDirection))
                            .map((org) => {
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
                                      onOpenOrganizationModal={onOpenOrganizationModal}
                                      logoErrors={logoErrors}
                                      onLogoError={handleLogoError}
                                      headingLevel="h3"
                                      showDetailsButton={true}
                                      projectCount={org.projects.length}
                                      projectLabel={org.projects.length === 1 ? labels.product.singular : labels.product.plural}
                                    >
                                      {(() => {
                                        const isCountriesExpanded = expandedCountries.has(org.id);
                                        const donorInfo = org.donorInfo || [];

                                        // Sort donors: selected + org-level first, then others
                                        const sortedDonors = [...donorInfo].sort((a, b) => {
                                          const aIsSelected = combinedDonors.includes(a.country);
                                          const bIsSelected = combinedDonors.includes(b.country);

                                          if (aIsSelected && !bIsSelected) return -1;
                                          if (!aIsSelected && bIsSelected) return 1;

                                          if (a.isOrgLevel && !b.isOrgLevel) return -1;
                                          if (!a.isOrgLevel && b.isOrgLevel) return 1;

                                          return a.country.localeCompare(b.country);
                                        });

                                        // Dynamic country limit based on available space
                                        const calculateCollapsedLimit = () => {
                                          const maxCharsMobile = 50;
                                          const maxCharsDesktop = 100;
                                          const maxChars = window.innerWidth < 640 ? maxCharsMobile : maxCharsDesktop;

                                          let totalChars = 0;
                                          const countriesToShow = [];

                                          for (const donor of sortedDonors) {
                                            const estimatedSize = donor.country.length + 8;

                                            if (totalChars + estimatedSize <= maxChars) {
                                              countriesToShow.push(donor);
                                              totalChars += estimatedSize;
                                            } else {
                                              break;
                                            }
                                          }

                                          return countriesToShow.length === 0 ? 1 : Math.min(countriesToShow.length, 5);
                                        };

                                        const maxCountriesToShowCollapsed = calculateCollapsedLimit();
                                        const donorsToShow = isCountriesExpanded
                                          ? sortedDonors
                                          : sortedDonors.slice(0, maxCountriesToShowCollapsed);

                                        return (
                                          <>
                                            {donorsToShow.map((donor, idx: number) => {
                                              return (
                                                <Badge
                                                  key={idx}
                                                  text={donor.country}
                                                  variant={
                                                    combinedDonors.includes(donor.country)
                                                      ? "blue"
                                                      : "slate"
                                                  }
                                                  className={donor.isOrgLevel ? "" : "opacity-50"}
                                                  title={
                                                    donor.isOrgLevel
                                                      ? `${donor.country} (Organization Donor)`
                                                      : `${donor.country} (Project-Only Donor)`
                                                  }
                                                />
                                              );
                                            })}
                                            {sortedDonors.length > maxCountriesToShowCollapsed && !isCountriesExpanded && (
                                              <div
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const newExpanded = new Set(expandedCountries);
                                                  newExpanded.add(org.id);
                                                  setExpandedCountries(newExpanded);
                                                }}
                                                className="bg-slate-000 inline-flex cursor-pointer items-center rounded-md px-2 py-1 text-xs font-medium text-slate-900 transition-colors hover:bg-slate-100"
                                              >
                                                +{sortedDonors.length - maxCountriesToShowCollapsed} {labels.filters.showMore}
                                              </div>
                                            )}
                                            {isCountriesExpanded && sortedDonors.length > maxCountriesToShowCollapsed && (
                                              <div
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  const newExpanded = new Set(expandedCountries);
                                                  newExpanded.delete(org.id);
                                                  setExpandedCountries(newExpanded);
                                                }}
                                                className="bg-slate-000 inline-flex cursor-pointer items-center rounded-md px-2 py-1 text-xs font-medium text-slate-900 transition-colors hover:bg-slate-100"
                                              >
                                                {labels.filters.showLess}
                                              </div>
                                            )}
                                          </>
                                        );
                                      })()}
                                    </OrganizationBox>
                                  </div>
                                  <CollapsibleContent>
                                    <div className="mt-2 ml-8 space-y-2 sm:ml-14">
                                      {org.projects.map(
                                        (project: ProjectData) => (
                                          <div
                                            key={project.id}
                                            className="group animate-in cursor-pointer rounded-lg border border-slate-200 bg-white p-3 transition-colors duration-200 fade-in hover:bg-slate-50"
                                            onClick={() => {
                                              // Get product_key from nested data
                                              const nestedOrg =
                                                nestedOrganizations.find(
                                                  (n: any) => n.id === org.id,
                                                );
                                              const nestedProject =
                                                nestedOrg?.projects?.find(
                                                  (p: any) =>
                                                    p.id === project.id,
                                                );
                                              const projectKey =
                                                nestedProject?.fields
                                                  ?.product_key;
                                              if (projectKey) {
                                                onOpenProjectModal(projectKey);
                                              }
                                            }}
                                          >
                                            <div className="mb-2">
                                              <div className="flex flex-wrap items-center gap-2 gap-y-1">
                                                <span className="text-sm sm:text-base font-medium text-slate-900 transition-colors group-hover:text-[var(--badge-other-border)]">
                                                  {project.projectName}
                                                </span>
                                                {project.investmentTypes
                                                  .length > 0 && (
                                                  <div className="flex flex-wrap items-center gap-1">
                                                    {project.investmentTypes.map(
                                                      (type, idx) => {
                                                        const IconComponent =
                                                          getIconForInvestmentType(
                                                            type,
                                                          );
                                                        const description =
                                                          INVESTMENT_TYPE_DESCRIPTIONS[
                                                            type
                                                          ];
                                                        const badge = (
                                                          <span
                                                            key={idx}
                                                            className="inline-flex cursor-help items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold"
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

                                                        // Wrap in tooltip if description exists and tips are enabled
                                                        if (
                                                          description &&
                                                          tipsEnabled
                                                        ) {
                                                          return (
                                                            <TooltipProvider
                                                              key={idx}
                                                            >
                                                              <TooltipUI
                                                                delayDuration={
                                                                  200
                                                                }
                                                              >
                                                                <TooltipTrigger
                                                                  asChild
                                                                >
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
                                              <div className="flex flex-wrap gap-1">
                                                {project.donorCountries.length >
                                                0 ? (
                                                  project.donorCountries.map(
                                                    (country, idx) => (
                                                      <Badge
                                                        key={idx}
                                                        text={country}
                                                        variant={
                                                          combinedDonors.includes(
                                                            country,
                                                          )
                                                            ? "blue"
                                                            : "slate"
                                                        }
                                                      />
                                                    ),
                                                  )
                                                ) : (
                                                  <span className="text-xs text-slate-500">
                                                    {
                                                      labels.modals
                                                        .assetDonorsNotSpecified
                                                    }
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ),
                                      )}
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
                            sortBy === "funding"
                              ? "assets"
                              : sortBy === "donors"
                                ? "orgs"
                                : sortBy
                          }
                          sortDirection={sortDirection}
                        />
                        {organizationsWithProjects.length === 0 &&
                          activeView === "donors" && (
                            <NoResultsPopup onResetFilters={onResetFilters} />
                          )}
                      </TabsContent>

                      <TabsContent value="network" className="mt-0">
                        <div className="w-full" style={{ height: "600px" }}>
                          <NetworkGraph
                            organizationsWithProjects={
                              organizationsWithProjects
                            }
                            allOrganizations={allOrganizations}
                            onOpenOrganizationModal={onOpenOrganizationModal}
                            onOpenProjectModal={onOpenProjectModal}
                            onOpenDonorModal={onOpenDonorModal}
                            selectedOrgKey={selectedOrgKey}
                            selectedProjectKey={selectedProjectKey}
                            searchQuery={searchQuery}
                            appliedSearchQuery={appliedSearchQuery}
                            onSearchChange={onSearchChange}
                            onSearchSubmit={onSearchSubmit}
                            combinedDonors={combinedDonors}
                            availableDonorCountries={availableDonorCountries}
                            onDonorsChange={onDonorsChange}
                            investmentTypes={investmentTypes}
                            allKnownInvestmentTypes={allKnownInvestmentTypes}
                            onTypesChange={onTypesChange}
                            investmentThemes={investmentThemes}
                            allKnownInvestmentThemes={allKnownInvestmentThemes}
                            investmentThemesByType={investmentThemesByType}
                            onThemesChange={onThemesChange}
                            onResetFilters={onResetFilters}
                            filterDescription={getFilterDescription()}
                            orgAgenciesMap={orgAgenciesMap}
                          />
                        </div>
                      </TabsContent>
                  </CardContent>
                </Card>
              </Tabs>
          </div>
        </div>
      </div>

      {/* Impressum Footer */}
      <footer className="mt-8 border-t border-slate-200 bg-white sm:mt-16">
        <div className="mx-auto max-w-[82rem] px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="flex flex-col items-center justify-center gap-2 sm:flex-row sm:justify-between sm:gap-0">
            <div className="flex-1 text-center">
              <p className="text-xs text-slate-600 sm:text-sm">
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
              <p className="mt-1 text-xs text-slate-500">
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
          projectAgenciesMap={projectAgenciesMap}
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
          const target = normalizeOrgName(selectedOrganization.organizationName || selectedOrganization.id);
          const match = organizationsTable.find((rec) => {
            const full = (rec.fields["Org Full Name"] as string) || "";
            const short = (rec.fields["Org Short Name"] as string) || "";
            return [full, short].some((s) => normalizeOrgName(String(s || "")) === target);
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
          const nestedMatch = nestedOrganizationsRaw.find((nestedOrg: any) => {
            const nestedName = normalizeOrgName(nestedOrg.name || "");
            const nestedFull = normalizeOrgName(nestedOrg.fields?.["Org Full Name"] || "");
            const nestedShort = normalizeOrgName(nestedOrg.fields?.["Org Short Name"] || "");
            return nestedName === target || nestedFull === target || nestedShort === target || nestedOrg.id === orgRecord.id;
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
              projectNameMap={projectNameMap}
              projectDescriptionMap={projectDescriptionMap}
              orgProjectsMap={orgProjectsMap}
              orgDonorCountriesMap={orgDonorCountriesMap}
              orgDonorInfoMap={orgDonorInfoMap}
              orgAgenciesMap={orgAgenciesMap}
              orgProjectDonorsMap={orgProjectDonorsMap}
              orgProjectDonorAgenciesMap={orgProjectDonorAgenciesMap}
              loading={false}
              onOpenProjectModal={onOpenProjectModal}
              projectIdToKeyMap={projectIdToKeyMap}
              onOpenDonorModal={onOpenDonorModal}
              onTypeClick={onTypeClick}
            />
          );
        })()}
      {/* Donor Modal */}
      {selectedDonorCountry && (
        <DonorModal
          donorCountry={selectedDonorCountry}
          nestedOrganizations={nestedOrganizationsRaw as any}
          loading={false}
          onOpenOrganizationModal={onOpenOrganizationModal}
          onOpenProjectModal={onOpenProjectModal}
        />
      )}
    </div>
  );
};

export default CrisisDataDashboard;
