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
  ChevronDown,
  FileDown,
  Info,
  MessageCircle,
  Share2,
  Menu,
  Lightbulb,
  LogOut,
  Home,
  BarChart3,
  BookOpen,
  Landmark,
  UserRoundPlus,
  LayoutDashboard,
  Compass
} from "lucide-react";
import { useTips } from "@/contexts/TipsContext";
import { useGeneralContributions } from "@/contexts/GeneralContributionsContext";
import { setGeneralContributionsEnabled } from "@/lib/data";
import labels from "@/config/labels.json";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const STYLES = {
  chartTooltip: {
    backgroundColor: "#FFFFFF",
    color: "#333333",
    border: "1px solid #CBD5E1",
    borderRadius: "8px",
    padding: "12px",
  },
};

interface PageHeaderProps {
  onShare?: () => void;
  shareSuccess?: boolean;
  onExportCSV?: () => void;
  onExportXLSX?: () => void;
  csvExportLoading?: boolean;
  xlsxExportLoading?: boolean;
  pdfExportLoading?: boolean;
  exportMenuOpen?: boolean;
  onExportMenuChange?: (open: boolean) => void;
}

export default function PageHeader({
  onShare,
  shareSuccess = false,
  onExportCSV,
  onExportXLSX,
  csvExportLoading = false,
  xlsxExportLoading = false,
  pdfExportLoading = false,
  exportMenuOpen = false,
  onExportMenuChange,
}: PageHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch last updated date from API
  useEffect(() => {
    fetch("/api/last-updated")
      .then((res) => res.json())
      .then((data) => setLastUpdated(data.lastUpdated))
      .catch((error) => {
        console.error("Failed to fetch last updated date:", error);
      });
  }, []);

  // Safely use useTips with fallback defaults
  let tipsEnabled = false;
  let setTipsEnabled: (enabled: boolean) => void = () => {};
  try {
    const tipsContext = useTips();
    tipsEnabled = tipsContext.tipsEnabled;
    setTipsEnabled = tipsContext.setTipsEnabled;
  } catch (e) {
    // TipsProvider not available (e.g., during prerendering)
    // Use default values
  }

  // Use General Contributions context - will render without provider as fallback
  let showGeneralContributions = true;
  let setShowGeneralContributionsLocal: (enabled: boolean) => void = () => {};

  try {
    const genContContext = useGeneralContributions();
    showGeneralContributions = genContContext.showGeneralContributions;
    setShowGeneralContributionsLocal =
      genContContext.setShowGeneralContributions;
  } catch (e) {
    // GeneralContributionsProvider not available - use defaults
  }

  const handleGeneralContributionsToggle = () => {
    const newValue = !showGeneralContributions;
    setShowGeneralContributionsLocal(newValue);
    setGeneralContributionsEnabled(newValue);
    // Refresh current route so views update without full page reload
    try {
      router.refresh();
    } catch (e) {
      // Fallback: full reload if router.refresh isn't available
      window.location.reload();
    }
  };

  return (
    <div className="fixed top-0 right-0 left-0 z-50 border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[82rem] px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <Compass className="hidden sm:block h-7 w-7 text-[var(--brand-primary)]" aria-label="Compass" />
              <h1 className="truncate bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-lg text-transparent sm:text-3xl flex items-center gap-2">
              <span className="qanelas-title">{labels.header.title}</span>{" "}
              <span className="font-roboto">{labels.header.subtitle}</span>
              </h1>
            </div>
            <TooltipProvider>
              <TooltipUI>
                <TooltipTrigger asChild>
                  <div className="hidden cursor-help items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-slate-600 sm:flex">
                    <span className="text-xs font-semibold">
                      {labels.header.betaBadge}
                    </span>
                    <Info className="ml-2 h-3.5 w-3.5 text-slate-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  align="center"
                  className="max-w-115 rounded-lg border border-slate-200 bg-white p-1 text-xs text-slate-800"
                  sideOffset={6}
                  avoidCollisions={true}
                  style={{ ...STYLES.chartTooltip }}
                >
                  <p className="leading-relaxed">{labels.header.betaTooltip}</p>
                  {lastUpdated && (
                    <p className="mt-2 border-t border-slate-200 pt-2 text-slate-600">
                      Last updated: <span className="font-semibold">{lastUpdated}</span>
                    </p>
                  )}
                </TooltipContent>
              </TooltipUI>
            </TooltipProvider>
          </div>
          <div className="flex flex-shrink-0 gap-1 sm:gap-2">
            {/* Tips moved into Settings (see navigation menu) */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                window.open(
                  "https://airtable.com/apprObB2AsvMwfAAl/pagcre1SPjT0nJxa4/form",
                  "_blank",
                )
              }
              className="rounded-md bg-transparent px-4 py-4 text-xs text-slate-700 transition hover:text-[var(--brand-primary)] focus:text-[var(--brand-primary)] active:text-[var(--brand-primary)] sm:text-sm"
              title={labels.header.feedbackTooltip}
            >
              <MessageCircle className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">
                {labels.header.feedbackButton}
              </span>
            </Button>
            {pathname === "/" && (
              <div className="hidden h-8 w-px bg-slate-200 sm:block"></div>
            )}

            {/* Export Dropdown - only show on dashboard */}
            {pathname === "/" && onExportCSV && onExportXLSX && (
              <DropdownMenu onOpenChange={onExportMenuChange}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={
                      csvExportLoading || xlsxExportLoading || pdfExportLoading
                    }
                    className="hidden rounded-md bg-transparent px-4 py-4 text-xs text-slate-700 transition hover:text-[var(--brand-primary)] focus:text-[var(--brand-primary)] sm:flex sm:text-sm"
                    title="Export current view"
                  >
                    <FileDown className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">
                      {csvExportLoading
                        ? labels.header.exportingCsv
                        : xlsxExportLoading
                          ? labels.header.exportingXlsx
                          : pdfExportLoading
                            ? labels.header.exportingPdf
                            : labels.header.exportView}
                    </span>
                    <ChevronDown
                      className={`ml-1.5 h-4 w-4 shrink-0 transform opacity-50 transition-transform ${
                        exportMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  side="bottom"
                  sideOffset={4}
                  className="w-auto min-w-[200px] border border-slate-200 bg-white shadow-lg"
                >
                  <DropdownMenuItem
                    onClick={onExportCSV}
                    disabled={
                      csvExportLoading || xlsxExportLoading || pdfExportLoading
                    }
                    className="cursor-pointer py-2 text-[11px]"
                  >
                    <FileDown className="mr-2 h-3 w-3" />
                    {labels.header.exportMenuCsv}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onExportXLSX}
                    disabled={
                      csvExportLoading || xlsxExportLoading || pdfExportLoading
                    }
                    className="cursor-pointer py-2 text-[11px]"
                  >
                    <FileDown className="mr-2 h-3 w-3" />
                    {labels.header.exportMenuXlsx}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <div className="hidden h-8 w-px bg-slate-200 sm:block"></div>
            {/* Share Button */}
            {onShare && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onShare}
                className={`rounded-md px-4 py-4 text-xs transition-all duration-200 sm:text-sm ${
                  shareSuccess
                    ? "bg-[#10b981] text-white hover:bg-[#059669] hover:text-white"
                    : "bg-transparent text-slate-700 hover:text-[var(--brand-primary)]"
                }`}
                title={labels.ui.copyToClipboard}
              >
                <Share2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">
                  {shareSuccess
                    ? labels.header.shareButtonSuccess
                    : labels.header.shareButton}
                </span>
              </Button>
            )}

            {/* Vertical line separator */}
            <div className="hidden h-8 w-px bg-slate-200 sm:block"></div>

            {/* Page Navigation Menu - Rightmost */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-md bg-transparent px-4 py-4 text-xs text-slate-700 transition hover:text-[var(--brand-primary)] sm:text-sm"
                  title="Navigation"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side="bottom"
                sideOffset={4}
                className="w-auto min-w-[180px] border border-slate-200 bg-white shadow-lg"
              >
                <DropdownMenuItem
                  onClick={() => {
                    const raw = searchParams?.toString() || "";
                    const params = new URLSearchParams(raw);

                    // Ensure dashboard uses short keys expected by the dashboard wrapper
                    // Map long keys to short ones if present
                    if (params.has("types") && !params.has("t")) {
                      params.set("t", params.get("types") || "");
                      params.delete("types");
                    }
                    if (params.has("themes") && !params.has("th")) {
                      params.set("th", params.get("themes") || "");
                      params.delete("themes");
                    }
                    if (params.has("q") && !params.has("search")) {
                      params.set("search", params.get("q") || "");
                    }

                    const target = params.toString()
                      ? `/?${params.toString()}`
                      : "/";
                    router.push(target);
                  }}
                  className={`cursor-pointer px-2 py-2 text-sm ${pathname === "/" ? "bg-slate-100" : ""}`}
                >
                  <div className="flex items-center">
                    <LayoutDashboard className="mr-2 h-3 w-3 text-slate-600" />
                    <span className={pathname === "/" ? "!font-bold" : ""}>
                      {labels.header.dashboard}
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const raw = searchParams?.toString() || "";
                    const params = new URLSearchParams(raw);

                    // Analytics expects 'types' and 'themes' and 'q'
                    if (params.has("t") && !params.has("types")) {
                      params.set("types", params.get("t") || "");
                      // keep 't' for backwards compatibility
                    }
                    if (params.has("th") && !params.has("themes")) {
                      params.set("themes", params.get("th") || "");
                      // keep 'th' as well
                    }
                    if (params.has("search") && !params.has("q")) {
                      params.set("q", params.get("search") || "");
                    }

                    const target = params.toString()
                      ? `/analytics?${params.toString()}`
                      : "/analytics";
                    router.push(target);
                  }}
                  className={`cursor-pointer px-2 py-2 text-sm ${pathname === "/analytics" || pathname === "/analytics/" ? "bg-slate-100" : ""}`}
                >
                  <div className="flex items-center">
                    <BarChart3 className="mr-2 h-3 w-3 text-slate-600" />
                    <span
                      className={
                        pathname === "/analytics" || pathname === "/analytics/"
                          ? "!font-bold"
                          : ""
                      }
                    >
                      Analytics
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => router.push("/methodology/")}
                  className={`cursor-pointer px-2 py-2 text-sm ${pathname === "/methodology/" ? "bg-slate-100" : ""}`}
                >
                  <div className="flex items-center">
                    <BookOpen className="mr-2 h-3 w-3 text-slate-600" />
                    <span
                      className={
                        pathname === "/methodology/" ? "!font-bold" : ""
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
