"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";
import HomePageRepository from "@/components/HomePageRepository";

export default function OrganizationsPage() {
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/last-updated")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setLastUpdated(d?.lastUpdated ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <PageHeader />

      <div className="mx-auto max-w-[82rem] px-4 pt-28 sm:px-6 sm:pt-36 lg:px-8">
        <section className="pb-8">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl lg:text-4xl">
            Organizations
          </h1>
          <p className="mt-3 max-w-4xl text-sm leading-relaxed text-slate-600 dark:text-slate-400 sm:text-base">
            Search and filter every organization, its data products and their
            funders.
          </p>
        </section>
      </div>

      <div className="border-t border-slate-200 bg-white pt-10 dark:border-slate-700 dark:bg-slate-950">
        <div className="mx-auto max-w-[82rem] px-4 sm:px-6 lg:px-8">
          <HomePageRepository />
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto max-w-[82rem] px-4 py-5 sm:px-6 lg:px-8">
          <p className="text-center text-xs text-slate-500 dark:text-slate-500">
            Compiled from public sources · Shows who supports whom, not how
            much · Last updated {lastUpdated ?? "—"}
          </p>
        </div>
      </footer>
    </div>
  );
}
