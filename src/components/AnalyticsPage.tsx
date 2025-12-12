'use client';

import { useEffect, useMemo, useState } from 'react';
import PageHeader from '@/components/PageHeader';
import ChartCard from '@/components/ChartCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    DropdownMenu, 
    DropdownMenuCheckboxItem, 
    DropdownMenuContent, 
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Globe, Search, Filter, ChevronDown, Building2, Database, BarChart3, Network } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import labels from '@/config/labels.json';

interface AnalyticsPageProps {
    logoutButton?: React.ReactNode;
}

interface OrganizationData {
    id: string;
    name: string;
    fields: {
        'Provided Data Ecosystem Projects'?: string[];
        'Organization Type'?: string;
        [key: string]: any;
    };
    agencies?: Array<{
        id: string;
        fields: {
            'Country Name'?: string;
            [key: string]: any;
        };
    }>;
    projects?: Array<{
        id: string;
        fields: {
            'Investment Type'?: string;
            [key: string]: any;
        };
    }>;
}

// Helper to get color intensity based on count
const getColorIntensity = (count: number, max: number): string => {
    if (count === 0) return 'bg-slate-50';
    const intensity = Math.min(Math.ceil((count / max) * 5), 5);
    return `bg-amber-${intensity}00`;
};

export default function AnalyticsPage({ logoutButton }: AnalyticsPageProps) {
    const [organizationsData, setOrganizationsData] = useState<OrganizationData[]>([]);
    const [shareSuccess, setShareSuccess] = useState(false);
    const [selectedDonors, setSelectedDonors] = useState<string[]>([]);
    const [donorSearchQuery, setDonorSearchQuery] = useState('');
    const [donorsMenuOpen, setDonorsMenuOpen] = useState(false);
    
    // Extract all available donor countries from data
    const availableDonorCountries = useMemo(() => {
        const donorSet = new Set<string>();
        organizationsData.forEach(org => {
            if (org.agencies && Array.isArray(org.agencies)) {
                org.agencies.forEach((agency: any) => {
                    const countryName = agency.fields?.['Country Name'];
                    if (countryName && typeof countryName === 'string') {
                        donorSet.add(countryName);
                    }
                });
            }
        });
        return Array.from(donorSet).sort();
    }, [organizationsData]);

    useEffect(() => {
        fetch('/data/organizations-nested.json')
            .then(res => res.json())
            .then(data => {
                setOrganizationsData(data);
                // Start with no donors selected
            })
            .catch(err => console.error('Failed to load organizations:', err));
    }, []);

    // Calculate co-financing matrix
    const coFinancingMatrix = useMemo(() => {
        const matrix: Record<string, Record<string, { projects: Set<string>; orgs: Set<string> }>> = {};

        // Initialize matrix
        selectedDonors.forEach(donor1 => {
            matrix[donor1] = {};
            selectedDonors.forEach(donor2 => {
                matrix[donor1][donor2] = { projects: new Set(), orgs: new Set() };
            });
        });

        // Populate matrix with co-financing data
        organizationsData.forEach(org => {
            if (!org.agencies || !Array.isArray(org.agencies)) return;

            // Get all donor countries for this org
            const donorCountries = org.agencies
                .map(a => a.fields?.['Country Name'])
                .filter((name): name is string => typeof name === 'string' && selectedDonors.includes(name));

            // If org has multiple selected donors, it's co-financing
            if (donorCountries.length > 1) {
                const projectIds = org.fields?.['Provided Data Ecosystem Projects'] || [];

                // For each pair of donors
                donorCountries.forEach((donor1, i) => {
                    donorCountries.forEach((donor2, j) => {
                        if (i !== j) {
                            projectIds.forEach(projectId => {
                                matrix[donor1][donor2].projects.add(projectId);
                            });
                            matrix[donor1][donor2].orgs.add(org.id);
                        }
                    });
                });
            }
        });

        return matrix;
    }, [organizationsData, selectedDonors]);

    // Calculate max values for color scaling
    const maxValues = useMemo(() => {
        let maxProjects = 0;
        let maxOrgs = 0;

        selectedDonors.forEach(donor1 => {
            selectedDonors.forEach(donor2 => {
                if (donor1 !== donor2) {
                    const projectCount = coFinancingMatrix[donor1]?.[donor2]?.projects.size || 0;
                    const orgCount = coFinancingMatrix[donor1]?.[donor2]?.orgs.size || 0;
                    maxProjects = Math.max(maxProjects, projectCount);
                    maxOrgs = Math.max(maxOrgs, orgCount);
                }
            });
        });

        return { maxProjects, maxOrgs };
    }, [coFinancingMatrix, selectedDonors]);

    // Calculate organization types chart data
    const organizationTypesData = useMemo(() => {
        const typeCount: Record<string, number> = {};
        
        organizationsData.forEach(org => {
            if (!org.agencies || !Array.isArray(org.agencies)) return;
            
            const donorCountries = org.agencies
                .map(a => a.fields?.['Country Name'])
                .filter((name): name is string => typeof name === 'string' && selectedDonors.includes(name));
            
            if (donorCountries.length > 0) {
                const orgType = org.fields?.['Organization Type'] || 'Unknown';
                typeCount[orgType] = (typeCount[orgType] || 0) + 1;
            }
        });

        return Object.entries(typeCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }, [organizationsData, selectedDonors]);

    // Calculate project types chart data
    const projectTypesData = useMemo(() => {
        const typeCount: Record<string, number> = {};
        
        organizationsData.forEach(org => {
            if (!org.agencies || !Array.isArray(org.agencies)) return;
            
            const donorCountries = org.agencies
                .map(a => a.fields?.['Country Name'])
                .filter((name): name is string => typeof name === 'string' && selectedDonors.includes(name));
            
            if (donorCountries.length > 0 && org.projects) {
                org.projects.forEach(project => {
                    const projectType = project.fields?.['Investment Type'] || 'Unknown';
                    typeCount[projectType] = (typeCount[projectType] || 0) + 1;
                });
            }
        });

        return Object.entries(typeCount)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [organizationsData, selectedDonors]);

    // Calculate donor co-financing chart data - show pairs of donors
    const donorCoFinancingData = useMemo(() => {
        const pairCounts: Array<{ name: string; value: number }> = [];

        // Create pairs and count co-financed orgs
        selectedDonors.forEach((donor1, i) => {
            selectedDonors.forEach((donor2, j) => {
                if (i < j) { // Only count each pair once
                    const count = coFinancingMatrix[donor1]?.[donor2]?.orgs.size || 0;
                    if (count > 0) {
                        pairCounts.push({
                            name: `${donor1} & ${donor2}`,
                            value: count
                        });
                    }
                }
            });
        });

        return pairCounts
            .sort((a, b) => b.value - a.value)
            .slice(0, 15);
    }, [coFinancingMatrix, selectedDonors]);

    const handleShare = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url).then(() => {
            setShareSuccess(true);
            setTimeout(() => {
                setShareSuccess(false);
            }, 2000);
        });
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <PageHeader 
                logoutButton={logoutButton}
                onShare={handleShare}
                shareSuccess={shareSuccess}
            />
            
            {/* Main Content */}
            <div className="max-w-[82rem] mx-auto px-4 sm:px-6 lg:px-8 py-0 sm:py-0 pt-20 sm:pt-24">
                <div className="space-y-4 sm:space-y-4">

                    {/* Hero Section - Title Box */}
                    <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[var(--brand-bg-lighter)] to-[var(--brand-bg-light)] p-6 sm:p-8 border-none">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <BarChart3 className="w-8 h-8" style={{ color: 'var(--brand-primary)' }} />
                                <h1 className="text-3xl sm:text-4xl font-bold font-qanelas-subtitle" style={{ color: 'black' }}>
                                    Analytics
                                </h1>
                            </div>
                            <p className="text-base sm:text-lg text-slate-700 max-w-3xl leading-relaxed">
                                Explore co-financing relationships and funding patterns across the crisis data ecosystem
                            </p>
                        </div>
                    </div>

                    {/* Donor Selection Card */}
                    <Card className="!border-0 bg-white">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <SectionHeader icon={<Filter style={{ color: 'var(--brand-primary)' }} />} title="Filter Donors" />
                            </div>
                            <DropdownMenu onOpenChange={(open) => setDonorsMenuOpen(open)}>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="outline"
                                        className={`w-full h-10 justify-between font-medium transition-all ${
                                            selectedDonors.length > 0
                                                ? 'border-[var(--brand-primary)] bg-[var(--brand-bg-lighter)] text-[var(--brand-primary)] hover:bg-[var(--brand-bg-light)]'
                                                : 'bg-slate-50/50 border-slate-200 hover:bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                            <Globe className="h-4 w-4 shrink-0" />
                                            <span className="truncate">
                                                {selectedDonors.length === 0
                                                    ? 'Select donors to analyze'
                                                    : selectedDonors.length === 1
                                                    ? selectedDonors[0]
                                                    : `${selectedDonors.length} donors selected`}
                                            </span>
                                        </div>
                                        <ChevronDown
                                            className={`ml-2 h-4 w-4 opacity-50 shrink-0 transform transition-transform ${
                                                donorsMenuOpen ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="start"
                                    side="bottom"
                                    sideOffset={4}
                                    className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto bg-white border border-slate-200 shadow-lg"
                                    onCloseAutoFocus={(e) => e.preventDefault()}
                                >
                                    {/* Search Input */}
                                    <div className="p-2">
                                        <div className="relative">
                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                            <Input
                                                placeholder="Search donors..."
                                                value={donorSearchQuery}
                                                onChange={(e) => setDonorSearchQuery(e.target.value)}
                                                className="h-7 pl-7 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                                                onKeyDown={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </div>

                                    {selectedDonors.length > 0 && (
                                        <>
                                            <DropdownMenuLabel className="text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1.5">
                                                <Filter className="h-3 w-3" />
                                                {selectedDonors.length} selected
                                            </DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}

                                    <div className="max-h-[200px] overflow-y-auto">
                                        {availableDonorCountries
                                            .filter((donor) => donor.toLowerCase().includes(donorSearchQuery.toLowerCase()))
                                            .map((donor) => (
                                                <DropdownMenuCheckboxItem
                                                    key={donor}
                                                    checked={selectedDonors.includes(donor)}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            setSelectedDonors(Array.from(new Set([...selectedDonors, donor])));
                                                        } else {
                                                            setSelectedDonors(selectedDonors.filter((d) => d !== donor));
                                                        }
                                                    }}
                                                    onSelect={(e) => e.preventDefault()}
                                                    className="cursor-pointer"
                                                >
                                                    {donor}
                                                </DropdownMenuCheckboxItem>
                                            ))}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </CardContent>
                    </Card>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <ChartCard
                            title="Co-Financing Donors"
                            icon={<Globe style={{ color: 'var(--brand-primary)' }} />}
                            data={donorCoFinancingData}
                            barColor="var(--brand-primary-lighter)"
                            footnote={`Showing donors with co-financed organizations based on ${selectedDonors.length} selected donor${selectedDonors.length === 1 ? '' : 's'}`}
                        />
                        <ChartCard
                            title={labels.sections.organizationTypes}
                            icon={<Building2 style={{ color: 'var(--brand-primary)' }} />}
                            data={organizationTypesData}
                            barColor="var(--brand-primary-lighter)"
                        />
                        <ChartCard
                            title={labels.sections.projectCategories}
                            icon={<Database style={{ color: 'var(--brand-primary)' }} />}
                            data={projectTypesData}
                            barColor="var(--brand-primary-lighter)"
                        />
                    </div>

                    {/* Co-Financing Matrices - Side by Side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card className="!border-0 bg-white">
                            <CardHeader className="pb-0 h-6.5">
                                <CardTitle>
                                    <SectionHeader icon={<Network style={{ color: 'var(--brand-primary)' }} />} title="Projects Co-Financing Matrix" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <p className="text-sm text-slate-600 mb-4">
                                    Number of projects co-financed between donor pairs
                                </p>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-2 text-left text-xs font-semibold text-slate-600 border-b-2 border-slate-200 min-w-[120px]">
                                                Donor
                                            </th>
                                            {selectedDonors.map(donor => (
                                                <th 
                                                    key={donor} 
                                                    className="p-2 text-center text-xs font-semibold text-slate-600 border-b-2 border-slate-200 w-16"
                                                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                                >
                                                    {donor}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedDonors.map(donor1 => (
                                            <tr key={donor1}>
                                                <td className="p-2 text-xs font-semibold text-slate-600 border-r-2 border-slate-200">
                                                    {donor1}
                                                </td>
                                                {selectedDonors.map(donor2 => {
                                                    const count = coFinancingMatrix[donor1]?.[donor2]?.projects.size || 0;
                                                    const isDiagonal = donor1 === donor2;
                                                    
                                                    return (
                                                        <td 
                                                            key={donor2}
                                                            className={`p-3 text-center text-sm font-semibold border border-slate-200 ${
                                                                isDiagonal 
                                                                    ? 'bg-slate-200 text-slate-400' 
                                                                    : `${getColorIntensity(count, maxValues.maxProjects)} ${count > 0 ? 'text-slate-800' : 'text-slate-400'}`
                                                            }`}
                                                        >
                                                            {isDiagonal ? '—' : count}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                        <Card className="!border-0 bg-white">
                            <CardHeader className="pb-0 h-6.5">
                                <CardTitle>
                                    <SectionHeader icon={<Network style={{ color: 'var(--brand-primary)' }} />} title="Organizations Co-Financing Matrix" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <p className="text-sm text-slate-600 mb-4">
                                    Number of organizations co-financed between donor pairs
                                </p>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-2 text-left text-xs font-semibold text-slate-600 border-b-2 border-slate-200 min-w-[120px]">
                                                Donor
                                            </th>
                                            {selectedDonors.map(donor => (
                                                <th 
                                                    key={donor} 
                                                    className="p-2 text-center text-xs font-semibold text-slate-600 border-b-2 border-slate-200 w-16"
                                                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                                >
                                                    {donor}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedDonors.map(donor1 => (
                                            <tr key={donor1}>
                                                <td className="p-2 text-xs font-semibold text-slate-600 border-r-2 border-slate-200">
                                                    {donor1}
                                                </td>
                                                {selectedDonors.map(donor2 => {
                                                    const count = coFinancingMatrix[donor1]?.[donor2]?.orgs.size || 0;
                                                    const isDiagonal = donor1 === donor2;
                                                    
                                                    return (
                                                        <td 
                                                            key={donor2}
                                                            className={`p-3 text-center text-sm font-semibold border border-slate-200 ${
                                                                isDiagonal 
                                                                    ? 'bg-slate-200 text-slate-400' 
                                                                    : `${getColorIntensity(count, maxValues.maxOrgs)} ${count > 0 ? 'text-slate-800' : 'text-slate-400'}`
                                                            }`}
                                                        >
                                                            {isDiagonal ? '—' : count}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                        </Card>
                    </div>

                    {/* Legend */}
                    <Card className="!border-0 bg-white">
                        <CardContent className="p-6">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Color Scale Legend</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-slate-600">Low</span>
                                <div className="flex gap-1">
                                    <div className="w-8 h-8 bg-amber-100 border border-slate-200"></div>
                                    <div className="w-8 h-8 bg-amber-200 border border-slate-200"></div>
                                    <div className="w-8 h-8 bg-amber-300 border border-slate-200"></div>
                                    <div className="w-8 h-8 bg-amber-400 border border-slate-200"></div>
                                    <div className="w-8 h-8 bg-amber-500 border border-slate-200"></div>
                                </div>
                                <span className="text-xs text-slate-600">High</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-3">
                                Darker colors indicate higher numbers of co-financed projects or organizations between donor pairs.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 mt-8 sm:mt-16">
                <div className="max-w-[82rem] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
                    <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-2 sm:gap-0">
                        <div className="text-center flex-1">
                            <p className="text-xs sm:text-sm text-slate-600">
                                {labels.footer.dataGatheredBy}{' '}
                                <a
                                    href="https://crafd.io"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-medium hover:underline"
                                    style={{ color: 'var(--brand-primary)' }}
                                >
                                    {labels.footer.organization}
                                </a>
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                                {labels.footer.copyright.replace('{year}', new Date().getFullYear().toString())}
                            </p>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
