"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import PageHeader from "@/components/PageHeader";
import FundersTable from "@/components/FundersTable";
import { useGeneralContributions } from "@/contexts/GeneralContributionsContext";
import { processDashboardData, setGeneralContributionsEnabled } from "@/lib/data";
import labels from "@/config/labels.json";
import { INVESTMENT_TYPE_DESCRIPTIONS } from "@/config/investmentDescriptions";
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
    topFunder,
    wellKnownProduct,
    typeStats,
    lastUpdated,
  };
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────

export default function HomePage() {
  const { showGeneralContributions } = useGeneralContributions();
  const router = useRouter();

  const [stats, setStats] = useState<ComputedStats | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationWithProjects[] | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const loading = stats === null;

  // Keep the module-level general-contributions flag in sync with the context
  // (previously done by the repository section, which no longer lives on Home)
  useEffect(() => {
    setGeneralContributionsEnabled(showGeneralContributions);
  }, [showGeneralContributions]);

  // Fetch unfiltered dashboard data for homepage stats
  useEffect(() => {
    let cancelled = false;

    processDashboardData({})
      .then((data) => {
        if (cancelled) return;
        if (data?.allOrganizations) {
          setOrganizations(data.allOrganizations as OrganizationWithProjects[]);
          setStats(computeStats(
            data.allOrganizations as OrganizationWithProjects[],
            data.stats ?? null,
            Array.isArray(data.projectTypes) ? data.projectTypes : null,
            null,
          ));
        }
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [showGeneralContributions]);

  // Footer timestamp loads independently so it never delays the boxes
  useEffect(() => {
    let cancelled = false;
    fetch("/api/last-updated")
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setLastUpdated(d?.lastUpdated ?? null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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

          <p className="mt-4 max-w-4xl text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
            The Crisis Data Funding Compass maps who funds the organizations and
            data products that support crisis response. Use it to see what a
            funder supports, who else supports the same organizations, and where
            support is thin. Compiled from public sources, it shows who supports
            whom, not how much.
          </p>
        </section>

        {/* ── 2. At a glance ── */}
        <section className="pb-12">
          <h2 className="mb-4 text-base font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            At a glance
          </h2>
          {(
            <>
              {/* Key figures */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {(
                  [
                    { count: stats?.totalFunders, label: "funders" },
                    { count: stats?.totalOrgs, label: "organizations" },
                    { count: stats?.totalProducts, label: "data products" },
                  ] as const
                ).map(({ count, label }) => (
                  <div
                    key={label}
                    className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900"
                  >
                    <div className="flex h-9 items-center sm:h-10">
                      {count === undefined ? (
                        <div
                          aria-hidden="true"
                          className="h-7 w-20 animate-pulse rounded bg-slate-200 dark:bg-slate-700 sm:h-8"
                        />
                      ) : (
                        <span
                          className="text-3xl leading-none font-bold sm:text-4xl"
                          style={{ color: "var(--brand-primary)" }}
                        >
                          {count}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* ── 3. Question cards ── */}
        <section className="pb-12">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(
              [
                {
                  title: "What does a funder support?",
                  body: "See a funder's profile: the organizations it supports, its portfolio and who funds alongside it.",
                  action: () => router.push("/insights"),
                },
                {
                  title: "Where do funders overlap?",
                  body: "Compare funders side by side and see which organizations they share.",
                  action: () => router.push("/insights"),
                },
                {
                  title: "What kinds of data work get funded?",
                  body: "Browse organizations and products by type of data work.",
                  action: () =>
                    document
                      .getElementById("browse-by-type")
                      ?.scrollIntoView({ behavior: "smooth" }),
                },
              ] as const
            ).map(({ title, body, action }) => (
              <button
                key={title}
                onClick={action}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-all duration-200 hover:border-[var(--brand-border)] hover:bg-[var(--brand-primary-light)] hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-[var(--brand-border)] dark:hover:bg-[var(--brand-primary-light)]"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-slate-900 transition-colors duration-200 dark:text-white dark:group-hover:text-slate-900">
                    {title}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[var(--brand-primary)] transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-slate-900" />
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 transition-colors duration-200 group-hover:text-slate-800 dark:text-slate-400 dark:group-hover:text-slate-800">
                  {body}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* ── 4. Browse by type ── */}
        {(loading || (stats && stats.typeStats.length > 0)) && (
          <section id="browse-by-type" className="pb-12">
            <div className="mb-1 flex items-baseline gap-3">
              <h2 className="text-base font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Browse by type
              </h2>
              <span className="text-xs text-slate-400 dark:text-slate-600">
                Proposed taxonomy, to be confirmed
              </span>
            </div>
            <TooltipProvider>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {loading &&
                  Object.entries(labels.investmentTypes).map(([key, typeName]) => (
                    <div
                      key={key}
                      aria-hidden="true"
                      className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {typeName}
                      </span>
                      <div className="mt-0.5 flex h-4 items-center">
                        <div className="h-3 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                      <div className="mt-3 h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
                    </div>
                  ))}
                {stats?.typeStats
                  .slice()
                  .sort((a, b) => b.productCount - a.productCount)
                  .map(({ key, typeName, productCount, funderCount }) => {
                    const barWidth = Math.round(
                      (productCount / maxProductCount) * 100,
                    );
                    const description = INVESTMENT_TYPE_DESCRIPTIONS[typeName];
                    return (
                      <button
                        key={key}
                        onClick={() =>
                          router.push(
                            `/organizations?type=${encodeURIComponent(typeName)}`,
                          )
                        }
                        className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-[var(--brand-primary)] hover:shadow-sm dark:border-slate-700 dark:bg-slate-900"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            {typeName}
                          </span>
                          {description && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span
                                  onClick={(e) => e.stopPropagation()}
                                  className="cursor-default"
                                >
                                  <Info className="h-3 w-3 shrink-0 text-slate-400" />
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                {description}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
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
            </TooltipProvider>
          </section>
        )}
      </div>

      {/* ── 5. Funders ── */}
      <div className="mx-auto max-w-[82rem] px-4 sm:px-6 lg:px-8">
        <FundersTable organizations={organizations} />
      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto max-w-[82rem] px-4 py-5 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-slate-500 dark:text-slate-500">
            Compiled from public sources · Shows who supports whom, not how
            much · Last updated{" "}
            {lastUpdated ?? "—"}
          </p>
        </div>
      </footer>
    </div>
  );
}
