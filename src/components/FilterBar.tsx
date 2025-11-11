'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import labels from '@/config/labels.json';
import { getIconForInvestmentType } from '@/config/investmentTypeIcons';
import { ChevronDown, DatabaseBackup, DatabaseZap, Filter, Globe, RotateCcw, Search } from 'lucide-react';

interface FilterBarProps {
    // Search
    searchQuery: string;
    appliedSearchQuery: string;
    onSearchChange: (value: string) => void;
    onSearchSubmit: () => void;

    // Donors
    combinedDonors: string[];
    availableDonorCountries: string[];
    onDonorsChange: (values: string[]) => void;

    // Investment Types
    investmentTypes: string[];
    allKnownInvestmentTypes: string[];
    onTypesChange: (values: string[]) => void;

    // Investment Themes
    investmentThemes: string[];
    allKnownInvestmentThemes: string[];
    investmentThemesByType?: Record<string, string[]>;
    onThemesChange: (values: string[]) => void;

    // Project counts
    projectCountsByType?: Record<string, number>;
    projectCountsByTheme?: Record<string, number>;

    // Reset
    onResetFilters: () => void;

    // Optional styling
    className?: string;
    
    // Portal container for dropdowns (needed for fullscreen mode)
    portalContainer?: HTMLElement | null;
    
