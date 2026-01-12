"use client";

import { IATIActivitySummary } from "@/types/iati";
import { Info } from "lucide-react";
import BaseModal, { ModalTooltip } from "./BaseModal";

interface IATIActivitySummaryProps {
  activitySummary: IATIActivitySummary;
  totalActivities: number;
  storedActivities: number;
  tooltipContainer?: Element | null;
}

export function IATIActivitySummaryCard({
  activitySummary,
  totalActivities,
  storedActivities,
  tooltipContainer,
}: IATIActivitySummaryProps) {
  if (!activitySummary || activitySummary.count === 0) {
    return null;
  }

  const formatCurrency = (value: number) => {
    if (value >= 1_000_000_000)
      return `$${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000)
      return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000)
      return `$${(value / 1_000).toFixed(1)}K`;
    return `$${value}`;
  };

  const activeCount = activitySummary.by_status["2"] || 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-100 p-4 shadow-sm">
      <div className="mt-0 grid grid-cols-[3fr_3fr_3fr_0.2fr] gap-4">
        <div className="flex flex-col">
          <span className="text-sm tracking-wide text-slate-400">
            Budget
          </span>
          <span className="text-base font-medium text-slate-600">
            {activitySummary.total_budget > 0
              ? formatCurrency(activitySummary.total_budget)
              : "—"}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-sm tracking-wide text-slate-400">
            Activities
          </span>
          <span className="text-base font-medium text-slate-600">
            {totalActivities}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-sm tracking-wide text-slate-400">
            Active
          </span>
          <span className="text-base font-medium text-slate-600">
            {activeCount}
          </span>
        </div>

        <div className="flex items-start justify-end">
          <ModalTooltip
            content="Data from the International Aid Transparency Initiative (IATI) standard"
            side="top"
            tooltipContainer={tooltipContainer}
          >
            <Info className="h-4 w-4 cursor-help text-slate-400 hover:text-slate-600" />
          </ModalTooltip>
        </div>
      </div>
    </div>
  );
}
