/**
 * Shared StatCard Component
 * Unified statistics card used for displaying metrics across Analytics and Dashboard
 */

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  Tooltip as TooltipUI,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SectionHeader } from "../SectionHeader";
import { useTips } from "@/contexts/TipsContext";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: number | string;
  label: string;
  colorScheme: "amber";
  tooltip?: React.ReactNode | string;
  children?: React.ReactNode;
  onExpandChange?: (expanded: boolean) => void;
}

const STYLES = {
  statCard:
    "border border-[var(--brand-primary-light)]/40 transition-all duration-300 hover:ring-2 hover:ring-slate-300/50",
  chartTooltip: {
    backgroundColor: "var(--tooltip-bg)",
    backdropFilter: "blur(12px)",
    border: "1px solid var(--tooltip-border)",
    borderRadius: "10px",
    fontSize: "12px",
    padding: "8px",
    lineHeight: "0.8",
  },
} as const;

export const StatCard = React.memo(function StatCard({
  icon,
  title,
  value,
  label,
  colorScheme,
  tooltip,
  children,
  onExpandChange,
}: StatCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  let tipsEnabled = false;
  try {
    const tipsContext = useTips();
    tipsEnabled = tipsContext.tipsEnabled;
  } catch (e) {
    tipsEnabled = false;
  }

  const gradients = {
    amber: {
      bg: "from-[var(--brand-bg-lighter)] to-[var(--brand-bg-light)]",
      border: "border-slate-500",
      value: "text-[var(--brand-primary)]",
      label: "text-[var(--brand-primary)]",
    },
  };

  const colors = gradients[colorScheme];

  const handleExpandChange = (expanded: boolean) => {
    setIsExpanded(expanded);
    onExpandChange?.(expanded);
  };

  const cardContent = (
    <Collapsible open={isExpanded} onOpenChange={handleExpandChange}>
      <div className="relative">
        {children || onExpandChange ? (
          <button
            onClick={() => handleExpandChange(!isExpanded)}
            className="w-full text-left"
          >
            <Card
              className={`${STYLES.statCard} bg-gradient-to-br ${colors.bg}`}
            >
              <CardHeader className="mb-5 h-5 pb-0">
                <CardDescription>
                  <div className="flex items-center justify-between">
                    <SectionHeader icon={icon} title={title} />
                    <ChevronDown
                      className={`h-6 w-6 text-slate-500 transition-transform duration-200 ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-baseline gap-2">
                  <div
                    className={`font-mono text-4xl leading-none font-bold tabular-nums sm:text-5xl ${colors.value}`}
                  >
                    {value}
                  </div>
                  <div
                    className={`text-sm leading-none font-medium sm:text-lg ${colors.label}`}
                  >
                    {label}
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>
        ) : (
          <Card className={`${STYLES.statCard} bg-gradient-to-br ${colors.bg}`}>
            <CardHeader className="h-5 pb-0">
              <CardDescription>
                <SectionHeader icon={icon} title={title} />
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-baseline gap-2">
                <div
                  className={`font-mono text-4xl leading-none font-bold tabular-nums sm:text-5xl ${colors.value}`}
                >
                  {value}
                </div>
                <div
                  className={`text-sm leading-none font-medium sm:text-lg ${colors.label}`}
                >
                  {label}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {children && (
          <CollapsibleContent className="absolute top-full right-0 left-0 z-50 mt-2 overflow-hidden rounded-lg border border-[var(--brand-primary-light)]/40 bg-white">
            <CardContent className="p-0">{children}</CardContent>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );

  if (tooltip && tipsEnabled) {
    return (
      <TooltipProvider delayDuration={0}>
        <TooltipUI>
          <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="center"
            className="max-w-100 rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800"
            sideOffset={5}
            avoidCollisions={true}
            style={{ ...STYLES.chartTooltip }}
          >
            {typeof tooltip === "string" ? (
              <p className="leading-relaxed">{tooltip}</p>
            ) : (
              <div className="leading-relaxed">{tooltip}</div>
            )}
          </TooltipContent>
        </TooltipUI>
      </TooltipProvider>
    );
  }

  return cardContent;
});