    // Fullscreen mode flag (adjusts layout for more filter space)
    isFullscreen?: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({
    searchQuery,
    appliedSearchQuery,
    onSearchChange,
    onSearchSubmit,
    combinedDonors,
    availableDonorCountries,
    onDonorsChange,
    investmentTypes,
    allKnownInvestmentTypes,
    onTypesChange,
    investmentThemes,
    allKnownInvestmentThemes,
    investmentThemesByType = {},
    onThemesChange,
    projectCountsByType = {},
    projectCountsByTheme = {},
    onResetFilters,
    className = '',
    portalContainer = null,
    isFullscreen = false,
}) => {
    const [donorsMenuOpen, setDonorsMenuOpen] = useState(false);
    const [typesMenuOpen, setTypesMenuOpen] = useState(false);
    const [themesMenuOpen, setThemesMenuOpen] = useState(false);
    const [donorSearchQuery, setDonorSearchQuery] = useState<string>('');
    const [themeSearchQuery, setThemeSearchQuery] = useState<string>('');

    return (
        <div className={`flex flex-col gap-3 ${className}`}>
            {/* First Row: Search and Donors (equal width) */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Modern Search Bar */}
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    <Input
                        id="search"
                        type="text"
                        placeholder={labels.filters.searchPlaceholder}
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onSearchSubmit();
                            }
                        }}
                        className="w-full h-10 pl-10 pr-4 bg-slate-50/50 border-slate-200 hover:bg-white hover:border-slate-300 focus:bg-white focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all font-normal"
                    />
                </div>

                {/* Donor Countries Multi-Select */}
                <div className="flex-1 min-w-0">
                <DropdownMenu onOpenChange={(open) => setDonorsMenuOpen(open)}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className={`w-full h-10 justify-between font-medium transition-all ${
                                combinedDonors.length > 0
                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-bg-lighter)] text-[var(--brand-primary)] hover:bg-[var(--brand-bg-light)]'
                                    : 'bg-slate-50/50 border-slate-200 hover:bg-white hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Globe className="h-4 w-4 shrink-0" />
                                <span className="truncate">
                                    {combinedDonors.length === 0
                                        ? labels.filters.donorPlaceholder
                                        : combinedDonors.length === 1
                                        ? combinedDonors[0]
                                        : `${combinedDonors.length} ${labels.filterDescription.donors}`}
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
                        container={portalContainer}
                    >
                        {/* Search Input */}
                        <div className="p-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                <Input
                                    placeholder={labels.filters.donorSearchPlaceholder}
                                    value={donorSearchQuery}
                                    onChange={(e) => setDonorSearchQuery(e.target.value)}
                                    className="h-7 pl-7 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                                    onKeyDown={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>

                        {combinedDonors.length > 0 && (
                            <>
                                <DropdownMenuLabel className="text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1.5">
                                    <Filter className="h-3 w-3" />
                                    {combinedDonors.length} {labels.filters.selected}
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
                                        checked={combinedDonors.includes(donor)}
                                        onCheckedChange={(checked) => {
                                            if (checked) {
                                                onDonorsChange(Array.from(new Set([...combinedDonors, donor])));
                                            } else {
                                                onDonorsChange(combinedDonors.filter((d) => d !== donor));
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
            </div>

            {/* Second Row: Investment Types and Themes (equal width) */}
            <div className="flex flex-col sm:flex-row gap-3">
                {/* Investment Types Multi-Select */}
                <div className="flex-1 min-w-0">
                <DropdownMenu onOpenChange={(open) => setTypesMenuOpen(open)}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className={`w-full h-10 justify-between font-medium transition-all ${
                                investmentTypes.length > 0
                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-bg-lighter)] text-[var(--brand-primary)] hover:bg-[var(--brand-bg-light)]'
                                    : 'bg-slate-50/50 border-slate-200 hover:bg-white hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <DatabaseBackup className="h-4 w-4 shrink-0" />
                                <span className="truncate">
                                    {investmentTypes.length === 0
                                        ? labels.filters.typePlaceholder
                                        : investmentTypes.length === 1
                                        ? (() => {
                                              const type = investmentTypes[0];
                                              const typeKey = Object.keys(labels.investmentTypes).find(
                                                  (key) =>
                                                      labels.investmentTypes[
                                                          key as keyof typeof labels.investmentTypes
                                                      ]
                                                          .toLowerCase()
                                                          .includes(type.toLowerCase()) ||
                                                      type.toLowerCase().includes(key.toLowerCase())
                                              );
                                              return typeKey
                                                  ? labels.investmentTypes[typeKey as keyof typeof labels.investmentTypes]
                                                  : type;
                                          })()
                                        : `${investmentTypes.length} ${labels.filterDescription.types}`}
                                </span>
                            </div>
                            <ChevronDown
                                className={`ml-2 h-4 w-4 opacity-50 shrink-0 transform transition-transform ${
                                    typesMenuOpen ? 'rotate-180' : ''
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
                        container={portalContainer}
                    >
                        {investmentTypes.length > 0 && (
                            <>
                                <DropdownMenuLabel className="text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1.5">
                                    <Filter className="h-3 w-3" />
                                    {investmentTypes.length} {labels.filters.selected}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        {allKnownInvestmentTypes.map((type) => {
                            const typeKey = Object.keys(labels.investmentTypes).find(
                                (key) =>
                                    labels.investmentTypes[key as keyof typeof labels.investmentTypes]
                                        .toLowerCase()
                                        .includes(type.toLowerCase()) || type.toLowerCase().includes(key.toLowerCase())
                            );
                            const displayName = typeKey
                                ? labels.investmentTypes[typeKey as keyof typeof labels.investmentTypes]
                                : type;

                            const IconComponent = getIconForInvestmentType(displayName);

                            const isChecked = investmentTypes.some(
                                (selected) => selected.toLowerCase().trim() === type.toLowerCase().trim()
                            );

                            const projectCount = projectCountsByType[type.toLowerCase().trim()] || 0;

                            return (
                                <DropdownMenuCheckboxItem
                                    key={type}
                                    checked={isChecked}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            const alreadyExists = investmentTypes.some(
                                                (t) => t.toLowerCase().trim() === type.toLowerCase().trim()
                                            );
                                            if (!alreadyExists) {
                                                onTypesChange([...investmentTypes, type]);
                                            }
                                        } else {
                                            onTypesChange(
                                                investmentTypes.filter(
                                                    (t) => t.toLowerCase().trim() !== type.toLowerCase().trim()
                                                )
                                            );
                                        }
                                    }}
                                    onSelect={(e) => e.preventDefault()}
                                    className="cursor-pointer"
                                >
                                    <div className="flex items-center gap-2 flex-1">
                                        <IconComponent className="w-4 h-4" />
                                        <span className="flex-1">{displayName}</span>
                                        <span className="text-xs text-slate-500 ml-auto">({projectCount})</span>
                                    </div>
                                </DropdownMenuCheckboxItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>
                </div>

                {/* Investment Themes Multi-Select */}
                <div className="flex-1 min-w-0">
                <DropdownMenu onOpenChange={(open) => setThemesMenuOpen(open)}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className={`w-full h-10 justify-between font-medium transition-all ${
                                investmentThemes.length > 0
                                    ? 'border-[var(--brand-primary)] bg-[var(--brand-bg-lighter)] text-[var(--brand-primary)] hover:bg-[var(--brand-bg-light)]'
                                    : 'bg-slate-50/50 border-slate-200 hover:bg-white hover:border-slate-300'
                            }`}
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <DatabaseZap className="h-4 w-4 shrink-0" />
                                <span className="truncate">
                                    {investmentThemes.length === 0
                                        ? labels.filters.themePlaceholder
                                        : investmentThemes.length === 1
                                        ? investmentThemes[0]
                                        : `${investmentThemes.length} themes`}
                                </span>
                            </div>
                            <ChevronDown
                                className={`ml-2 h-4 w-4 opacity-50 shrink-0 transform transition-transform ${
                                    themesMenuOpen ? 'rotate-180' : ''
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
                        container={portalContainer}
                    >
                        {/* Search Input */}
                        <div className="p-2">
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                                <Input
                                    placeholder="Search themes..."
                                    value={themeSearchQuery}
                                    onChange={(e) => setThemeSearchQuery(e.target.value)}
                                    className="h-7 pl-7 text-xs bg-slate-50 border-slate-200 focus:bg-white"
                                    onKeyDown={(e) => e.stopPropagation()}
                                />
                            </div>
                        </div>

                        {investmentThemes.length > 0 && (
                            <>
                                <DropdownMenuLabel className="text-xs font-semibold text-[var(--brand-primary)] flex items-center gap-1.5">
                                    <Filter className="h-3 w-3" />
                                    {investmentThemes.length} {labels.filters.selected}
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                            </>
                        )}

                        <div className="max-h-[200px] overflow-y-auto">
                        {Object.keys(investmentThemesByType).length > 0 ? (
                            // Build a map of all themes with counts and their investment type categories
                            (() => {
                                const themesByCategory: Record<string, string[]> = {};
                                
                                // For each theme that has a count, find which category it belongs to
                                Object.keys(projectCountsByTheme).forEach(themeKey => {
                                    const count = projectCountsByTheme[themeKey];
                                    if (count > 0) {
                                        // Find the original case-sensitive theme name
                                        const originalTheme = allKnownInvestmentThemes.find(
                                            t => t.toLowerCase().trim() === themeKey.toLowerCase().trim()
                                        );
                                        if (originalTheme) {
                                            // Find which investment type category this theme belongs to
                                            for (const [investmentType, themes] of Object.entries(investmentThemesByType)) {
                                                if (themes.some(t => t.toLowerCase().trim() === themeKey)) {
                                                    if (!themesByCategory[investmentType]) {
                                                        themesByCategory[investmentType] = [];
                                                    }
                                                    themesByCategory[investmentType].push(originalTheme);
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                });
                                
                                // Render grouped themes
                                return Object.entries(themesByCategory)
                                    .sort(([typeA], [typeB]) => typeA.localeCompare(typeB))
                                    .map(([investmentType, themes]) => {
                                        // Filter themes based on search query
                                        const filteredThemes = themes.filter((theme) =>
                                            theme.toLowerCase().includes(themeSearchQuery.toLowerCase())
                                        );

                                        if (filteredThemes.length === 0) return null;

                                        const IconComponent = getIconForInvestmentType(investmentType);
                                    
                                    return (
                                        <div key={investmentType}>
                                            {/* Category Header */}
                                                <div className="px-2 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 border-b border-slate-200 sticky top-0 z-10 flex items-center gap-1.5">
                                                <IconComponent className="h-3 w-3" />
                                                {investmentType}
                                            </div>
                                            {/* Themes under this category */}
                                            {filteredThemes.map((theme) => {
                                                const isChecked = investmentThemes.some(
                                                    (selected) => selected.toLowerCase().trim() === theme.toLowerCase().trim()
                                                );

                                                const projectCount = projectCountsByTheme[theme.toLowerCase().trim()] || 0;

                                                return (
                                                    <DropdownMenuCheckboxItem
                                                        key={theme}
                                                        checked={isChecked}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                const alreadyExists = investmentThemes.some(
                                                                    (t) => t.toLowerCase().trim() === theme.toLowerCase().trim()
                                                                );
                                                                if (!alreadyExists) {
                                                                    onThemesChange([...investmentThemes, theme]);
                                                                }
                                                            } else {
                                                                onThemesChange(
                                                                    investmentThemes.filter(
                                                                        (t) => t.toLowerCase().trim() !== theme.toLowerCase().trim()
                                                                    )
                                                                );
                                                            }
                                                        }}
                                                        onSelect={(e) => e.preventDefault()}
                                                        className="cursor-pointer pl-6 py-1"
                                                    >
                                                        <div className="flex items-center gap-2 flex-1 w-full">
                                                            <span className="flex-1">{theme}</span>
                                                            <span className="text-xs text-slate-500 ml-auto">({projectCount})</span>
                                                        </div>
                                                    </DropdownMenuCheckboxItem>
                                                );
                                            })}
                                        </div>
                                    );
                                    });
                            })()
                        ) : (
                            // Fallback to flat list if grouped data not available
                            allKnownInvestmentThemes
                                .filter((theme) => theme.toLowerCase().includes(themeSearchQuery.toLowerCase()))
                                .map((theme) => {
                                    const isChecked = investmentThemes.some(
                                        (selected) => selected.toLowerCase().trim() === theme.toLowerCase().trim()
                                    );

                                    const projectCount = projectCountsByTheme[theme.toLowerCase().trim()] || 0;

                                    return (
                                        <DropdownMenuCheckboxItem
                                            key={theme}
                                            checked={isChecked}
                                            onCheckedChange={(checked) => {
                                                if (checked) {
                                                    const alreadyExists = investmentThemes.some(
                                                        (t) => t.toLowerCase().trim() === theme.toLowerCase().trim()
                                                    );
                                                    if (!alreadyExists) {
                                                        onThemesChange([...investmentThemes, theme]);
                                                    }
                                                } else {
                                                    onThemesChange(
                                                        investmentThemes.filter(
                                                            (t) => t.toLowerCase().trim() !== theme.toLowerCase().trim()
                                                        )
                                                    );
                                                }
                                            }}
                                            onSelect={(e) => e.preventDefault()}
                                            className="cursor-pointer py-1"
                                        >
                                            <div className="flex items-center gap-2 flex-1 w-full">
                                                <span className="flex-1">{theme}</span>
                                                <span className="text-xs text-slate-500 ml-auto">({projectCount})</span>
                                            </div>
                                        </DropdownMenuCheckboxItem>
                                    );
                                })
                        )}
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
                </div>
            </div>
        </div>
    );
};

export default FilterBar;
