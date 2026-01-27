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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          IATI Projects ({activities.length})
        </h3>
        <Badge variant="outline" className="text-xs">
          from iatistandard.org
        </Badge>
      </div>

      <div className="space-y-3">
        {activities.slice(0, 20).map((activity, index) => (
          <Collapsible key={activity.iati_identifier || index}>
            <Card className="p-4">
              <CollapsibleTrigger className="w-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 text-left">
                    <div className="flex items-start gap-2">
                      <h4 className="leading-tight font-medium">
                        {getTitle(activity)}
                      </h4>
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                    </div>
                    <div className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
                      {activity.budget_value && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(activity.budget_value)}
                        </span>
                      )}
                      {activity.activity_status_code &&
                        getStatusBadge(activity.activity_status_code)}
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="mt-4 space-y-3">
                  <Separator />

                  {getDescription(activity) && (
                    <p className="text-muted-foreground text-sm">
                      {getDescription(activity)}
                    </p>
                  )}

                  <div className="grid gap-2 text-sm">
                    {activity.sector_narrative && (
                      <div>
                        <span className="font-medium">Sectors: </span>
                        <span className="text-muted-foreground">
                          {Array.isArray(activity.sector_narrative)
                            ? activity.sector_narrative.join(", ")
                            : activity.sector_narrative}
                        </span>
                      </div>
                    )}

                    {activity.recipient_country_code && (
                      <div>
                        <span className="font-medium">Countries: </span>
                        <span className="text-muted-foreground">
                          {Array.isArray(activity.recipient_country_code)
                            ? activity.recipient_country_code.join(", ")
                            : activity.recipient_country_code}
                        </span>
                      </div>
                    )}

                    {activity.activity_date_iso_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span className="text-muted-foreground">
                          {Array.isArray(activity.activity_date_iso_date)
                            ? activity.activity_date_iso_date[0]
                            : activity.activity_date_iso_date}
                        </span>
                      </div>
                    )}

                    <div className="mt-2">
                      <a
                        href={`https://d-portal.org/q.html?aid=${activity.iati_identifier}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary inline-flex items-center gap-1 text-xs hover:underline"
                      >
                        View on D-Portal
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))}

        {activities.length > 20 && (
          <p className="text-muted-foreground text-center text-sm">
            Showing 20 of {activities.length} projects
          </p>
        )}
      </div>
    </div>
  );
}
