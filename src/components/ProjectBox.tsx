import React, { memo } from "react";
import { Badge } from "@/components/shared/Badge";
import {
  Tooltip as TooltipUI,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getIconForInvestmentType } from "@/config/investmentTypeIcons";
import { INVESTMENT_TYPE_DESCRIPTIONS } from "@/config/investmentDescriptions";
import type { ProjectData } from "@/types/airtable";

interface ProjectBoxProps {
  project: ProjectData;
  onClick: () => void;
  tipsEnabled: boolean;
  combinedDonors?: string[];
  children?: React.ReactNode;
}

const ProjectBoxComponent: React.FC<ProjectBoxProps> = ({
  project,
  onClick,
  tipsEnabled,
  combinedDonors = [],
  children,
}) => {
  
  return (
    <div
      className="group animate-in cursor-pointer rounded-lg border border-slate-200 bg-white p-3 transition-colors duration-200 fade-in hover:bg-slate-50"
      onClick={onClick}
    >
      <div className={project.donorCountries?.length > 0 || children ? "mb-2" : ""}>
        <div className="flex flex-wrap items-center gap-2 gap-y-1">
          <span className="text-sm sm:text-base font-medium text-slate-900 transition-colors group-hover:text-[var(--badge-other-border)]">
            {project.projectName}
          </span>
          {project.investmentTypes && project.investmentTypes.length > 0 && (
            <div className="flex flex-wrap items-center gap-1">
              {project.investmentTypes.map((type, idx) => {
                const IconComponent = getIconForInvestmentType(type);
                const description = INVESTMENT_TYPE_DESCRIPTIONS[type];
                const badge = (
                  <span
                    key={idx}
                    className="inline-flex cursor-help items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold"
                    style={{
                      backgroundColor: "var(--badge-other-bg)",
                      color: "var(--badge-other-text)",
                    }}
                  >
                    <IconComponent className="h-3.5 w-3.5" />
                    {type}
                  </span>
                );

                if (description && tipsEnabled) {
                  return (
                    <TooltipProvider key={idx}>
                      <TooltipUI delayDuration={200}>
                        <TooltipTrigger asChild>{badge}</TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="!z-[300] max-w-xs border border-gray-200 bg-white/70 text-xs backdrop-blur-md"
                          sideOffset={5}
                        >
                          {description}
                        </TooltipContent>
                      </TooltipUI>
                    </TooltipProvider>
                  );
                }

                return badge;
              })}
            </div>
          )}
        </div>
      </div>
      <div>
        {!children && project.donorCountries && project.donorCountries.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {project.donorCountries.map((country, idx) => (
              <Badge
                key={idx}
                text={country}
                variant={
                  combinedDonors.includes(country) ? "blue" : "slate"
                }
              />
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export const ProjectBox = memo(ProjectBoxComponent);

ProjectBox.displayName = "ProjectBox";

export default ProjectBox;
