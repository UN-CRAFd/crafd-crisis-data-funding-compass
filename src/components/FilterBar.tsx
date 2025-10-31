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
import { ChevronDown, DatabaseBackup, Filter, Globe, RotateCcw, Search } from 'lucide-react';

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
    onResetFilters,
    className = '',
    portalContainer = null,
    isFullscreen = false,
}) => {
    const [donorsMenuOpen, setDonorsMenuOpen] = useState(false);
    const [typesMenuOpen, setTypesMenuOpen] = useState(false);
    const [donorSearchQuery, setDonorSearchQuery] = useState<string>('');

    return (
        <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-3 ${className}`}>
            {/* Modern Search Bar */}
                <div className={`relative order-1 sm:order-1 ${isFullscreen ? 'flex-none w-200' : 'flex-1'}`}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                    className="h-10 pl-10 pr-4 bg-slate-50/50 border-slate-200 focus:bg-white focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/20 transition-all"
                />
            </div>

            {/* Filter buttons container */}
            <div className={`flex flex-col sm:flex-row gap-4 sm:gap-3 order-2 sm:order-2 ${isFullscreen ? 'flex-1' : ''}`}>
                {/* Donor Countries Multi-Select */}
                <DropdownMenu onOpenChange={(open) => setDonorsMenuOpen(open)}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className={`h-10 justify-between font-medium transition-all ${
                                isFullscreen ? 'w-full flex-1' : 'w-full sm:w-52'
                            } ${
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

                {/* Investment Types Multi-Select */}
                <DropdownMenu onOpenChange={(open) => setTypesMenuOpen(open)}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="outline"
                            className={`h-10 justify-between font-medium transition-all ${
                                isFullscreen ? 'w-full flex-1' : 'w-full sm:w-52'
                            } ${
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
                        className="w-64 max-h-[300px] overflow-y-auto bg-white border border-slate-200 shadow-lg"
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
                                    <div className="flex items-center gap-2">
                                        <IconComponent className="w-4 h-4" />
                                        <span>{displayName}</span>
                                    </div>
                                </DropdownMenuCheckboxItem>
                            );
                        })}
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Reset Filters Button */}
                <Button
                    variant="outline"
                    onClick={onResetFilters}
                    disabled={!(combinedDonors.length > 0 || investmentTypes.length > 0 || appliedSearchQuery)}
                    className={`h-10 w-full sm:w-auto px-4 font-medium transition-all ${
                        combinedDonors.length > 0 || investmentTypes.length > 0 || appliedSearchQuery
                            ? 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:border-slate-300'
                            : 'bg-slate-50/50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                    title={labels.ui.resetFilters}
                >
                    <RotateCcw className="w-4 h-4" />
                    <span className="ml-2 sm:hidden">Reset</span>
                </Button>
            </div>
        </div>
    );
};

export default FilterBar;
