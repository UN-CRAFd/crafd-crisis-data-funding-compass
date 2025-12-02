import React from 'react';
import { getIconForInvestmentType } from '@/config/investmentTypeIcons';
import { INVESTMENT_TYPE_DESCRIPTIONS } from '@/config/tooltipDescriptions';
import { ModalTooltip } from './BaseModal';

interface ModalOrganizationFocusProps {
    projects: Array<{
        investmentTypes: string[];
    }>;
    SubHeader: React.ComponentType<{ children: React.ReactNode }>;
    onTypeClick?: (type: string) => void;
    tooltipContainer?: Element | null;
}

const ModalOrganizationFocus: React.FC<ModalOrganizationFocusProps> = ({ projects, SubHeader, onTypeClick, tooltipContainer }) => {
    // Count investment types across all projects
    const investmentTypeCounts = React.useMemo(() => {
        const counts = new Map<string, number>();
        
        projects.forEach(project => {
            project.investmentTypes.forEach(type => {
                counts.set(type, (counts.get(type) || 0) + 1);
            });
        });
        
        // Convert to array and sort by count (descending), then alphabetically
        return Array.from(counts.entries())
            .sort((a, b) => {
                if (b[1] !== a[1]) return b[1] - a[1]; // Sort by count descending
                return a[0].localeCompare(b[0]); // Then alphabetically
            })
            .map(([type, count]) => ({ type, count }));
    }, [projects]);

    if (investmentTypeCounts.length === 0) return null;

    return (
        <div>  
            
                <div className="flex flex-wrap gap-1 mb-2">
                    {investmentTypeCounts.map(({ type, count }) => {
                        const IconComponent = getIconForInvestmentType(type);
                        const button = (
                            <button
                                onClick={() => onTypeClick?.(type)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold hover:opacity-80 transition-opacity cursor-pointer"
                                style={{
                                    backgroundColor: 'var(--badge-other-bg)',
                                    color: 'var(--badge-other-text)'
                                }}
                            >
                                <IconComponent className="w-4 h-4" />
                                <span>{type}</span>
                                <span 
                                    className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold rounded-full"
                                    style={{
                                        backgroundColor: 'var(--badge-other-text)',
                                        color: 'var(--badge-other-bg)'
                                    }}
                                >
                                    {count}
                                </span>
                            </button>
                        );
                        
                        return (
                            <ModalTooltip 
                                key={type}
                                content={INVESTMENT_TYPE_DESCRIPTIONS[type] || 'Click to filter by this investment type'}
                                side="top"
                                tooltipContainer={tooltipContainer}
                            >
                                {button}
                            </ModalTooltip>
                        );
                    })}
                </div>
            </div>
       
    );
};

export default ModalOrganizationFocus;
