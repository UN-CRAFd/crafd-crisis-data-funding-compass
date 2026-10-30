"use client";

import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Network,
  Building2,
  ChevronDown,
  X,
  Search,
  ArrowRight,
  AlertCircle,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toUrlSlug, matchesUrlSlug } from "@/lib/urlShortcuts";
import { processDashboardData, getAgenciesForDonors, setGeneralContributionsEnabled } from "@/lib/data";

// Always use project-level (non-core) contributions on this page
setGeneralContributionsEnabled(false);
import labels from "@/config/labels.json";
import type { OrganizationWithProjects } from "@/types/airtable";

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

interface DashboardData {
  organizationsWithProjects: OrganizationWithProjects[];
  allOrganizations: OrganizationWithProjects[];
  investmentThemes: string[];
  investmentThemesByType: Record<string, string[]>;
}

// ---------- constants ---------------------------------------------------

const COMPARISON_COLORS = ["#2563eb", "#7c3aed", "#0d9488", "#e11d48", "#16a34a"];

const EXCLUDED_STARTING_POINTS = new Set(["United Nations", "Foundations"]);

// ---------- helpers -----------------------------------------------------

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

async function fetchDashboard(body: {
  donorCountries?: string[];
  showGeneralContributions?: boolean;
}): Promise<DashboardData> {
  const r = await fetch("/api/dashboard", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

// ---------- component ---------------------------------------------------

export default function InsightsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const addFunderRef = useRef<HTMLDivElement>(null);

  // data
  const [nestedOrgs, setNestedOrgs] = useState<NestedOrg[]>([]);
  const [allOrgData, setAllOrgData] = useState<DashboardData | null>(null);
  const [filteredData, setFilteredData] = useState<DashboardData | null>(null);
  const [orgAgenciesMap, setOrgAgenciesMap] = useState<
    Record<string, Record<string, string[]>>
  >({});
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ui state
  const [selectedFunders, setSelectedFunders] = useState<string[]>([]);
  const [pendingFunders, setPendingFunders] = useState<string[]>([]);
  const [funderSearch, setFunderSearch] = useState("");
  const [hasShownInsights, setHasShownInsights] = useState(false);
  const [showNetwork, setShowNetwork] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [addFunderOpen, setAddFunderOpen] = useState(false);
  const [addFunderSearch, setAddFunderSearch] = useState("");

  // new state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [funderDataMap, setFunderDataMap] = useState<Map<string, any>>(new Map());
  const [funderAgencies, setFunderAgencies] = useState<Map<string, string[]>>(new Map());
  const [showOrgTable, setShowOrgTable] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [showAllSimilar, setShowAllSimilar] = useState(false);
  const [showAllSharedOrgs, setShowAllSharedOrgs] = useState(false);
  const [includeUN, setIncludeUN] = useState(false);

  // --------------- data fetching ----------------------------------------

  useEffect(() => {
    fetch("/api/nested-organizations")
      .then((r) => r.json())
      .then((data: NestedOrg[]) => setNestedOrgs(data))
      .catch(() => {});
    fetch("/api/modal-maps")
      .then((r) => r.json())
      .then((data) => {
        if (data?.orgAgenciesMap) setOrgAgenciesMap(data.orgAgenciesMap);
      })
      .catch(() => {});
    fetch("/api/last-updated")
      .then((r) => r.json())
      .then((d) => {
        if (d?.lastUpdated) setLastUpdated(d.lastUpdated);
      })
      .catch(() => {});
  }, []);

  // unfiltered data
  useEffect(() => {
    fetchDashboard({ showGeneralContributions: false })
      .then(setAllOrgData)
      .catch(() => {});
  }, []);

  // URL init
  useEffect(() => {
    const raw =
      searchParams.get("funders") ??
      searchParams.get("d") ??
      searchParams.get("donors") ??
      "";
    const slugs = raw.split(",").filter(Boolean);
    if (slugs.length > 0) {
      (window as Record<string, unknown>).__insightsFunderSlugs = slugs;
    }
    if (searchParams.get("un") === "1") setIncludeUN(true);
    setIsInitialized(true);
  }, [searchParams]);

  // available funders from ALL nestedOrgs (always unfiltered — needed for funder selection)
  const availableFunders = useMemo(() => {
    const set = new Set<string>();
    nestedOrgs.forEach((org) =>
      getDonorsForOrg(org).forEach((d) => set.add(d)),
    );
    return Array.from(set).sort();
  }, [nestedOrgs]);

  // UN entity names from allOrgData (for filtering nestedOrgs by name)
  const unOrgNames = useMemo(
    () =>
      new Set(
        (allOrgData?.allOrganizations ?? [])
          .filter((o) => o.type === "United Nations")
          .map((o) => o.organizationName),
      ),
    [allOrgData],
  );

  // nestedOrgs with UN entities optionally removed
  const filteredNestedOrgs = useMemo(
    () =>
      includeUN
        ? nestedOrgs
        : nestedOrgs.filter((o) => {
            const name = String(
              o.name ?? o.fields?.["Organization Name"] ?? "",
            );
            return !unOrgNames.has(name);
          }),
    [nestedOrgs, includeUN, unOrgNames],
  );

  // allOrganizations with UN entities optionally removed
  const visibleAllOrgs = useMemo(
    () =>
      includeUN
        ? (allOrgData?.allOrganizations ?? [])
        : (allOrgData?.allOrganizations ?? []).filter(
            (o) => o.type !== "United Nations",
          ),
    [allOrgData, includeUN],
  );

  // resolve URL slugs once orgs are loaded
  useEffect(() => {
    if (availableFunders.length === 0) return;
    const slugs = (
      window as Record<string, unknown>
    ).__insightsFunderSlugs as string[] | undefined;
    if (!slugs) return;
    const decoded = slugs
      .map((slug) =>
        availableFunders.find((d) => matchesUrlSlug(slug, d)),
      )
      .filter((d): d is string => Boolean(d));
    if (decoded.length > 0) {
      setSelectedFunders(decoded);
      setPendingFunders(decoded);
      setHasShownInsights(true);
    }
    delete (window as Record<string, unknown>).__insightsFunderSlugs;
  }, [availableFunders]);

  // URL sync
  useEffect(() => {
    if (!isInitialized) return;
    const params = new URLSearchParams();
    if (selectedFunders.length > 0) {
      params.set("funders", selectedFunders.map(toUrlSlug).join(","));
    }
    if (includeUN) params.set("un", "1");
    const newUrl = params.toString()
      ? `/insights?${params.toString()}`
      : "/insights";
    const current = window.location.pathname + window.location.search;
    if (current !== newUrl) router.replace(newUrl, { scroll: false });
  }, [selectedFunders, includeUN, isInitialized, router]);

  // filtered data when funders change
  useEffect(() => {
    if (!hasShownInsights || selectedFunders.length === 0) {
      setFilteredData(null);
      return;
    }
    setLoading(true);
    fetchDashboard({
      donorCountries: selectedFunders,
      showGeneralContributions: false,
    })
      .then((data) => {
        setFilteredData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedFunders, hasShownInsights]);

  // per-funder profile data
  useEffect(() => {
    if (selectedFunders.length === 0) return;
    let cancelled = false;
    selectedFunders.forEach(async (f) => {
      if (funderDataMap.has(f)) return;
      try {
        const data = await processDashboardData({ donorCountries: [f] });
        if (!cancelled) {
          setFunderDataMap((prev) => new Map(prev).set(f, data));
        }
      } catch {}
    });
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFunders]);

  // agencies for selected funders
  useEffect(() => {
    if (selectedFunders.length === 0) return;
    getAgenciesForDonors(selectedFunders)
      .then((map) => setFunderAgencies(map))
      .catch(() => {});
  }, [selectedFunders]);

  // click-outside handler for add-funder dropdown
  useEffect(() => {
    if (!addFunderOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!addFunderRef.current?.contains(e.target as Node)) {
        setAddFunderOpen(false);
        setAddFunderSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [addFunderOpen]);

  // --------------- derived data -----------------------------------------

  // Per-funder data re-derived client-side: the per-funder API response lists ALL
  // organizations, so keep only those the funder supports (org.donorCountries), drop
  // UN entities when the toggle is off, and count products deduplicated by
  // `${id}-${projectName}`.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const funderViews = useMemo<Map<string, any>>(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const out = new Map<string, any>();
    funderDataMap.forEach((data, f) => {
      const orgs: OrganizationWithProjects[] = (
        data?.allOrganizations ?? []
      ).filter(
        (o: OrganizationWithProjects) =>
          (o.donorCountries ?? []).includes(f) &&
          (includeUN || o.type !== "United Nations"),
      );
      const products = new Map<string, OrganizationWithProjects["projects"][number]>();
      orgs.forEach((o) =>
        o.projects.forEach((p) => {
          const key = `${p.id}-${p.projectName}`;
          if (!products.has(key)) products.set(key, p);
        }),
      );
      const projectTypes = Object.values(labels.investmentTypes).map((typeName) => {
        const tn = typeName.toLowerCase();
        let count = 0;
        products.forEach((p) => {
          if (
            p.investmentTypes?.some((t) => {
              const tl = t.toLowerCase();
              return tl.includes(tn) || tn.includes(tl);
            })
          )
            count++;
        });
        return { name: typeName, count };
      });
      out.set(f, {
        ...data,
        stats: { ...(data?.stats ?? {}), dataProjects: products.size },
        projectTypes,
      });
    });
    return out;
  }, [funderDataMap, includeUN]);

  const getFunderData = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (f: string): any => funderViews.get(f) ?? null,
    [funderViews],
  );

  // popular funders: top 8 by org count (respects UN filter)
  const popularFunders = useMemo(() => {
    const counts = new Map<string, number>();
    filteredNestedOrgs.forEach((org) =>
      getDonorsForOrg(org).forEach((f) =>
        counts.set(f, (counts.get(f) ?? 0) + 1),
      ),
    );
    return Array.from(counts.entries())
      .filter(([f]) => !EXCLUDED_STARTING_POINTS.has(f))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([f]) => f);
  }, [filteredNestedOrgs]);

  // orgs funded by ANY selected funder (union, respects UN filter)
  const sharedOrgsData = useMemo(() => {
    if (selectedFunders.length === 0) return [];
    return filteredNestedOrgs
      .map((org) => {
        const orgFunders = getDonorsForOrg(org);
        const hasAny = selectedFunders.some((f) => orgFunders.includes(f));
        if (!hasAny) return null;
        const name = String(
          org.name ?? org.fields?.["Organization Name"] ?? "",
        );
        return {
          id: org.id,
          name,
          totalFunders: orgFunders.length,
          allFunders: orgFunders,
          selectedFundersForOrg: selectedFunders.filter((f) =>
            orgFunders.includes(f),
          ),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.totalFunders - a!.totalFunders) as Array<{
      id: string;
      name: string;
      totalFunders: number;
      allFunders: string[];
      selectedFundersForOrg: string[];
    }>;
  }, [filteredNestedOrgs, selectedFunders]);

  // truly shared orgs for comparison
  const sharedOrgsDisplayed = useMemo(() => {
    if (selectedFunders.length === 0) return [];
    if (selectedFunders.length === 1) {
      return sharedOrgsData.filter((o) => o.totalFunders > 1);
    }
    return sharedOrgsData.filter((o) => o.selectedFundersForOrg.length >= 2);
  }, [sharedOrgsData, selectedFunders]);


  // single-funder: similar funders by portfolio overlap %
  const similarFunders = useMemo(() => {
    if (selectedFunders.length !== 1 || sharedOrgsData.length === 0) return [];
    const F = selectedFunders[0];
    const overlap = new Map<string, number>();
    sharedOrgsData.forEach((org) => {
      org.allFunders.forEach((f) => {
        if (f !== F) overlap.set(f, (overlap.get(f) ?? 0) + 1);
      });
    });
    return Array.from(overlap.entries())
      .map(([f, count]) => ({
        f,
        count,
        pct: Math.round((count / sharedOrgsData.length) * 100),
      }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 8);
  }, [selectedFunders, sharedOrgsData]);

  // single-funder: type gaps
  const typeGaps = useMemo(() => {
    if (selectedFunders.length !== 1) return [];
    const F = selectedFunders[0];
    const profileData = getFunderData(F);
    const funderTypes = new Set(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (profileData?.projectTypes ?? []).filter((t: any) => t.count > 0).map((t: any) => t.name as string),
    );
    return Object.values(labels.investmentTypes)
      .filter((typeName) => !funderTypes.has(typeName))
      .map((typeName) => {
        const allFundersForType = new Set<string>();
        visibleAllOrgs.forEach((org) => {
          if (org.projects.some((p) => p.investmentTypes?.includes(typeName))) {
            (org.donorCountries ?? []).forEach((d) => allFundersForType.add(d));
          }
        });
        return { typeName, funderCount: allFundersForType.size };
      });
  }, [selectedFunders, getFunderData, visibleAllOrgs]);

  // comparison: type gaps (none of the selected funders)
  const comparisonTypeGaps = useMemo(() => {
    if (selectedFunders.length < 2) return [];
    return Object.values(labels.investmentTypes).filter((typeName) =>
      selectedFunders.every((f) => {
        const data = getFunderData(f);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ((data?.projectTypes ?? []).find((t: any) => t.name === typeName)?.count ?? 0) === 0;
      }),
    );
  }, [selectedFunders, getFunderData]);

  // comparison: orgs funded by only one selected funder
  const onlyOneFunderOrgs = useMemo(() => {
    if (selectedFunders.length < 2) return [];
    return sharedOrgsData
      .filter((o) => o.selectedFundersForOrg.length === 1)
      .map((o) => ({ ...o, theFunder: o.selectedFundersForOrg[0] }));
  }, [sharedOrgsData, selectedFunders]);

  // per-funder stats for comparison table (respects UN filter)
  const funderStats = useMemo(
    () =>
      selectedFunders.map((f, i) => {
        const data = getFunderData(f);
        const orgCount = filteredNestedOrgs.filter((org) =>
          getDonorsForOrg(org).includes(f),
        ).length;
        const productCount = data?.stats?.dataProjects ?? 0;
        const avgFunders = (() => {
          const orgsList = filteredNestedOrgs.filter((org) => getDonorsForOrg(org).includes(f));
          if (orgsList.length === 0) return "—";
          const total = orgsList.reduce((sum, org) => sum + getDonorsForOrg(org).length, 0);
          return (total / orgsList.length).toFixed(1);
        })();
        const onlyOrgs = filteredNestedOrgs.filter((org) => {
          const donors = getDonorsForOrg(org);
          return donors.includes(f) && donors.length === 1;
        }).length;
        return {
          f,
          orgCount,
          productCount,
          avgFunders,
          onlyOrgs,
          color: COMPARISON_COLORS[i % COMPARISON_COLORS.length],
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedFunders, filteredNestedOrgs, funderViews],
  );

  // --------------- handlers ---------------------------------------------

  const handleShowInsights = useCallback(() => {
    if (pendingFunders.length === 0) return;
    setSelectedFunders(pendingFunders);
    setHasShownInsights(true);
    setFunderSearch("");
  }, [pendingFunders]);

  const removeFunder = useCallback(
    (f: string) => {
      const next = selectedFunders.filter((d) => d !== f);
      setSelectedFunders(next);
      setPendingFunders(next);
      if (next.length === 0) setHasShownInsights(false);
    },
    [selectedFunders],
  );

  const addFunder = useCallback(
    (f: string) => {
      if (!selectedFunders.includes(f)) {
        const next = [...selectedFunders, f];
        setSelectedFunders(next);
        setPendingFunders(next);
      }
      setAddFunderOpen(false);
      setAddFunderSearch("");
    },
    [selectedFunders],
  );

  const clearAll = useCallback(() => {
    setSelectedFunders([]);
    setPendingFunders([]);
    setHasShownInsights(false);
    setFunderSearch("");
  }, []);

  const togglePending = useCallback((f: string) => {
    setPendingFunders((prev) =>
      prev.includes(f) ? prev.filter((d) => d !== f) : [...prev, f],
    );
  }, []);

  const downloadProfileCSV = useCallback(
    (funder: string) => {
      const orgs = sharedOrgsData;
      const rows: string[][] = [["Organization", "Types", "Product count", "Other funders"]];
      orgs.forEach((org) => {
        const orgData = allOrgData?.allOrganizations.find((o) => o.id === org.id);
        const types = [
          ...new Set(orgData?.projects.flatMap((p) => p.investmentTypes) ?? []),
        ].join("; ");
        const productCount = orgData?.projects.length ?? 0;
        const otherFunders = org.totalFunders - 1;
        rows.push([org.name, types, String(productCount), String(otherFunders)]);
      });
      const csv = rows
        .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${funder.replace(/\s+/g, "-").toLowerCase()}-profile.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [sharedOrgsData, allOrgData],
  );

  const EMPTY_STRINGS = useMemo(() => [] as string[], []);
  const NOOP = useCallback(() => {}, []);
  const allKnownInvestmentTypes = useMemo(
    () => Object.values(labels.investmentTypes),
    [],
  );

  // filtered data for network graph (respects UN filter)
  const networkData = useMemo(() => {
    if (!filteredData) return null;
    if (includeUN) return filteredData;
    return {
      ...filteredData,
      allOrganizations: filteredData.allOrganizations.filter(
        (o) => o.type !== "United Nations",
      ),
      organizationsWithProjects: filteredData.organizationsWithProjects.filter(
        (o) => o.type !== "United Nations",
      ),
    };
  }, [filteredData, includeUN]);

  // --------------- filtered lists for UI --------------------------------

  const step1List = availableFunders.filter(
    (f) =>
      funderSearch === "" ||
      f.toLowerCase().includes(funderSearch.toLowerCase()),
  );

  const addFunderList = availableFunders.filter(
    (f) =>
      !selectedFunders.includes(f) &&
      (addFunderSearch === "" ||
        f.toLowerCase().includes(addFunderSearch.toLowerCase())),
  );

  // --------------- shared sub-renders -----------------------------------

  const renderToolbar = () => (
    <div className="flex flex-wrap items-center gap-2">
      {selectedFunders.length > 1 && (
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Comparing:
        </span>
      )}

      {selectedFunders.map((f) => (
        <span
          key={f}
          className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-bg-lighter)] px-2.5 py-1 text-xs font-medium text-[var(--brand-primary)]"
        >
          {f}
          <button
            onClick={() => removeFunder(f)}
            className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--brand-primary-lighter)]"
            aria-label={`Remove ${f}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}

      {/* Add funder */}
      <div ref={addFunderRef} className="relative">
        <button
          onClick={() => setAddFunderOpen((o) => !o)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500 transition-colors hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] dark:border-slate-600"
        >
          + Add funder
        </button>
        {addFunderOpen && (
          <div className="absolute left-0 top-8 z-20 w-56 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            <div className="p-2">
              <input
                autoFocus
                type="text"
                value={addFunderSearch}
                onChange={(e) => setAddFunderSearch(e.target.value)}
                placeholder="Search…"
                className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-[var(--brand-primary)] focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div className="max-h-52 overflow-y-auto">
              {addFunderList.length === 0 ? (
                <p className="px-3 py-2 text-xs text-slate-400">No funders found.</p>
              ) : (
                addFunderList.slice(0, 40).map((f) => (
                  <button
                    key={f}
                    onClick={() => addFunder(f)}
                    className="flex w-full px-3 py-1.5 text-left text-xs text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {f}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Copy link */}
      <button
        onClick={() => navigator.clipboard.writeText(window.location.href)}
        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:border-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
      >
        Copy link
      </button>

      {/* Download CSV (profile only) */}
      {selectedFunders.length === 1 && (
        <button
          onClick={() => downloadProfileCSV(selectedFunders[0])}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-500 hover:text-slate-700 dark:border-slate-600 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Download profile (CSV)
        </button>
      )}

      <button
        onClick={clearAll}
        className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      >
        <X className="h-3 w-3" />
        Clear all
      </button>

      {/* Include UN entities toggle */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => setIncludeUN((v) => !v)}
          className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors ${
            includeUN
              ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
          }`}
        >
          <div
            className={`h-4 w-7 rounded-full transition-colors ${includeUN ? "bg-blue-500" : "bg-slate-300 dark:bg-slate-600"}`}
          >
            <div
              className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${includeUN ? "translate-x-3" : "translate-x-0"}`}
            />
          </div>
          <span className="whitespace-nowrap">Include UN entities</span>
        </button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default text-slate-400" aria-label="About UN entities">
                <Info className="h-3.5 w-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs text-xs">
              UN entities are funded by many member states, which makes most
              funders look alike. They&apos;re hidden by default.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );

  const renderNetworkGraph = () => (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <button
        onClick={() => setShowNetwork((v) => !v)}
        className="flex w-full items-center justify-between p-6 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Network className="h-4 w-4 text-[var(--brand-primary)]" />
          Network graph
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${showNetwork ? "rotate-180" : ""}`}
        />
      </button>
      {showNetwork && networkData && (
        <div className="border-t border-slate-100 dark:border-slate-700">
          <div style={{ height: 520 }}>
            <NetworkGraph
              organizationsWithProjects={networkData.organizationsWithProjects}
              allOrganizations={networkData.allOrganizations}
              onOpenOrganizationModal={(key) => router.push(`/explore?org=${key}`)}
              onOpenProjectModal={(key) => router.push(`/explore?asset=${key}`)}
              combinedDonors={selectedFunders}
              availableDonorCountries={availableFunders}
              onDonorsChange={setSelectedFunders}
              investmentThemes={EMPTY_STRINGS}
              allKnownInvestmentThemes={networkData.investmentThemes}
              investmentThemesByType={networkData.investmentThemesByType}
              onThemesChange={NOOP}
              investmentTypes={EMPTY_STRINGS}
              allKnownInvestmentTypes={allKnownInvestmentTypes}
              onTypesChange={NOOP}
              onResetFilters={clearAll}
              orgAgenciesMap={orgAgenciesMap}
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderSharedOrgsSection = () => {
    const A = selectedFunders[0];
    const B = selectedFunders[1];
    const onlyA = selectedFunders.length === 2
      ? sharedOrgsData.filter((o) => o.selectedFundersForOrg.length === 1 && o.selectedFundersForOrg[0] === A).length
      : 0;
    const onlyB = selectedFunders.length === 2
      ? sharedOrgsData.filter((o) => o.selectedFundersForOrg.length === 1 && o.selectedFundersForOrg[0] === B).length
      : 0;
    const both = selectedFunders.length === 2
      ? sharedOrgsData.filter((o) => o.selectedFundersForOrg.length === 2).length
      : 0;
    const total2 = onlyA + both + onlyB || 1;

    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Building2 className="h-4 w-4 text-[var(--brand-primary)]" />
          Shared organizations ({sharedOrgsDisplayed.length})
        </h2>

        {/* Overlap breakdown */}
        {selectedFunders.length === 2 ? (
          <div className="mb-6">
            <div className="flex h-6 w-full overflow-hidden rounded-full">
              {onlyA > 0 && (
                <div
                  title={`Only ${A}: ${onlyA}`}
                  style={{ width: `${(onlyA / total2) * 100}%`, backgroundColor: COMPARISON_COLORS[0] }}
                />
              )}
              {both > 0 && (
                <div
                  title={`Both: ${both}`}
                  style={{ width: `${(both / total2) * 100}%`, backgroundColor: "var(--brand-primary)" }}
                />
              )}
              {onlyB > 0 && (
                <div
                  title={`Only ${B}: ${onlyB}`}
                  style={{ width: `${(onlyB / total2) * 100}%`, backgroundColor: COMPARISON_COLORS[1] }}
                />
              )}
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-500">
              <span>
                <span className="font-medium" style={{ color: COMPARISON_COLORS[0] }}>■</span>{" "}
                Only {A}: {onlyA}
              </span>
              <span>
                <span className="font-medium" style={{ color: "var(--brand-primary)" }}>■</span>{" "}
                Both: {both}
              </span>
              <span>
                <span className="font-medium" style={{ color: COMPARISON_COLORS[1] }}>■</span>{" "}
                Only {B}: {onlyB}
              </span>
            </div>
          </div>
        ) : selectedFunders.length >= 3 ? (
          <div className="mb-6 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700">
                  <th className="py-1.5 pr-4 text-left text-xs font-semibold text-slate-500">Funder</th>
                  <th className="py-1.5 px-3 text-right text-xs font-semibold text-slate-500">Organizations</th>
                  <th className="py-1.5 px-3 text-right text-xs font-semibold text-slate-500">Shared with ≥1 other</th>
                  <th className="py-1.5 pl-3 text-right text-xs font-semibold text-slate-500">Only this funder</th>
                </tr>
              </thead>
              <tbody>
                {selectedFunders.map((f, i) => {
                  const fOrgs = sharedOrgsData.filter((o) => o.selectedFundersForOrg.includes(f));
                  const sharedCount = fOrgs.filter((o) => o.selectedFundersForOrg.length > 1).length;
                  const onlyCount = fOrgs.filter((o) => o.selectedFundersForOrg.length === 1).length;
                  return (
                    <tr key={f} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="py-1.5 pr-4">
                        <span className="flex items-center gap-1.5">
                          <span className="inline-block h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COMPARISON_COLORS[i % COMPARISON_COLORS.length] }} />
                          <span className="truncate max-w-[140px] text-slate-700 dark:text-slate-300">{f}</span>
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right text-slate-600 dark:text-slate-400">{fOrgs.length}</td>
                      <td className="py-1.5 px-3 text-right text-slate-600 dark:text-slate-400">{sharedCount}</td>
                      <td className="py-1.5 pl-3 text-right text-slate-600 dark:text-slate-400">{onlyCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* List */}
        {sharedOrgsDisplayed.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {selectedFunders.length === 2
              ? `${A} and ${B} don't fund any of the same organizations.`
              : "The selected funders don't fund any of the same organizations."}
          </p>
        ) : (
          <>
            <div className="space-y-0.5">
              {(showAllSharedOrgs ? sharedOrgsDisplayed : sharedOrgsDisplayed.slice(0, 10)).map((org) => (
                <div
                  key={org.id}
                  className="flex items-start justify-between gap-2 rounded px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-slate-700 dark:text-slate-300">{org.name}</p>
                    <p className="truncate text-xs text-slate-400">{org.selectedFundersForOrg.join(", ")}</p>
                  </div>
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: "var(--brand-primary-lighter)", color: "var(--brand-primary)" }}
                  >
                    {org.totalFunders} {org.totalFunders === 1 ? "funder" : "funders"}
                  </span>
                </div>
              ))}
            </div>
            {sharedOrgsDisplayed.length > 10 && (
              <button
                onClick={() => setShowAllSharedOrgs((v) => !v)}
                className="mt-3 text-xs hover:underline"
                style={{ color: "var(--brand-primary)" }}
              >
                {showAllSharedOrgs ? "Show fewer" : `Show all (${sharedOrgsDisplayed.length})`}
              </button>
            )}
          </>
        )}
      </div>
    );
  };

  // --------------- render -----------------------------------------------

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader />

      <div className="mx-auto max-w-[82rem] overflow-x-hidden px-4 py-4 pt-20 sm:px-6 sm:py-6 sm:pt-24 lg:px-8">
        {!hasShownInsights ? (
          /* ===== EMPTY STATE ===== */
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                Insights
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Explore what a funder supports, who else supports the same organizations, and where support is thin.
              </p>
            </div>

            {/* Funder picker */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">
                Which funder do you want to explore?
              </h2>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Pick one funder for a profile, or several to compare them.
              </p>

              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={funderSearch}
                  onChange={(e) => setFunderSearch(e.target.value)}
                  placeholder="Search funders…"
                  className="w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm placeholder-slate-400 focus:border-[var(--brand-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-primary)] dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                />
              </div>

              {funderSearch && (
                <div className="mb-4 max-h-52 overflow-y-auto rounded-md border border-slate-100 dark:border-slate-700">
                  {step1List.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-400">No funders found.</p>
                  ) : (
                    step1List.slice(0, 40).map((f) => {
                      const selected = pendingFunders.includes(f);
                      return (
                        <button
                          key={f}
                          onClick={() => togglePending(f)}
                          className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${
                            selected
                              ? "bg-[var(--brand-bg-lighter)] text-[var(--brand-primary)]"
                              : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          {f}
                          {selected && <span className="text-sm">✓</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              )}

              {pendingFunders.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1.5">
                  {pendingFunders.map((f) => (
                    <span
                      key={f}
                      className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-bg-lighter)] px-2.5 py-1 text-xs font-medium text-[var(--brand-primary)]"
                    >
                      {f}
                      <button
                        onClick={() => togglePending(f)}
                        className="ml-0.5 rounded-full p-0.5 hover:bg-[var(--brand-primary-lighter)]"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <Button
                onClick={handleShowInsights}
                disabled={pendingFunders.length === 0}
                className="bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark)] disabled:opacity-40"
              >
                Show insights
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>

            {/* Popular starting points */}
            {popularFunders.length > 0 && (
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Popular starting points
                </p>
                <div className="flex flex-wrap gap-2">
                  {popularFunders.map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setSelectedFunders([f]);
                        setPendingFunders([f]);
                        setHasShownInsights(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-all hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ===== RESULTS STATE ===== */
          <div className="space-y-6">
            {renderToolbar()}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
                <span className="ml-3 text-sm text-slate-500">Loading insights…</span>
              </div>
            ) : selectedFunders.length === 1 ? (
              /* ===== SINGLE FUNDER PROFILE ===== */
              (() => {
                const F = selectedFunders[0];
                const profileData = getFunderData(F);
                const funderOrgs = sharedOrgsData;
                const orgCount = funderOrgs.length;
                const productCount = profileData?.stats?.dataProjects ?? 0;
                const onlyFunderOrgs = funderOrgs.filter((o) => o.totalFunders === 1);
                const agencies: string[] = funderAgencies.get(F) ?? [];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const typesSupported = (profileData?.projectTypes ?? []).filter((t: any) => t.count > 0).length;
                const maxTypeCount = Math.max(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  ...(profileData?.projectTypes ?? []).map((t: any) => t.count as number),
                  1,
                );

                const funderOrgIds = new Set(funderOrgs.map((o) => o.id));
                const thinlySupported = funderOrgs.filter((o) => o.totalFunders <= 2);

                const funderOrgsWithData = funderOrgs.map((org) => {
                  const orgData = allOrgData?.allOrganizations.find((o) => o.id === org.id);
                  const types = [
                    ...new Set(orgData?.projects.flatMap((p) => p.investmentTypes ?? []) ?? []),
                  ];
                  const productCount2 = orgData?.projects.length ?? 0;
                  return { ...org, types, productCount: productCount2 };
                });

                return (
                  <div className="space-y-6">
                    {/* 1. Header card */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--brand-primary)]">
                        Funder profile
                      </p>
                      <h1 className="mb-3 text-2xl font-bold text-slate-900 dark:text-white sm:text-3xl">
                        {F}
                      </h1>
                      {agencies.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {agencies.slice(0, 6).map((a) => (
                            <span
                              key={a}
                              className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            >
                              {a}
                            </span>
                          ))}
                          {agencies.length > 6 && (
                            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-500 dark:bg-slate-700">
                              +{agencies.length - 6} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 2. Summary line */}
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Documented support to{" "}
                      <strong className="text-slate-800 dark:text-slate-200">{orgCount}</strong>{" "}
                      organizations and{" "}
                      <strong className="text-slate-800 dark:text-slate-200">{productCount}</strong>{" "}
                      data products across{" "}
                      <strong className="text-slate-800 dark:text-slate-200">{typesSupported}</strong>{" "}
                      of 6 types.
                    </p>

                    {/* 3. Big numbers */}
                    {(() => {
                      const avgFundersPerOrg = funderOrgs.length === 0
                        ? "—"
                        : (funderOrgs.reduce((s, o) => s + o.totalFunders, 0) / funderOrgs.length).toFixed(1);
                      const statCards: Array<{ count: string | number; label: string }> = [
                        { count: orgCount, label: "organizations supported" },
                        { count: productCount, label: "data products" },
                        { count: avgFundersPerOrg, label: "avg. funders per organization" },
                        { count: onlyFunderOrgs.length, label: "organizations where it's the only documented funder" },
                      ];
                      return (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                          {statCards.map(({ count, label }) => (
                            <div
                              key={label}
                              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
                            >
                              <span
                                className="text-3xl font-bold"
                                style={{ color: "var(--brand-primary)" }}
                              >
                                {count}
                              </span>
                              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{label}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })()}

                    {/* 4. Portfolio by type + Only funder orgs */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      {/* Portfolio by type */}
                      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                          Portfolio by type
                        </h2>
                        <div className="space-y-3">
                          {Object.entries(labels.investmentTypes).map(([key, typeName]) => {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const apiType = (profileData?.projectTypes ?? []).find((t: any) => t.name === typeName);
                            const count = apiType?.count ?? 0;
                            const expanded = expandedTypes.has(key);

                            // top themes in this type for this funder's orgs
                            const funderThemes = new Map<string, number>();
                            allOrgData?.allOrganizations
                              .filter((o) => funderOrgIds.has(o.id))
                              .forEach((org) =>
                                org.projects.forEach((p) => {
                                  if (p.investmentTypes?.includes(typeName)) {
                                    p.investmentThemes?.forEach((t) =>
                                      funderThemes.set(t, (funderThemes.get(t) ?? 0) + 1),
                                    );
                                  }
                                }),
                              );
                            const topThemes = Array.from(funderThemes.entries())
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 3)
                              .map(([t]) => t);

                            return (
                              <div key={key}>
                                <div className="flex items-center gap-3">
                                  <span
                                    className="w-44 shrink-0 truncate text-xs text-slate-600 dark:text-slate-400"
                                    title={typeName}
                                  >
                                    {typeName}
                                  </span>
                                  <div className="flex-1">
                                    <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                                      <div
                                        className="h-2.5 rounded-full"
                                        style={{
                                          width:
                                            count > 0
                                              ? `${(count / maxTypeCount) * 100}%`
                                              : "0",
                                          minWidth: count > 0 ? "4px" : "0",
                                          backgroundColor: "var(--brand-primary)",
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <span className="w-20 shrink-0 text-right text-xs text-slate-500">
                                    {count} {count === 1 ? "product" : "products"}
                                  </span>
                                  {topThemes.length > 0 && (
                                    <button
                                      onClick={() =>
                                        setExpandedTypes((prev) => {
                                          const s = new Set(prev);
                                          s.has(key) ? s.delete(key) : s.add(key);
                                          return s;
                                        })
                                      }
                                      className="shrink-0 text-xs"
                                      style={{ color: "var(--brand-primary)" }}
                                    >
                                      {expanded ? "▲" : "▼"}
                                    </button>
                                  )}
                                </div>
                                {expanded && topThemes.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1 pl-48">
                                    {topThemes.map((t) => (
                                      <span
                                        key={t}
                                        className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500 dark:bg-slate-700"
                                      >
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Only funder orgs */}
                      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                          Where it is the only funder
                        </h2>
                        {onlyFunderOrgs.length === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            None: every organization it supports has at least one other funder.
                          </p>
                        ) : (
                          <div className="max-h-72 space-y-0.5 overflow-y-auto">
                            {onlyFunderOrgs.map((org) => (
                              <div
                                key={org.id}
                                className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                              >
                                <span className="min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-300">
                                  {org.name}
                                </span>
                                <span className="shrink-0 text-xs text-slate-400">1 funder</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 5. Similar portfolios */}
                    {similarFunders.length > 0 && (
                      <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                        <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                          Funders with similar portfolios
                        </h2>
                        <div className="space-y-2">
                          {(showAllSimilar
                            ? similarFunders
                            : similarFunders.slice(0, 8)
                          ).map(({ f, count, pct }) => (
                            <div key={f} className="flex items-center gap-3">
                              <span
                                className="w-36 shrink-0 truncate text-xs text-slate-600 dark:text-slate-400"
                                title={f}
                              >
                                {f}
                              </span>
                              <div className="flex-1">
                                <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                                  <div
                                    className="h-2.5 rounded-full"
                                    style={{
                                      width: `${pct}%`,
                                      minWidth: pct > 0 ? "4px" : "0",
                                      backgroundColor: "var(--brand-primary)",
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="w-28 shrink-0 text-right text-xs text-slate-500">
                                {pct}% · {count} orgs
                              </span>
                            </div>
                          ))}
                        </div>
                        {similarFunders.length >= 3 && (
                          <button
                            onClick={() => {
                              const top3 = similarFunders.slice(0, 3).map((s) => s.f);
                              const next = [...new Set([...selectedFunders, ...top3])];
                              setSelectedFunders(next);
                              setPendingFunders(next);
                            }}
                            className="mt-3 text-xs hover:underline"
                            style={{ color: "var(--brand-primary)" }}
                          >
                            Compare with the top 3
                          </button>
                        )}
                      </div>
                    )}

                    {/* 6. Gaps */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        Gaps
                      </h2>
                      <div className="grid gap-8 lg:grid-cols-2">
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Types it doesn&apos;t support yet
                          </h3>
                          {typeGaps.length === 0 ? (
                            <p className="text-xs text-slate-400">It supports all 6 types.</p>
                          ) : (
                            <div className="space-y-1">
                              {typeGaps.map(({ typeName, funderCount }) => (
                                <div
                                  key={typeName}
                                  className="flex items-center justify-between gap-2"
                                >
                                  <span className="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-400">
                                    {typeName}
                                  </span>
                                  <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                                    {funderCount} funders overall
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Thinly supported organizations in its portfolio
                          </h3>
                          {thinlySupported.length === 0 ? (
                            <p className="text-xs text-slate-400">
                              All organizations it supports have 3 or more funders.
                            </p>
                          ) : (
                            <div className="max-h-48 space-y-0.5 overflow-y-auto">
                              {thinlySupported.map((org) => (
                                <div
                                  key={org.id}
                                  className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                                >
                                  <span className="min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-300">
                                    {org.name}
                                  </span>
                                  <span className="shrink-0 text-xs text-slate-400">
                                    {org.totalFunders}{" "}
                                    {org.totalFunders === 1 ? "funder" : "funders"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 7. Supported organizations table */}
                    <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                      <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">
                        Supported organizations ({funderOrgs.length})
                      </h2>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                              <th className="py-2 pr-4 text-left text-xs font-semibold text-slate-500">
                                Organization
                              </th>
                              <th className="py-2 pr-4 text-left text-xs font-semibold text-slate-500">
                                Types
                              </th>
                              <th className="py-2 pr-4 text-left text-xs font-semibold text-slate-500">
                                Products
                              </th>
                              <th className="py-2 text-left text-xs font-semibold text-slate-500">
                                Other funders
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(showOrgTable
                              ? funderOrgsWithData
                              : funderOrgsWithData.slice(0, 10)
                            ).map((org) => (
                              <tr
                                key={org.id}
                                className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                              >
                                <td className="py-2 pr-4">
                                  <span className="block max-w-[180px] truncate text-slate-700 dark:text-slate-300">
                                    {org.name}
                                  </span>
                                </td>
                                <td className="py-2 pr-4 text-slate-500">
                                  <span className="block max-w-[160px] truncate">
                                    {org.types.join(", ") || "—"}
                                  </span>
                                </td>
                                <td className="py-2 pr-4 text-slate-500">{org.productCount}</td>
                                <td className="py-2 text-slate-500">{org.totalFunders - 1}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {funderOrgsWithData.length > 10 && (
                        <button
                          onClick={() => setShowOrgTable((v) => !v)}
                          className="mt-3 text-xs hover:underline"
                          style={{ color: "var(--brand-primary)" }}
                        >
                          {showOrgTable
                            ? "Show fewer"
                            : `Show all (${funderOrgsWithData.length})`}
                        </button>
                      )}
                    </div>

                    {/* 8. Network */}
                    {renderNetworkGraph()}
                  </div>
                );
              })()
            ) : (
              /* ===== COMPARISON VIEW ===== */
              <div className="space-y-6">
                {/* 1. Overview table */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                  <h2 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Overview</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          <th className="w-40 py-2 pr-4 text-left text-xs font-semibold text-slate-400" />
                          {funderStats.map((fs) => (
                            <th
                              key={fs.f}
                              className="px-3 py-2 text-center text-xs font-semibold text-slate-700 dark:text-slate-200"
                            >
                              <span
                                className="inline-block max-w-[120px] truncate"
                                title={fs.f}
                                style={{ color: fs.color }}
                              >
                                {fs.f}
                              </span>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          [
                            { key: "orgCount", label: "Organizations" },
                            { key: "productCount", label: "Data products" },
                            { key: "avgFunders", label: "Avg. funders per org" },
                            { key: "onlyOrgs", label: "Only-funder orgs" },
                          ] as const
                        ).map((row) => (
                          <tr
                            key={row.key}
                            className="border-t border-slate-100 dark:border-slate-800"
                          >
                            <td className="py-2 pr-4 text-xs text-slate-500">{row.label}</td>
                            {funderStats.map((fs) => (
                              <td key={fs.f} className="px-3 py-2 text-center">
                                <span
                                  className="text-xl font-bold"
                                  style={{ color: fs.color }}
                                >
                                  {String(fs[row.key])}
                                </span>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {selectedFunders.length === 2 ? (
                    <div className="mt-4">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                        <span className="text-2xl font-bold" style={{ color: "var(--brand-primary)" }}>
                          {sharedOrgsData.filter((o) => o.selectedFundersForOrg.length === 2).length}
                        </span>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          organizations supported by both
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                        <span className="text-2xl font-bold" style={{ color: "var(--brand-primary)" }}>
                          {sharedOrgsData.filter((o) => o.selectedFundersForOrg.length === selectedFunders.length).length}
                        </span>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          organizations supported by all selected funders
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                        <span className="text-2xl font-bold" style={{ color: "var(--brand-primary)" }}>
                          {sharedOrgsData.filter((o) => o.selectedFundersForOrg.length >= 2).length}
                        </span>
                        <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                          organizations supported by at least two of the selected funders
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Portfolio by type */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                  <h2 className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">
                    Portfolio by type
                  </h2>
                  {/* Legend */}
                  <div className="mb-4 flex flex-wrap gap-3">
                    {funderStats.map((fs) => (
                      <span
                        key={fs.f}
                        className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300"
                      >
                        <span
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: fs.color }}
                        />
                        <span className="max-w-[100px] truncate" title={fs.f}>
                          {fs.f}
                        </span>
                      </span>
                    ))}
                  </div>
                  <div className="space-y-4">
                    {Object.entries(labels.investmentTypes).map(([key, typeName]) => {
                      const maxCount = Math.max(
                        ...funderStats.map((fs) => {
                          const data = getFunderData(fs.f);
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          return (data?.projectTypes ?? []).find((t: any) => t.name === typeName)?.count ?? 0;
                        }),
                        1,
                      );
                      return (
                        <div key={key}>
                          <p className="mb-1 text-xs font-medium text-slate-600 dark:text-slate-400">
                            {typeName}
                          </p>
                          <div className="space-y-1">
                            {funderStats.map((fs) => {
                              const data = getFunderData(fs.f);
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              const count = (data?.projectTypes ?? []).find((t: any) => t.name === typeName)?.count ?? 0;
                              return (
                                <div key={fs.f} className="flex items-center gap-3">
                                  <span
                                    className="w-32 shrink-0 truncate text-xs text-slate-500"
                                    title={fs.f}
                                  >
                                    {fs.f}
                                  </span>
                                  <div className="flex-1">
                                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                                      <div
                                        className="h-2 rounded-full"
                                        style={{
                                          width: `${(count / maxCount) * 100}%`,
                                          minWidth: count > 0 ? "4px" : "0",
                                          backgroundColor: fs.color,
                                        }}
                                      />
                                    </div>
                                  </div>
                                  <span className="w-16 shrink-0 text-right text-xs text-slate-500">
                                    {count} prods
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Shared organizations */}
                {renderSharedOrgsSection()}

                {/* 4. Gaps */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Gaps
                  </h2>
                  <div className="grid gap-8 lg:grid-cols-2">
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Types none of them support
                      </h3>
                      {comparisonTypeGaps.length === 0 ? (
                        <p className="text-xs text-slate-400">Together they cover all 6 types.</p>
                      ) : (
                        <div className="space-y-1">
                          {comparisonTypeGaps.map((t) => (
                            <p key={t} className="text-xs text-slate-600 dark:text-slate-400">
                              {t}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Supported by only one of the selected funders
                      </h3>
                      {onlyOneFunderOrgs.length === 0 ? (
                        <p className="text-xs text-slate-400">None.</p>
                      ) : (
                        <div className="max-h-48 space-y-0.5 overflow-y-auto">
                          {onlyOneFunderOrgs.map((org) => (
                            <div
                              key={org.id}
                              className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/30"
                            >
                              <span className="min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-300">
                                {org.name}
                              </span>
                              <span className="shrink-0 text-xs text-slate-400">
                                {org.theFunder}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 5. Network */}
                {renderNetworkGraph()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 sm:mt-16">
        <div className="mx-auto max-w-[82rem] px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-slate-500">
            Compiled from public sources · Shows who supports whom, not how much
            {lastUpdated && ` · Last updated ${lastUpdated}`}
          </p>
        </div>
      </footer>
    </div>
  );
}
