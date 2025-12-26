"use client";

import { AlertCircle, RotateCcw, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NoResultsPopupProps {
  onResetFilters?: () => void;
  message?: string;
}

export default function NoResultsPopup({
  onResetFilters,
  message = "No data matches your current filters. Try adjusting your criteria or reset all filters.",
}: NoResultsPopupProps) {
  return (
    <div className="flex items-center justify-center py-12 sm:py-16">
      <div className="mx-4 w-full max-w-sm animate-in rounded-lg border border-slate-200 bg-white shadow-xl duration-200 zoom-in-95 fade-in">
        <div className="flex flex-col items-center p-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <AlertCircle className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="mb-2 text-base font-semibold text-slate-900">
            No Results Found
          </h3>
          <p className="mb-4 text-sm text-slate-600">{message}</p>
          <div className="flex w-full flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (onResetFilters) {
                  onResetFilters();
                }
              }}
              className="flex w-full items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset Filters
            </Button>
            <Button
              size="sm"
              onClick={() =>
                window.open(
                  "https://airtable.com/apprObB2AsvMwfAAl/pagcre1SPjT0nJxa4/form",
                  "_blank",
                )
              }
              className="flex w-full items-center justify-center gap-2 bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-dark)]"
            >
              <MessageSquare className="h-4 w-4" />
              Send Feedback
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
