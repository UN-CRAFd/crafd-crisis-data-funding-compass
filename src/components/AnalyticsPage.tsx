'use client';

import { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ChevronDown, Globe, Search, Filter } from 'lucide-react';
import labels from '@/config/labels.json';

interface AnalyticsPageProps {
    logoutButton?: React.ReactNode;
}

interface OrganizationData {
    id: string;
    name: string;
    fields: {
        'Provided Data Ecosystem Projects'?: string[];
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
        fields: Record<string, any>;
    }>;
}

const CRAFD_DONORS = [
    'United Nations',
    'Germany',
    'Finland',
    'United Kingdom',
    'Canada',
    'Netherlands',
    'USA',
    'European Union'
];

// Helper to get color intensity based on count
const getColorIntensity = (count: number, max: number): string => {
    if (count === 0) return 'bg-slate-50';
    const intensity = Math.min(Math.ceil((count / max) * 5), 5);
    // Using orange/amber theme from globals.css
    const colors = [
        'bg-amber-100',  // lightest
        'bg-amber-200',
        'bg-amber-300',
        'bg-amber-400',
        'bg-amber-500'   // darkest
    ];
    return colors[intensity - 1];
};

export default function AnalyticsPage({ logoutButton }: AnalyticsPageProps) {
    const [organizationsData, setOrganizationsData] = useState<OrganizationData[]>([]);
    const [shareSuccess, setShareSuccess] = useState(false);
    const [selectedDonors, setSelectedDonors] = useState<string[]>(CRAFD_DONORS);
    const [donorSearchQuery, setDonorSearchQuery] = useState('');
    const [donorsMenuOpen, setDonorsMenuOpen] = useState(false);

    useEffect(() => {
        fetch('/data/organizations-nested.json')
            .then(res => res.json())
            .then(data => setOrganizationsData(data))
            .catch(err => console.error('Error loading organizations data:', err));
    }, []);

    // Calculate co-financing matrix
    const coFinancingMatrix = useMemo(() => {
        const matrix: { [key: string]: { [key: string]: { projects: Set<string>, orgs: Set<string> } } } = {};
        
        // Initialize matrix with selected donors only
        selectedDonors.forEach(donor1 => {
            matrix[donor1] = {};
            selectedDonors.forEach(donor2 => {
                matrix[donor1][donor2] = { projects: new Set(), orgs: new Set() };
            });
        });

        // Process each organization
        organizationsData.forEach(org => {
            // Get donor countries from agencies
            const donorCountries = (org.agencies || [])
                .map(agency => agency.fields['Country Name'])
                .filter((country): country is string => !!country);
            
            const projects = org.fields['Provided Data Ecosystem Projects'] || [];
            
            // Filter to only selected CRAFD donors
            const crafdDonorsForOrg = donorCountries.filter(country => 
                selectedDonors.includes(country)
            );

            // If this org has multiple CRAFD donors, it's a co-financing case
            if (crafdDonorsForOrg.length > 1) {
                crafdDonorsForOrg.forEach(donor1 => {
                    crafdDonorsForOrg.forEach(donor2 => {
                        // Add organization
                        matrix[donor1][donor2].orgs.add(org.id);
                        
                        // Add all projects from this organization
                        projects.forEach(project => {
                            matrix[donor1][donor2].projects.add(project);
                        });
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
                    const count = coFinancingMatrix[donor1]?.[donor2];
                    if (count) {
                        maxProjects = Math.max(maxProjects, count.projects.size);
                        maxOrgs = Math.max(maxOrgs, count.orgs.size);
                    }
                }
            });
        });

        return { maxProjects, maxOrgs };
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
            
            <div className="max-w-[82rem] mx-auto px-4 sm:px-6 lg:px-8 py-0 sm:py-0 pt-20 sm:pt-24">
                <div className="space-y-6">
                    {/* Page Title */}
                    <div className="mb-6">
                        <h1 className="text-3xl font-roboto font-black text-slate-800 mb-2">
                            CRAFD Donor Co-Financing Analytics
                        </h1>
                        <p className="text-base text-slate-600">
                            Analysis of how CRAFD donor partners co-finance organizations and projects together
                        </p>
                    </div>

                    {/* Donor Selection */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="space-y-3">
                                <h3 className="text-sm font-semibold text-slate-700">Select Donors to Compare</h3>
                                <DropdownMenu onOpenChange={(open) => setDonorsMenuOpen(open)}>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className={`w-full sm:w-96 h-10 justify-between font-medium transition-all ${
                                                selectedDonors.length > 0 && selectedDonors.length < CRAFD_DONORS.length
                                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-bg-lighter)] text-[var(--brand-primary)] hover:bg-[var(--brand-bg-light)]'
                                                    : 'bg-slate-50/50 border-slate-200 hover:bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                <Globe className="h-4 w-4 shrink-0" />
                                                <span className="truncate">
                                                    {selectedDonors.length === CRAFD_DONORS.length
                                                        ? 'All CRAFD Donors'
                                                        : selectedDonors.length === 0
                                                        ? 'Select donors'
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

                                        {selectedDonors.length > 0 && selectedDonors.length < CRAFD_DONORS.length && (
                                            <>
                                                <DropdownMenuLabel className="text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1.5">
                                                    <Filter className="h-3 w-3" />
                                                    {selectedDonors.length} selected
                                                </DropdownMenuLabel>
                                                <DropdownMenuSeparator />
                                            </>
                                        )}

                                        <div className="max-h-[200px] overflow-y-auto">
                                            {CRAFD_DONORS
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
                            </div>
                        </CardContent>
                    </Card>

                    {/* Co-Financing Matrix - Projects */}
                    <Card>
                        <CardContent className="p-6">
                            <h2 className="text-xl font-roboto font-bold text-slate-800 mb-4">
                                Co-Financed Projects Matrix
                            </h2>
                            <p className="text-sm text-slate-600 mb-4">
                                Number of projects co-financed by pairs of CRAFD donor partners
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

                    {/* Co-Financing Matrix - Organizations */}
                    <Card>
                        <CardContent className="p-6">
                            <h2 className="text-xl font-roboto font-bold text-slate-800 mb-4">
                                Co-Financed Organizations Matrix
                            </h2>
                            <p className="text-sm text-slate-600 mb-4">
                                Number of organizations co-financed by pairs of CRAFD donor partners
                            </p>
                            
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            <th className="p-2 text-left text-xs font-semibold text-slate-600 border-b-2 border-slate-200">
                                                Donor
                                            </th>
                                            {CRAFD_DONORS.map(donor => (
                                                <th 
                                                    key={donor} 
                                                    className="p-2 text-center text-xs font-semibold text-slate-600 border-b-2 border-slate-200"
                                                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                                                >
                                                    {donor}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {CRAFD_DONORS.map(donor1 => (
                                            <tr key={donor1}>
                                                <td className="p-2 text-xs font-semibold text-slate-600 border-r-2 border-slate-200">
                                                    {donor1}
                                                </td>
                                                {CRAFD_DONORS.map(donor2 => {
                                                    const count = coFinancingMatrix[donor1]?.[donor2]?.orgs.size || 0;
                                                    const isDiagonal = donor1 === donor2;
                                                    
                                                    return (
                                                        <td 
                                                            key={donor2}
                                                            className={`p-2 text-center text-sm font-medium border border-slate-200 ${
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

                    {/* Legend */}
                    <Card>
                        <CardContent className="p-6">
                            <h3 className="text-sm font-semibold text-slate-700 mb-3">Color Scale Legend</h3>
                            <div className="flex items-center gap-4">
                                <span className="text-xs text-slate-600">Low</span>
                                <div className="flex gap-1">
                                    <div className="w-8 h-8 bg-blue-100 border border-slate-200"></div>
                                    <div className="w-8 h-8 bg-blue-200 border border-slate-200"></div>
                                    <div className="w-8 h-8 bg-blue-300 border border-slate-200"></div>
                                    <div className="w-8 h-8 bg-blue-400 border border-slate-200"></div>
                                    <div className="w-8 h-8 bg-blue-500 border border-slate-200"></div>
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
        </div>
    );
}
