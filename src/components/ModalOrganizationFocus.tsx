import React from 'react';
import { getIconForInvestmentType } from '@/config/investmentTypeIcons';
import { ModalTooltip } from './BaseModal';

// Investment type definitions for tooltips
const INVESTMENT_TYPE_DESCRIPTIONS: Record<string, string> = {
    'Data Sets & Commons': 'Shared data repositories and standardized datasets that enable analysis and decision-making across the humanitarian sector.',
    'Infrastructure & Platforms': 'Technical systems, tools, and platforms that support data collection, storage, processing, and sharing.',
    'Crisis Analytics & Insights': 'Analysis, modeling, and insights derived from data to inform humanitarian response and preparedness.',
    'Human Capital & Know-how': 'Training, capacity building, and expertise development for humanitarian data practitioners.',
    'Standards & Coordination': 'Common standards, protocols, and coordination mechanisms for humanitarian data management.',
    'Learning & Exchange': 'Knowledge sharing, communities of practice, and collaborative learning initiatives.'
};

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
        <div className="mt-4">
            <SubHeader>Organization Focus</SubHeader>
            <div className="flex flex-wrap gap-2">
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
                                className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full"
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
