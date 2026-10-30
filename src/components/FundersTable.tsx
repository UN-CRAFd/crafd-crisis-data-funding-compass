"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toUrlSlug } from "@/lib/urlShortcuts";
import type { OrganizationWithProjects } from "@/types/airtable";

type SortKey = "organizations" | "products" | "name";

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "organizations", label: "Most organizations" },
  { value: "products", label: "Most products" },
  { value: "name", label: "Name (A–Z)" },
];

interface FunderRow {
  funder: string;
  organizations: number;
  products: number;
}

// Placeholders: these will come from new Airtable fields (funder type, budget) later.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getFunderPlaceholderFields(_funder: string) {
  return {
    type: "—",
    estDataFunding: "$[ ]M",
    status: "Budget pending",
  };
}

export default function FundersTable({
  organizations,
}: {
  organizations: OrganizationWithProjects[] | null;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("organizations");

  // Same definition as Insights' per-funder product count: distinct products
  // (`${id}-${projectName}`) of every organization that lists the funder.
  const rows = useMemo<FunderRow[]>(() => {
    if (!organizations) return [];
    const byFunder = new Map<string, { orgs: Set<string>; products: Set<string> }>();
    organizations.forEach((org) => {
      (org.donorCountries ?? []).forEach((f) => {
        let entry = byFunder.get(f);
        if (!entry) {
          entry = { orgs: new Set(), products: new Set() };
          byFunder.set(f, entry);
        }
        entry.orgs.add(org.id);
        org.projects.forEach((p) => entry!.products.add(`${p.id}-${p.projectName}`));
      });
    });
    return Array.from(byFunder.entries())
      .map(([funder, e]) => ({
        funder,
        organizations: e.orgs.size,
        products: e.products.size,
      }))
      .sort((a, b) => a.funder.localeCompare(b.funder));
  }, [organizations]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? rows.filter((r) => r.funder.toLowerCase().includes(q))
      : rows;
    return [...filtered].sort((a, b) => {
      if (sortKey === "organizations")
        return b.organizations - a.organizations || a.funder.localeCompare(b.funder);
      if (sortKey === "products")
        return b.products - a.products || a.funder.localeCompare(b.funder);
      return a.funder.localeCompare(b.funder);
    });
  }, [rows, query, sortKey]);

  const open = (funder: string) =>
    router.push(`/insights?funders=${toUrlSlug(funder)}&un=1`);

  const th = "px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400";

  return (
    <section id="funders" className="pb-12">
      <h2 className="mb-4 text-base font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        Funders
      </h2>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search funders"
            aria-label="Search funders"
            className="h-9 w-full border-slate-200 bg-white pr-8 pl-9 text-sm dark:border-slate-700 dark:bg-slate-900"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
          <SelectTrigger
            aria-label="Sort funders"
            className="h-9 w-full border-slate-200 bg-white text-sm dark:border-slate-700 dark:bg-slate-900 sm:w-[200px]"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th className={`${th} text-left`}>Funder</th>
              <th className={`${th} text-left`}>Type</th>
              <th className={`${th} text-right`}>Organizations</th>
              <th className={`${th} text-right`}>Products</th>
              <th className={`${th} text-right`}>Est. data funding</th>
              <th className={`${th} text-left`}>Status</th>
            </tr>
          </thead>
          <tbody>
            {organizations === null
              ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                    <td colSpan={6} className="px-4 py-3">
                      <div className="h-4 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
                    </td>
                  </tr>
                ))
              : visible.length === 0
                ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        No funders match &quot;{query.trim()}&quot;.
                      </td>
                    </tr>
                  )
                : visible.map((row) => {
                  const ph = getFunderPlaceholderFields(row.funder);
                  return (
                    <tr
                      key={row.funder}
                      role="link"
                      tabIndex={0}
                      onClick={() => open(row.funder)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          open(row.funder);
                        }
                      }}
                      className="cursor-pointer border-b border-slate-100 transition-colors last:border-b-0 hover:bg-[var(--brand-bg-lighter)] focus-visible:bg-[var(--brand-bg-lighter)] focus-visible:outline-none dark:border-slate-800 dark:hover:bg-slate-800 dark:focus-visible:bg-slate-800"
                    >
                      <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">
                        {row.funder}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                        {ph.type}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {row.organizations}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {row.products}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 dark:text-slate-300">
                        {ph.estDataFunding}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-400 dark:text-slate-500">
                        {ph.status}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
