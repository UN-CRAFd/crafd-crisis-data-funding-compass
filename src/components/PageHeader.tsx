"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  TooltipContent,
  TooltipProvider,
  Tooltip as TooltipUI,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Info,
  Menu,
  BookOpen,
  Compass,
} from "lucide-react";
import labels from "@/config/labels.json";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const STYLES = {
  chartTooltip: {
    backgroundColor: "var(--tooltip-bg)",
    color: "var(--chart-text-color)",
    border: "1px solid var(--tooltip-border)",
    borderRadius: "8px",
    padding: "12px",
  },
};

export default function PageHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isCompassRotating, setIsCompassRotating] = useState(false);

  // Fetch last updated date from API
  useEffect(() => {
    fetch("/api/last-updated")
      .then((res) => res.json())
      .then((data) => setLastUpdated(data.lastUpdated))
      .catch((error) => {
        console.error("Failed to fetch last updated date:", error);
      });
  }, []);

  const handleCompassClick = () => {
    setIsCompassRotating(true);
    setTimeout(() => setIsCompassRotating(false), 1000);
  };

  return (
    <div className="fixed top-0 right-0 left-0 z-50 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto max-w-[82rem] px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <button
                onClick={handleCompassClick}
                className="block shrink-0 transition-transform duration-500 focus:outline-none"
                aria-label="Compass"
              >
                <Compass
                  className={`h-7 w-7 text-[var(--brand-primary)] ${
                    isCompassRotating ? "animate-compass-spin" : ""
                  }`}
                />
              </button>
              <h1 className="flex min-w-0 flex-col items-start gap-0 text-base text-slate-800 dark:text-white sm:text-xl lg:flex-row lg:items-center lg:gap-2 lg:text-3xl">
                <span className="qanelas-title whitespace-nowrap">
                  {labels.header.title}
                </span>
                <span className="font-roboto whitespace-nowrap">
                  {labels.header.subtitle}
                </span>
              </h1>
            </div>
            <TooltipProvider>
              <TooltipUI>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 cursor-help text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" />
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="center"
                  className="max-w-115 rounded-lg border border-slate-200 bg-white p-1 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                  sideOffset={6}
                  avoidCollisions={true}
                  style={{ ...STYLES.chartTooltip }}
                >
                  <p className="leading-relaxed">{labels.header.betaTooltip}</p>
                  {lastUpdated && (
                    <p className="mt-2 border-t border-slate-200 pt-2 text-slate-600 dark:border-slate-700 dark:text-slate-400">
                      Last updated:{" "}
                      <span className="font-semibold">{lastUpdated}</span>
                    </p>
                  )}
                </TooltipContent>
              </TooltipUI>
            </TooltipProvider>
          </div>
          <div className="flex flex-shrink-0 items-center gap-1 sm:gap-2">
            {/* Inline nav links — visible on desktop */}
            <nav className="hidden items-center gap-0.5 sm:flex">
              {[
                { href: "/", label: "Home" },
                { href: "/explore", label: "Explore" },
                { href: "/insights", label: "Insights" },
              ].map(({ href, label }) => {
                const isActive =
                  pathname === href ||
                  (href === "/explore" && pathname.startsWith("/explore")) ||
                  (href === "/insights" && pathname.startsWith("/insights"));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                      isActive
                        ? "font-semibold text-[var(--brand-primary)]"
                        : "text-slate-600 hover:text-[var(--brand-primary)] dark:text-slate-300 dark:hover:text-[var(--brand-primary)]"
                    }`}
                  >
                    {label}
                  </Link>
                );
              })}
            </nav>

            <div className="hidden h-8 w-px bg-slate-200 dark:bg-slate-700 sm:block" />

            {/* Menu — Methodology only */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-md bg-transparent px-3 py-4 text-xs text-slate-700 transition hover:text-[var(--brand-primary)] dark:text-slate-300 dark:hover:text-[var(--brand-primary)] sm:text-sm"
                  title="More"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={4}
                className="w-auto min-w-[160px] border border-slate-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
              >
                <DropdownMenuItem
                  onClick={() => router.push("/methodology/")}
                  className={`cursor-pointer px-2 py-2 text-sm ${pathname === "/methodology/" || pathname === "/methodology" ? "bg-slate-100 dark:bg-slate-700" : ""}`}
                >
                  <div className="flex items-center">
                    <BookOpen className="mr-2 h-3 w-3 text-slate-600 dark:text-slate-400" />
                    <span
                      className={
                        pathname === "/methodology/" || pathname === "/methodology"
                          ? "!font-bold"
                          : ""
                      }
                    >
                      {labels.header.methodology}
                    </span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
