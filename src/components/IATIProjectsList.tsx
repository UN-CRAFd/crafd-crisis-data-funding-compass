"use client";

import { IATIActivity, IATITransaction } from "@/types/iati";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ExternalLink, Calendar, DollarSign } from "lucide-react";

interface IATIProjectsListProps {
  activities: IATIActivity[];
  orgName: string;
}

export function IATIProjectsList({
  activities,
  orgName,
}: IATIProjectsListProps) {
  if (!activities || activities.length === 0) {
    return null;
  }

  const formatCurrency = (value: number | number[] | undefined) => {
    if (!value) return "N/A";
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

  const getDescription = (activity: IATIActivity) => {
    if (Array.isArray(activity.description_narrative)) {
      return activity.description_narrative[0];
    }
    return activity.description_narrative;
  };

  const getStatusBadge = (code: string | undefined) => {
    if (!code) return null;
    const statusMap: Record<string, { label: string; variant: any }> = {
      "1": { label: "Pipeline", variant: "outline" },
      "2": { label: "Active", variant: "default" },
      "3": { label: "Completed", variant: "secondary" },
      "4": { label: "Suspended", variant: "destructive" },
      "5": { label: "Cancelled", variant: "destructive" },
    };
    const status = statusMap[code] || { label: code, variant: "outline" };
    return <Badge variant={status.variant}>{status.label}</Badge>;
  };

  return (
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
                      <h4 className="font-medium leading-tight">
                        {getTitle(activity)}
                      </h4>
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
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
                    <p className="text-sm text-muted-foreground">
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
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
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
          <p className="text-center text-sm text-muted-foreground">
            Showing 20 of {activities.length} projects
          </p>
        )}
      </div>
    </div>
  );
}
