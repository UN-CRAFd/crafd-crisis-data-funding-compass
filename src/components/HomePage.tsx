"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Search,
  HelpCircle,
  Database,
} from "lucide-react";
import PageHeader from "@/components/PageHeader";
import HomePageRepository, {
  type HomePageRepositoryHandle,
} from "@/components/HomePageRepository";
import { useGeneralContributions } from "@/contexts/GeneralContributionsContext";
import { processDashboardData } from "@/lib/data";
import labels from "@/config/labels.json";
import type { OrganizationWithProjects, ProjectData } from "@/types/airtable";

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface ComputedStats {
  totalFunders: number;
  totalOrgs: number;
  totalProducts: number;
  singleFunderProducts: number;
  fivePlusFunderProducts: number;
  singleFunderOrgs: number;
  fivePlusFunderOrgs: number;
  noProductLevelDocsPercent: number;
  topFunder: string | null;
  wellKnownProduct: { name: string; funderCount: number } | null;
  typeStats: Array<{
    key: string;
    typeName: string;
    productCount: number;
    funderCount: number;
  }>;
  lastUpdated: string | null;
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function computeStats(
  allOrganizations: OrganizationWithProjects[],
  apiStats: { donorCountries: number; dataProviders: number; dataProjects: number } | null,
  apiProjectTypes: Array<{ name: string; count: number }> | null,
  lastUpdated: string | null,
): ComputedStats {
  // Deduplicate products across orgs using the same key the server uses
  const projectMap = new Map<string, ProjectData>();
  allOrganizations.forEach((o) =>
    o.projects.forEach((p) => {
      const key = `${p.id}-${p.projectName}`;
      if (!projectMap.has(key)) projectMap.set(key, p);
    }),
  );
  const allProjects = Array.from(projectMap.values());

  // Use authoritative server stats for the headline numbers
  const totalFunders = apiStats?.donorCountries ?? allOrganizations.reduce((s, o) => {
    o.donorCountries?.forEach((d) => s.add(d));
    return s;
  }, new Set<string>()).size;
  const totalOrgs = apiStats?.dataProviders ?? allOrganizations.length;
  const totalProducts = apiStats?.dataProjects ?? allProjects.length;

  // Single / 5+ funder products
  const singleFunderProducts = allProjects.filter(
    (p) => (p.donorCountries?.length ?? 0) === 1,
  ).length;
  const fivePlusFunderProducts = allProjects.filter(
    (p) => (p.donorCountries?.length ?? 0) >= 5,
  ).length;

  // Single funder orgs
  const singleFunderOrgs = allOrganizations.filter(
    (o) => (o.donorCountries?.length ?? 0) === 1,
  ).length;

  // Five or more funder orgs
  const fivePlusFunderOrgs = allOrganizations.filter(
    (o) => (o.donorCountries?.length ?? 0) >= 5,
  ).length;

  // Percent of products with no product-level funder documentation
  const productsWithNoProductFunders = allProjects.filter(
    (p) => (p.donorCountries?.length ?? 0) === 0,
  ).length;
  const noProductLevelDocsPercent =
    allProjects.length > 0
      ? Math.round((productsWithNoProductFunders / allProjects.length) * 100)
      : 0;

  // Top funder (most products funded)
  const funderProductCount = new Map<string, number>();
  allProjects.forEach((p) => {
    p.donorCountries?.forEach((d) => {
      funderProductCount.set(d, (funderProductCount.get(d) ?? 0) + 1);
    });
  });
  const topFunder =
    Array.from(funderProductCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    null;

  // Well-known product (most funders)
  const wellKnown = [...allProjects].sort(
    (a, b) => (b.donorCountries?.length ?? 0) - (a.donorCountries?.length ?? 0),
  )[0];
  const wellKnownProduct = wellKnown
    ? { name: wellKnown.projectName, funderCount: wellKnown.donorCountries?.length ?? 0 }
    : null;

  // Type stats (one card per investment type)
  // Product counts come from the API (server-computed, avoids client-side name-match issues).
  // Funder counts use org-level donors for orgs that have at least one project of the type.
  const apiTypeCountMap = new Map(
    (apiProjectTypes ?? []).map((pt) => [pt.name.toLowerCase().trim(), pt.count]),
  );
  const typeStats = Object.entries(labels.investmentTypes).map(
    ([key, typeName]) => {
      const normalized = typeName.toLowerCase().trim();
      // Exact match first, then substring fallback (same flexibility as server filter)
      const productCount =
        apiTypeCountMap.get(normalized) ??
        [...apiTypeCountMap.entries()].find(
          ([k]) => k.includes(normalized) || normalized.includes(k),
        )?.[1] ??
        0;
      // Org-level funders for orgs that contain at least one project of this type
      const fundersSet = new Set<string>();
      allOrganizations.forEach((org) => {
        const hasType = org.projects.some((p) =>
          p.investmentTypes?.some(
            (t) =>
              t.toLowerCase().trim() === normalized ||
              t.toLowerCase().includes(normalized) ||
              normalized.includes(t.toLowerCase().trim()),
          ),
        );
        if (hasType) (org.donorCountries ?? []).forEach((d) => fundersSet.add(d));
      });
      return { key, typeName, productCount, funderCount: fundersSet.size };
    },
  );

  return {
    totalFunders,
    totalOrgs,
    totalProducts,
    singleFunderProducts,
    fivePlusFunderProducts,
    singleFunderOrgs,
    fivePlusFunderOrgs,
    noProductLevelDocsPercent,
    topFunder,
    wellKnownProduct,
    typeStats,
    lastUpdated,
  };
}

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function QuestionChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition-all hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] hover:shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
    >
      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
      {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────

export default function HomePage() {
  const { showGeneralContributions } = useGeneralContributions();
  const repoRef = useRef<HomePageRepositoryHandle>(null);

  const [stats, setStats] = useState<ComputedStats | null>(null);
  const [introSearch, setIntroSearch] = useState("");

  // Fetch unfiltered dashboard data for homepage stats
  useEffect(() => {
    let cancelled = false;

    Promise.all([
      processDashboardData({}),
      fetch("/api/last-updated")
        .then((r) => r.json())
        .then((d) => d?.lastUpdated ?? null)
        .catch(() => null),
    ]).then(([data, lastUpdated]) => {
      if (cancelled) return;
      if (data?.allOrganizations) {
        setStats(computeStats(
          data.allOrganizations as OrganizationWithProjects[],
          data.stats ?? null,
          Array.isArray(data.projectTypes) ? data.projectTypes : null,
          lastUpdated,
        ));
      }
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [showGeneralContributions]);

  // Scroll to repository and apply a filter
  const goToRepository = (filters?: Parameters<HomePageRepositoryHandle["resetAndSetFilters"]>[0]) => {
    if (filters) {
      repoRef.current?.resetAndSetFilters(filters);
    }
    setTimeout(() => {
      document
        .getElementById("repository")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const handleIntroSearch = () => {
    if (!introSearch.trim()) {
      goToRepository();
      return;
    }
    goToRepository({
      searchQuery: introSearch.trim(),
      appliedSearchQuery: introSearch.trim(),
    });
  };

  // Question chips (computed once stats load)
  const questionChips = useMemo(() => {
    if (!stats) return [];
    const chips: Array<{ label: string; onClick: () => void }> = [];

    if (stats.topFunder) {
      chips.push({
        label: `What does ${stats.topFunder} support?`,
        onClick: () => goToRepository({ donors: [stats.topFunder!] }),
      });
    }
    if (stats.wellKnownProduct) {
      chips.push({
        label: `Who supports ${stats.wellKnownProduct.name}?`,
        onClick: () =>
          goToRepository({
            searchQuery: stats.wellKnownProduct!.name,
            appliedSearchQuery: stats.wellKnownProduct!.name,
          }),
      });
    }
    chips.push({
      label: "Which organizations rely on a single funder?",
      onClick: () => goToRepository({ singleFunderOrg: true }),
    });
    chips.push({
      label: "Which organizations have five or more funders?",
      onClick: () => goToRepository({ fivePlusFunderOrg: true }),
    });
    return chips;
  }, [stats]);

  // "Start with a question" cards
  const entryCards = [
    {
      key: "funder",
      title: "What does a funder support?",
      description:
        "Select a funder to see which organizations and products they support.",
      onClick: () => goToRepository(),
      icon: Database,
    },
    {
      key: "product",
      title: "Who supports a data product?",
      description:
        "Find a product and see every funder documented for it.",
      onClick: () => goToRepository(),
      icon: Search,
    },
    {
      key: "insights",
      title: "Where is support shared or thin?",
      description:
        "Explore overlaps, concentration, and gaps across the ecosystem.",
      href: "/insights",
      icon: BarChart3,
    },
    {
      key: "gap",
      title: "Spotted a gap or an error?",
      description: "Help improve the data by suggesting a correction.",
      // TODO: replace placeholder with real correction form URL
      href: "#",
      icon: HelpCircle,
    },
  ];

  // "At a glance" cards
  const glanceCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        key: "single-org",
        count: stats.singleFunderOrgs,
        label: "organizations rely on a single documented funder.",
        onClick: () => goToRepository({ singleFunderOrg: true }),
        href: undefined as string | undefined,
        linkLabel: undefined as string | undefined,
      },
      {
        key: "five-plus-org",
        count: stats.fivePlusFunderOrgs,
        label: "organizations are supported by five or more funders.",
        onClick: () => goToRepository({ fivePlusFunderOrg: true }),
        href: undefined as string | undefined,
        linkLabel: undefined as string | undefined,
      },
      {
        key: "no-product-docs",
        count: `${stats.noProductLevelDocsPercent}%`,
        label: "of data products have funding documented only at organization level.",
        onClick: undefined as (() => void) | undefined,
        // TODO: replace href with the real correction form URL
        href: "#" as string | undefined,
        linkLabel: "Know who funds a specific product? Suggest an update" as string | undefined,
      },
    ];
  }, [stats]);

  // "Browse by theme" type cards
  const maxProductCount = useMemo(
    () => Math.max(...(stats?.typeStats.map((t) => t.productCount) ?? [1]), 1),
    [stats],
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader />

      {/* ── Main content ── */}
      <div className="mx-auto max-w-[82rem] px-4 pt-28 sm:px-6 sm:pt-36 lg:px-8">

        {/* ── 1. Intro ── */}
        <section className="pb-12">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
            Who supports the data behind crisis response?
          </h1>

          {/* One-line stats */}
          {stats ? (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
              A public map of documented support between{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {stats.totalFunders}
              </strong>{" "}
              funders,{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {stats.totalOrgs}
              </strong>{" "}
              organizations and{" "}
              <strong className="text-slate-800 dark:text-slate-200">
                {stats.totalProducts}
              </strong>{" "}
              data products, compiled from open sources. It shows who supports
              whom, not how much.
            </p>
          ) : (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
              A public map of documented support between funders, organizations,
              and data products. Shows who supports whom, not how much.
            </p>
          )}

          {/* Intro search */}
          <div className="mt-6 flex max-w-xl gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={introSearch}
                onChange={(e) => setIntroSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleIntroSearch();
                }}
                placeholder="Search funders, organizations, or products…"
                className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-[var(--brand-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <button
              onClick={handleIntroSearch}
              className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: "var(--brand-primary)" }}
            >
              Explore
            </button>
          </div>

          {/* Question chips */}
          {questionChips.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {questionChips.map((chip) => (
                <QuestionChip
                  key={chip.label}
                  label={chip.label}
                  onClick={chip.onClick}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── 2. Start with a question ── */}
        <section className="pb-12">
          <h2 className="mb-4 text-base font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Start with a question
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {entryCards.map(({ key, title, description, href, onClick, icon: Icon }) => {
              const cardClass =
                "group flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600";

              const inner = (
                <>
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                    <Icon
                      className="h-5 w-5"
                      style={{ color: "var(--brand-primary)" }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {title}
                    </span>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5"
                      style={{ color: "var(--brand-primary)" }}
                    />
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {description}
                  </p>
                </>
              );

              if (href) {
                return (
                  <Link key={key} href={href} className={cardClass}>
                    {inner}
                  </Link>
                );
              }
              return (
                <button
                  key={key}
                  onClick={onClick}
                  className={`${cardClass} text-left`}
                >
                  {inner}
                </button>
              );
            })}
          </div>
        </section>

        {/* ── 3. At a glance ── */}
        <section className="pb-12">
          <h2 className="mb-4 text-base font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            At a glance
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {glanceCards.map(({ key, count, label, onClick, href, linkLabel }) => (
              <div
                key={key}
                className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
              >
                <div>
                  <span
                    className="text-3xl font-bold"
                    style={{ color: "var(--brand-primary)" }}
                  >
                    {count}
                  </span>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                    {label}
                  </p>
                </div>
                {href ? (
                  <Link
                    href={href}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-75"
                    style={{ color: "var(--brand-primary)" }}
                  >
                    {linkLabel ?? "Learn more"}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : onClick ? (
                  <button
                    onClick={onClick}
                    className="mt-4 inline-flex items-center gap-1 text-xs font-medium transition-opacity hover:opacity-75"
                    style={{ color: "var(--brand-primary)" }}
                  >
                    See which ones
                    <ArrowRight className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. Browse by type ── */}
        {stats && stats.typeStats.length > 0 && (
          <section className="pb-12">
            <div className="mb-1 flex items-baseline gap-3">
              <h2 className="text-base font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Browse by type
              </h2>
              <span className="text-xs text-slate-400 dark:text-slate-600">
                Proposed taxonomy, to be confirmed
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stats.typeStats
                .slice()
                .sort((a, b) => b.productCount - a.productCount)
                .map(({ key, typeName, productCount, funderCount }) => {
                  const barWidth = Math.round(
                    (productCount / maxProductCount) * 100,
                  );
                  return (
                    <button
                      key={key}
                      onClick={() =>
                        goToRepository({ types: [typeName] })
                      }
                      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-[var(--brand-primary)] hover:shadow-sm dark:border-slate-700 dark:bg-slate-900"
                    >
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {typeName}
                      </span>
                      <span className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {productCount}{" "}
                        {productCount === 1
                          ? labels.product.singular
                          : labels.product.plural}{" "}
                        · {funderCount}{" "}
                        {funderCount === 1 ? "funder" : "funders"}
                      </span>
                      {/* Bar */}
                      <div className="mt-3 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800">
                        <div
                          className="h-1 rounded-full transition-all"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: "var(--brand-primary)",
                            opacity: 0.6,
                          }}
                        />
                      </div>
                    </button>
                  );
                })}
            </div>
          </section>
        )}
      </div>

      {/* ── 5. Repository ── */}
      <div className="mt-4 border-t border-slate-200 bg-white pt-10 dark:border-slate-700 dark:bg-slate-950">
        <div className="mx-auto max-w-[82rem] px-4 sm:px-6 lg:px-8">
          <HomePageRepository ref={repoRef} />
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto max-w-[82rem] px-4 py-5 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-slate-500 dark:text-slate-500">
            Compiled from public sources · Shows who supports whom, not how
            much · Last updated{" "}
            {stats?.lastUpdated ?? "—"}
          </p>
        </div>
      </footer>
    </div>
  );
}
