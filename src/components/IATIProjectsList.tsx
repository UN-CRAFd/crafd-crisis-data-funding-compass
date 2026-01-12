"use client";

import { IATIActivity } from "@/types/iati";
import { DollarSign, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";

interface IATIProjectsListProps {
  activities: IATIActivity[];
  orgName: string;
}

export function IATIProjectsList({
  activities,
  orgName,
}: IATIProjectsListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);

  if (!activities || activities.length === 0) {
    return null;
  }

  const formatCurrency = (value: number | number[] | undefined) => {
    if (!value) return "—";
    const amount = Array.isArray(value) ? value[0] : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(amount);
  };

  const getTitle = (activity: IATIActivity) => {
    if (Array.isArray(activity.title_narrative)) {
      return activity.title_narrative[0] || activity.iati_identifier;
    }
    return activity.title_narrative || activity.iati_identifier;
  };

  const showCollapsible = activities.length > 5;
  const displayedActivities = showCollapsible && !isExpanded
    ? activities.slice(0, 5)
    : activities;

  return (
    <div className="space-y-2">
      {displayedActivities.map((activity) => (
        <button
          key={activity.iati_identifier}
          onClick={() => {
            window.open(
              `https://d-portal.org/q.html?aid=${activity.iati_identifier}`,
              "_blank",
              "noopener,noreferrer"
            );
          }}
          onMouseEnter={() => setHoveredActivityId(activity.iati_identifier)}
          onMouseLeave={() => setHoveredActivityId(null)}
          className="inline-flex w-full cursor-pointer items-center justify-between gap-1.5 rounded-md bg-slate-100 px-3 py-1.5 text-left text-base font-medium text-slate-600 transition-colors hover:bg-slate-200"
        >
          <div className="inline-flex min-w-0 items-center gap-1.5">
            {hoveredActivityId === activity.iati_identifier ? (
              <DollarSign className="h-4 w-4 shrink-0 text-slate-600" />
            ) : (
              <DollarSign className="h-4 w-4 shrink-0 text-slate-600" />
            )}
            <span className="truncate">{getTitle(activity)}</span>
          </div>
          {activity.budget_value && (
            <span className="shrink-0 text-sm font-semibold text-slate-900">
              {formatCurrency(activity.budget_value)}
            </span>
          )}
        </button>
      ))}

      {showCollapsible && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-slate-400"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-4 w-4" />
              <span>Show less</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" />
              <span>Show more ({activities.length - 5} more)</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
