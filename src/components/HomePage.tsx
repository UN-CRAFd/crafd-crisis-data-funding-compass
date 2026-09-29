"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Building2, Globe, BarChart3 } from "lucide-react";
import PageHeader from "@/components/PageHeader";

interface Stats {
  dataProviders: number;
  donorCountries: number;
  dataProjects: number;
}

const ENTRY_CARDS = [
  {
    key: "donors",
    title: "Donors",
    description: "See which countries fund crisis data and what they support.",
    href: "/explore?tab=donors",
    icon: Globe,
  },
  {
    key: "organizations",
    title: "Organizations",
    description: "Browse data providers, their products, and who funds them.",
    href: "/explore",
    icon: Building2,
  },
  {
    key: "insights",
    title: "Insights",
    description:
      "See funding overlaps, the network graph, and where donors collaborate.",
    href: "/insights",
    icon: BarChart3,
  },
];

export default function HomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.stats) {
          setStats({
            dataProviders: data.stats.dataProviders,
            donorCountries: data.stats.donorCountries,
            dataProjects: data.stats.dataProjects,
          });
        }
      })
      .catch(() => {});

    fetch("/api/last-updated")
      .then((r) => r.json())
      .then((data) => setLastUpdated(data?.lastUpdated ?? null))
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader />

      <div className="mx-auto max-w-[82rem] px-4 pt-28 pb-16 sm:px-6 sm:pt-36 lg:px-8">
        {/* Headline */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
            Understand who funds crisis data.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400 sm:text-xl">
            A system-wide overview of who funds crisis data, which organizations
            deliver it, and where funding overlaps.
          </p>

          {/* Inline stats */}
          {stats && (
            <p className="mt-5 text-sm text-slate-500 dark:text-slate-500">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {stats.dataProviders}
              </span>{" "}
              organizations ·{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {stats.donorCountries}
              </span>{" "}
              donors ·{" "}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {stats.dataProjects}
              </span>{" "}
              products
            </p>
          )}

          {lastUpdated && (
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-600">
              Last updated: {lastUpdated}
            </p>
          )}
        </div>

        {/* Entry cards */}
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:max-w-3xl">
          {ENTRY_CARDS.map(({ key, title, description, href, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              className="group flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <Icon
                  className="h-5 w-5"
                  style={{ color: "var(--brand-primary)" }}
                />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {title}
                </h2>
                <ArrowRight
                  className="h-3.5 w-3.5 flex-shrink-0"
                  style={{ color: "var(--brand-primary)" }}
                />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto max-w-[82rem] px-4 py-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-slate-500 dark:text-slate-500">
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
