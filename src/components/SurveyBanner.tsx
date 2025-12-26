"use client";

import React, { useEffect, useState } from "react";
import { X, ExternalLink, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SurveyBannerProps {
  surveyUrl?: string;
}

const SurveyBanner: React.FC<SurveyBannerProps> = ({
  // Default to the requested Airtable form URL unless overridden by env
  surveyUrl = process.env.NEXT_PUBLIC_SURVEY_URL ||
    "https://airtable.com/apprObB2AsvMwfAAl/pagcre1SPjT0nJxa4/form",
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Show banner after 10 seconds
    const showTimer = setTimeout(() => {
      setShouldRender(true);
      // Small delay to trigger CSS transition
      setTimeout(() => setIsVisible(true), 50);
    }, 10000);

    // Auto-hide banner after 30 seconds (10s delay + 20s visible)
    const hideTimer = setTimeout(() => {
      setIsVisible(false);
      // Remove from DOM after animation completes
      setTimeout(() => setShouldRender(false), 300);
    }, 30000);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    // Remove from DOM after animation completes
    setTimeout(() => setShouldRender(false), 300);
  };

  if (!shouldRender) return null;

  return (
    <div
      className={`transform overflow-hidden transition-[opacity,max-height,transform] duration-500 ease-out ${isVisible ? "mb-6 max-h-40 translate-y-0 opacity-100" : "mb-0 max-h-0 -translate-y-4 opacity-0"} `}
    >
      <div
        className="relative rounded-lg p-[1px] shadow-sm transition-all duration-150"
        style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.06)" }}
      >
        <div className="border-var(--brand-primary-light) relative overflow-hidden rounded-lg bg-white">
          <div className="relative flex items-center justify-between gap-4 p-4">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              {/* Simple icon container */}
              <div className="flex-shrink-0">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: "var(--brand-primary)" }}
                >
                  <Megaphone className="h-5 w-5 text-white" />
                </div>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <h3
                  className="font-roboto mb-1 text-base font-bold sm:text-lg"
                  style={{ color: "var(--brand-primary-dark)" }}
                >
                  Share Your Insights!
                </h3>
                <p className="text-xs font-medium text-slate-600 sm:text-sm">
                  Help shape the crisis data ecosystem
                </p>
              </div>

              {/* CTA Button - flat */}
              <Button
                onClick={() => window.open(surveyUrl, "_blank")}
                className="hover:bg-var(--brand-primary-dark) flex items-center gap-2 rounded-md px-4 py-2 text-sm font-normal whitespace-nowrap text-white transition-colors sm:text-base"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                <span className="hidden sm:inline">Take Survey</span>
                <span className="sm:hidden">Survey</span>
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>

            {/* Close button */}
            <button
              onClick={handleClose}
              className="flex-shrink-0 rounded-md p-2 text-slate-500 transition-colors duration-150 hover:text-slate-700"
              aria-label="Close survey banner"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurveyBanner;
