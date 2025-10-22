import React from 'react';

interface ModalOrganizationFocusProps {
    projects: Array<{
        investmentTypes: string[];
    }>;
    SubHeader: React.ComponentType<{ children: React.ReactNode }>;
}

const ModalOrganizationFocus: React.FC<ModalOrganizationFocusProps> = ({ projects, SubHeader }) => {
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
                {investmentTypeCounts.map(({ type, count }) => (
                    <span
                        key={type}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-50 text-indigo-700"
                    >
                        <span>{type}</span>
                        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold rounded-full bg-indigo-200 text-indigo-800">
                            {count}
                        </span>
                    </span>
                ))}
            </div>
        </div>
    );
};

export default ModalOrganizationFocus;
