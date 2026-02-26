import React from "react";
import { getIconForInvestmentType } from "@/config/investmentTypeIcons";
import { INVESTMENT_TYPE_DESCRIPTIONS } from "@/config/tooltipDescriptions";
import labels from "@/config/labels.json";
import { ModalTooltip } from "./BaseModal";

interface ModalOrganizationFocusProps {
  projects: Array<{ investmentTypes: string[] }>;
  onTypeClick?: (type: string) => void;
  tooltipContainer?: Element | null;
}

const ModalOrganizationFocus: React.FC<ModalOrganizationFocusProps> = ({
  projects,
  onTypeClick,
  tooltipContainer,
}) => {
  const investmentTypeCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    projects.forEach((project) => {
      project.investmentTypes.forEach((type) => {
        counts.set(type, (counts.get(type) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([type, count]) => ({ type, count }));
  }, [projects]);

  if (investmentTypeCounts.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-0.5 sm:gap-2">
      {investmentTypeCounts.map(({ type, count }) => {
        const IconComponent = getIconForInvestmentType(type);
        return (
          <ModalTooltip
            key={type}
            content={INVESTMENT_TYPE_DESCRIPTIONS[type] || labels.modals.clickToFilterByType}
            side="top"
            tooltipContainer={tooltipContainer}
          >
            <button
              onClick={() => onTypeClick?.(type)}
              className="inline-flex cursor-pointer items-center gap-1 p-0 text-xs font-medium leading-none text-slate-700 transition-opacity hover:opacity-60"
            >
              <IconComponent className="h-4 w-4" />
              <span className="truncate">{type}</span>
              <span className="text-slate-400">({count})</span>
            </button>
          </ModalTooltip>
        );
      })}
    </div>
  );
};

export default ModalOrganizationFocus;
