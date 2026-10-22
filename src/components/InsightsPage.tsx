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
  Globe,
  Building2,
  ChevronDown,
  X,
  Search,
  Landmark,
  ArrowRight,
  Layers,
  AlertCircle,
} from "lucide-react";
import { toUrlSlug, matchesUrlSlug } from "@/lib/urlShortcuts";
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

// ---------- preview cards for empty state -------------------------------

const PREVIEW_CARDS = [
  {
    icon: <Globe className="h-5 w-5" />,
    title: "Who else funds the same organizations",
    desc: "Other funders ranked by how many organizations they share",
  },
  {
    icon: <Building2 className="h-5 w-5" />,
    title: "Shared organizations",
    desc: "A list and matrix of organizations the selected funders co-fund",
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: "Overlaps by theme",
    desc: "Themes where the selected funders' investments concentrate",
  },
  {
    icon: <AlertCircle className="h-5 w-5" />,
    title: "Gaps",
    desc: "Organizations relying on one funder and themes with sparse support",
  },
];

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
  const [showNetwork, setShowNetwork] = useState(false);
  const [showGC, setShowGC] = useState(false);
  const [showAllCoFunders, setShowAllCoFunders] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [addFunderOpen, setAddFunderOpen] = useState(false);
  const [addFunderSearch, setAddFunderSearch] = useState("");

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

  // unfiltered data — refetch when showGC changes
  useEffect(() => {
    fetchDashboard({ showGeneralContributions: showGC })
      .then(setAllOrgData)
      .catch(() => {});
  }, [showGC]);

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
    setIsInitialized(true);
  }, [searchParams]);

  // available funders from nestedOrgs
  const availableFunders = useMemo(() => {
    const set = new Set<string>();
    nestedOrgs.forEach((org) =>
      getDonorsForOrg(org).forEach((d) => set.add(d)),
    );
    return Array.from(set).sort();
  }, [nestedOrgs]);

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
    const newUrl = params.toString()
      ? `/insights?${params.toString()}`
      : "/insights";
    const current = window.location.pathname + window.location.search;
    if (current !== newUrl) router.replace(newUrl, { scroll: false });
  }, [selectedFunders, isInitialized, router]);

  // filtered data when funders or showGC changes
  useEffect(() => {
    if (!hasShownInsights || selectedFunders.length === 0) {
      setFilteredData(null);
      return;
    }
    setLoading(true);
    fetchDashboard({
      donorCountries: selectedFunders,
      showGeneralContributions: showGC,
    })
      .then((data) => {
        setFilteredData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedFunders, hasShownInsights, showGC]);

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

  // orgs funded by ANY selected funder (union)
  const sharedOrgsData = useMemo(() => {
    if (selectedFunders.length === 0) return [];
    return nestedOrgs
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
  }, [nestedOrgs, selectedFunders]);

  // other funders ranked by shared org count
  const coFundersRanked = useMemo(() => {
    if (selectedFunders.length === 0 || sharedOrgsData.length === 0) return [];
    const counts = new Map<string, number>();
    sharedOrgsData.forEach((org) => {
      org.allFunders.forEach((f) => {
        if (!selectedFunders.includes(f)) {
          counts.set(f, (counts.get(f) ?? 0) + 1);
        }
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
  }, [sharedOrgsData, selectedFunders]);

  // sharedOrgsDisplayed: "truly shared" — co-funded by ≥2 selected funders (or for 1 funder: co-funded by anyone)
  const sharedOrgsDisplayed = useMemo(() => {
    if (selectedFunders.length === 0) return [];
    if (selectedFunders.length === 1) {
      return sharedOrgsData.filter((o) => o.totalFunders > 1);
    }
    return sharedOrgsData.filter((o) => o.selectedFundersForOrg.length >= 2);
  }, [sharedOrgsData, selectedFunders]);

  // funders that appear in no shared org
  const fundersWithNoOrgs = useMemo(
    () =>
      selectedFunders.filter(
        (f) => !sharedOrgsData.some((o) => o.allFunders.includes(f)),
      ),
    [selectedFunders, sharedOrgsData],
  );

  // matrix columns = selected funders (or selected + top co-funders when 1 selected)
  const matrixCols = useMemo(() => {
    if (selectedFunders.length === 0) return [];
    if (selectedFunders.length === 1) {
      return [selectedFunders[0], ...coFundersRanked.slice(0, 5).map(([f]) => f)];
    }
    return selectedFunders;
  }, [selectedFunders, coFundersRanked]);

  // matrix rows = top 15 shared orgs
  const matrixOrgs = useMemo(
    () => sharedOrgsDisplayed.slice(0, 15),
    [sharedOrgsDisplayed],
  );

  // overlaps by theme — uses allOrgData filtered to shared org union
  const themeOverlaps = useMemo(() => {
    if (!allOrgData || sharedOrgsData.length === 0) return [];
    const sharedIds = new Set(sharedOrgsData.map((o) => o.id));
    const orgThemeCounts = new Map<string, Set<string>>();
    allOrgData.allOrganizations.forEach((org) => {
      if (!sharedIds.has(org.id)) return;
      org.projects.forEach((p) => {
        p.investmentThemes.forEach((t) => {
          const theme = t.trim();
          if (!theme) return;
          if (!orgThemeCounts.has(theme)) orgThemeCounts.set(theme, new Set());
          orgThemeCounts.get(theme)!.add(org.id);
        });
      });
    });
    return Array.from(orgThemeCounts.entries())
      .sort((a, b) => b[1].size - a[1].size)
      .slice(0, 10)
      .map(([name, orgs]) => ({ name, count: orgs.size }));
  }, [allOrgData, sharedOrgsData]);

  // gaps: orgs with only one total funder
  const singleFunderOrgs = useMemo(
    () => sharedOrgsData.filter((o) => o.totalFunders === 1).slice(0, 10),
    [sharedOrgsData],
  );

  // gaps: themes with fewest total funders — uses allOrgData filtered to shared org union
  const themeGaps = useMemo(() => {
    if (!allOrgData || sharedOrgsData.length === 0) return [];
    const sharedIds = new Set(sharedOrgsData.map((o) => o.id));
    const touchedThemes = new Set<string>();
    allOrgData.allOrganizations.forEach((org) => {
      if (!sharedIds.has(org.id)) return;
      org.projects.forEach((p) =>
        p.investmentThemes.forEach((t) => {
          if (t.trim()) touchedThemes.add(t.trim());
        }),
      );
    });
    if (touchedThemes.size === 0) return [];
    const themeAllFunders = new Map<string, Set<string>>();
    allOrgData.allOrganizations.forEach((org) => {
      const funders = org.donorCountries ?? [];
      org.projects.forEach((p) => {
        p.investmentThemes.forEach((t) => {
          const theme = t.trim();
          if (!theme || !touchedThemes.has(theme)) return;
          if (!themeAllFunders.has(theme)) themeAllFunders.set(theme, new Set());
          funders.forEach((f) => themeAllFunders.get(theme)!.add(f));
        });
      });
    });
    return Array.from(touchedThemes)
      .map((theme) => ({
        theme,
        funderCount: themeAllFunders.get(theme)?.size ?? 0,
      }))
      .filter((t) => t.funderCount > 0)
      .sort((a, b) => a.funderCount - b.funderCount)
      .slice(0, 8);
  }, [allOrgData, sharedOrgsData]);

  const summarySentence = useMemo(() => {
    if (selectedFunders.length === 0) return "";
    const orgCount = sharedOrgsData.length;
    const coFunderCount = coFundersRanked.length;
    const coSuffix =
      coFunderCount > 0
        ? ` ${coFunderCount} other funder${coFunderCount !== 1 ? "s" : ""} fund at least one of the same ones.`
        : "";
    if (selectedFunders.length === 1) {
      return `${selectedFunders[0]} funds ${orgCount} organization${orgCount !== 1 ? "s" : ""}.${coSuffix}`;
    }
    return `Together, the selected funders fund ${orgCount} organization${orgCount !== 1 ? "s" : ""}.${coSuffix}`;
  }, [selectedFunders, sharedOrgsData, coFundersRanked]);

  const maxCoFunder = coFundersRanked[0]?.[1] ?? 1;

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

  const EMPTY_STRINGS = useMemo(() => [] as string[], []);
  const NOOP = useCallback(() => {}, []);
  const allKnownInvestmentTypes = useMemo(
    () => Object.values(labels.investmentTypes),
    [],
  );

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
                See funding overlaps, shared organizations, and where support is
                concentrated or thin.
              </p>
            </div>

            {/* STEP 1 box */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-bg-lighter)] px-2.5 py-0.5 text-xs font-semibold text-[var(--brand-primary)]">
                STEP 1
              </div>
              <h2 className="mb-1 text-base font-semibold text-slate-900 dark:text-white">
                Which funders do you want to explore?
              </h2>
              <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
                Select one or more funders to see how their investments overlap.
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

              {availableFunders.length > 0 && (
                <div className="mb-4 max-h-52 overflow-y-auto rounded-md border border-slate-100 dark:border-slate-700">
                  {step1List.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-slate-400">
                      No funders found.
                    </p>
                  ) : (
                    step1List.slice(0, 60).map((f) => {
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

              <p className="mt-3 text-xs text-slate-400">
                You can compare multiple funders or start with just one.
              </p>
            </div>

            {/* WHAT YOU'LL SEE */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                What you&apos;ll see
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {PREVIEW_CARDS.map((c) => (
                  <div
                    key={c.title}
                    className="rounded-xl border border-slate-100 bg-white p-4 opacity-50 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <div className="mb-2 text-slate-300 dark:text-slate-600">
                      {c.icon}
                    </div>
                    <p className="mb-1 text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {c.title}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {c.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ===== RESULTS STATE ===== */
          <div className="space-y-6">
            {/* Comparing bar */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Comparing:
              </span>

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
                        <p className="px-3 py-2 text-xs text-slate-400">
                          No funders found.
                        </p>
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

              <button
                onClick={clearAll}
                className="ml-auto inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="h-3 w-3" />
                Clear all
              </button>

              {/* Core / institutional support toggle */}
              <button
                onClick={() => selectedFunders.length > 0 && setShowGC((v) => !v)}
                disabled={selectedFunders.length === 0}
                title={
                  selectedFunders.length === 0
                    ? "Select a funder to include core budget contributions to UN entities."
                    : undefined
                }
                className={`flex items-center gap-1.5 text-xs transition-colors ${
                  selectedFunders.length === 0
                    ? "cursor-not-allowed text-slate-300 dark:text-slate-600"
                    : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                <Landmark className="h-3.5 w-3.5" />
                <span>Core / institutional support</span>
                <div
                  className={`h-4 w-7 rounded-full transition-colors ${
                    selectedFunders.length === 0
                      ? "bg-slate-200 dark:bg-slate-700"
                      : showGC
                        ? "bg-[var(--brand-primary-dark)]"
                        : "bg-slate-300"
                  }`}
                >
                  <div
                    className={`h-4 w-4 rounded-full bg-white transition-transform ${
                      showGC && selectedFunders.length > 0
                        ? "translate-x-3"
                        : "translate-x-0"
                    }`}
                  />
                </div>
              </button>
            </div>

            {/* Summary sentence */}
            {summarySentence && (
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {summarySentence}
              </p>
            )}

            {/* Zero-org funder note */}
            {fundersWithNoOrgs.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                {fundersWithNoOrgs.map((f) => (
                  <p key={f}>
                    <strong>{f}</strong> has no documented support outside core budget contributions to UN entities. Turn on &quot;Core / institutional support&quot; to include it.
                  </p>
                ))}
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
                <span className="ml-3 text-sm text-slate-500">
                  Loading insights…
                </span>
              </div>
            ) : (
              <>
                {/* Section 1: Who else funds */}
                {coFundersRanked.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <Globe className="h-4 w-4 text-[var(--brand-primary)]" />
                      Who else funds the same organizations
                    </h2>
                    <div className="space-y-2">
                      {(showAllCoFunders
                        ? coFundersRanked
                        : coFundersRanked.slice(0, 10)
                      ).map(([funder, count]) => (
                        <div key={funder} className="flex items-center gap-3">
                          <span
                            className="w-36 shrink-0 truncate text-xs text-slate-600 dark:text-slate-400"
                            title={funder}
                          >
                            {funder}
                          </span>
                          <div className="flex-1">
                            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                              <div
                                className="h-2.5 rounded-full"
                                style={{
                                  width: `${(count / maxCoFunder) * 100}%`,
                                  minWidth: count > 0 ? "4px" : "0",
                                  backgroundColor: "var(--brand-primary)",
                                }}
                              />
                            </div>
                          </div>
                          <span className="w-32 shrink-0 text-right text-xs text-slate-500">
                            {count} shared {count === 1 ? "organization" : "organizations"}
                          </span>
                        </div>
                      ))}
                    </div>
                    {coFundersRanked.length > 10 && (
                      <button
                        onClick={() => setShowAllCoFunders((v) => !v)}
                        className="mt-3 text-xs hover:underline"
                        style={{ color: "var(--brand-primary)" }}
                      >
                        {showAllCoFunders
                          ? "Show fewer"
                          : `Show all (${coFundersRanked.length})`}
                      </button>
                    )}
                  </div>
                )}

                {/* Section 2: Shared organizations */}
                <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                  <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                    <Building2 className="h-4 w-4 text-[var(--brand-primary)]" />
                    Shared organizations ({sharedOrgsDisplayed.length})
                  </h2>
                  {sharedOrgsDisplayed.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {selectedFunders.length === 2
                        ? `${selectedFunders[0]} and ${selectedFunders[1]} don’t fund any of the same organizations.`
                        : selectedFunders.length === 1
                          ? `No co-funded organizations found for ${selectedFunders[0]}.`
                          : "The selected funders don’t fund any of the same organizations."}
                    </p>
                  ) : (
                    <div className="grid gap-8 lg:grid-cols-2">
                      {/* List */}
                      <div>
                        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          {selectedFunders.length === 1
                            ? "Co-funded organizations"
                            : "By selected funders"}
                        </h3>
                        <div className="max-h-72 space-y-0.5 overflow-y-auto">
                          {sharedOrgsDisplayed.map((org) => (
                            <div
                              key={org.id}
                              className="flex items-start justify-between gap-2 rounded px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs text-slate-700 dark:text-slate-300">
                                  {org.name}
                                </p>
                                {selectedFunders.length > 1 && (
                                  <p className="truncate text-xs text-slate-400">
                                    {org.selectedFundersForOrg.join(", ")}
                                  </p>
                                )}
                              </div>
                              <span
                                className="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold"
                                style={{
                                  backgroundColor: "var(--brand-primary-lighter)",
                                  color: "var(--brand-primary)",
                                }}
                              >
                                {org.totalFunders}{" "}
                                {org.totalFunders === 1 ? "funder" : "funders"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Matrix — orgs as rows, funders as columns */}
                      {matrixCols.length > 0 && matrixOrgs.length > 0 && (
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Funding matrix
                          </h3>
                          <div className="overflow-x-auto">
                            <table className="border-collapse text-xs">
                              <thead>
                                <tr>
                                  <th className="border-b-2 border-slate-200 py-1 pr-3 text-left text-xs font-semibold text-slate-500 dark:border-slate-600">
                                    Organization
                                  </th>
                                  {matrixCols.map((col) => (
                                    <th
                                      key={col}
                                      className="whitespace-nowrap border-b-2 border-slate-200 px-2 py-1 text-center text-xs font-semibold text-slate-500 dark:border-slate-600"
                                      title={col}
                                    >
                                      {col.length > 14
                                        ? col.slice(0, 12) + "…"
                                        : col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {matrixOrgs.map((org) => (
                                  <tr key={org.id}>
                                    <td
                                      className="whitespace-nowrap border-r-2 border-slate-200 py-1 pr-3 text-xs text-slate-600 dark:border-slate-600"
                                      title={org.name}
                                    >
                                      {org.name.length > 22
                                        ? org.name.slice(0, 20) + "…"
                                        : org.name}
                                    </td>
                                    {matrixCols.map((col) => {
                                      const funds = org.allFunders.includes(col);
                                      const isSelected =
                                        selectedFunders.includes(col);
                                      return (
                                        <td
                                          key={col}
                                          className={`border border-slate-100 px-2 py-1 text-center dark:border-slate-700 ${
                                            funds
                                              ? isSelected
                                                ? "bg-[var(--brand-bg-lighter)]"
                                                : "bg-amber-50 dark:bg-amber-900/20"
                                              : ""
                                          }`}
                                        >
                                          {funds ? (
                                            <span
                                              className={`inline-block h-3 w-3 rounded-sm ${
                                                isSelected
                                                  ? "bg-[var(--brand-primary)]"
                                                  : "bg-amber-400"
                                              }`}
                                            />
                                          ) : null}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <p className="mt-2 text-xs text-slate-400">
                              Filled square = that funder funds that organization.{" "}
                              {selectedFunders.length === 1
                                ? "Top 5 co-funders shown as additional columns."
                                : ""}
                              {matrixOrgs.length < sharedOrgsDisplayed.length && (
                                <>
                                  {" "}
                                  Showing {matrixOrgs.length} of{" "}
                                  {sharedOrgsDisplayed.length} organizations.
                                </>
                              )}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Section 3: Overlaps by theme */}
                {themeOverlaps.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <Layers className="h-4 w-4 text-[var(--brand-primary)]" />
                      Overlaps by theme
                    </h2>
                    <div className="space-y-2">
                      {themeOverlaps.map(({ name, count }) => (
                        <div key={name} className="flex items-center gap-3">
                          <span
                            className="w-44 shrink-0 truncate text-xs text-slate-600 dark:text-slate-400"
                            title={name}
                          >
                            {name}
                          </span>
                          <div className="flex-1">
                            <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-700">
                              <div
                                className="h-2.5 rounded-full"
                                style={{
                                  width: `${(count / (themeOverlaps[0]?.count ?? 1)) * 100}%`,
                                  minWidth: count > 0 ? "4px" : "0",
                                  backgroundColor: "var(--brand-primary)",
                                }}
                              />
                            </div>
                          </div>
                          <span className="w-20 shrink-0 text-right text-xs text-slate-500">
                            {count} {count === 1 ? "org" : "orgs"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 4: Gaps */}
                {(singleFunderOrgs.length > 0 || themeGaps.length > 0) && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Gaps
                    </h2>
                    <div className="grid gap-8 lg:grid-cols-2">
                      {singleFunderOrgs.length > 0 && (
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Organizations relying on one funder
                          </h3>
                          <div className="space-y-0.5">
                            {singleFunderOrgs.map((org) => (
                              <div
                                key={org.id}
                                className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                              >
                                <span className="min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-300">
                                  {org.name}
                                </span>
                                <span className="shrink-0 text-xs text-slate-400">
                                  {org.allFunders[0]}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {themeGaps.length > 0 && (
                        <div>
                          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Themes with the fewest funders
                          </h3>
                          <div className="space-y-1.5">
                            {themeGaps.map(({ theme, funderCount }) => (
                              <div
                                key={theme}
                                className="flex items-center justify-between gap-2"
                              >
                                <span className="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-400">
                                  {theme}
                                </span>
                                <span className="shrink-0 rounded bg-amber-50 px-1.5 py-0.5 text-xs font-semibold text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
                                  {funderCount}{" "}
                                  {funderCount === 1 ? "funder" : "funders"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section 5: Network graph (collapsed by default) */}
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
                  {showNetwork && filteredData && (
                    <div className="border-t border-slate-100 dark:border-slate-700">
                      <div style={{ height: 520 }}>
                        <NetworkGraph
                          organizationsWithProjects={
                            filteredData.organizationsWithProjects
                          }
                          allOrganizations={filteredData.allOrganizations}
                          onOpenOrganizationModal={(key) =>
                            router.push(`/explore?org=${key}`)
                          }
                          onOpenProjectModal={(key) =>
                            router.push(`/explore?asset=${key}`)
                          }
                          combinedDonors={selectedFunders}
                          availableDonorCountries={availableFunders}
                          onDonorsChange={setSelectedFunders}
                          investmentThemes={EMPTY_STRINGS}
                          allKnownInvestmentThemes={
                            filteredData.investmentThemes
                          }
                          investmentThemesByType={
                            filteredData.investmentThemesByType
                          }
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
              </>
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
